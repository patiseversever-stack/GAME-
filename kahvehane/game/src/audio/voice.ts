/**
 * Kahvehane Pişti — seslendirme oynatıcı (ElevenLabs ile üretilmiş replikler).
 *
 * - Oyunun AudioContext'ini paylaşır (SFX motorunun ilk dokunuşta açtığı bağlam); bağlam her `play`'de tembelce alınır.
 * - Manifest yoksa / yüklenemezse "yalnızca yazı" kipinde çalışır: has() false, play() false, hiçbir şey patlamaz.
 * - Düşük cihaz dostu: önden toplu yükleme yok. Bir replik ilk çalındığında indirilir + çözülür; çözülmüş tamponlar
 *   küçük bir LRU'da (12) tutulur, sıkıştırılmış baytlar ayrı bir LRU'da (32, ~12 KB/replik). Kapatınca serbest.
 * - Asla üst üste konuşmaz: yüksek öncelik çalanı yumuşakça keser; eşit öncelik, çalan bitmek üzereyse sıraya
 *   girer (tek yer), değilse düşer — en üst öncelikte (3: pişti, el sonu) ise yenisi keser; düşük öncelik düşer.
 *   Geç kalan (bayatlayan) tepki çalınmaz.
 * - Her başarılı `play` için `onEnd` tam bir kez çağrılır (bitti, kesildi, düştü ya da çözülemedi); nedeni parametrede.
 * - Önbellekler dosya adresiyle tutulur: paylaşılan sesler (aynı dosyayı gösteren takma adlar) bir kez iner / çözülür.
 * - `preload`: oyuncunun kendi hızlı sohbet sesleri gibi küçük bir küme sabitlenir (LRU'dan düşmez), gönderince anında çalar.
 *
 * - İki manifest düzeni: dosya başına (`{id: {url, dur, h, p}}`; dist/ ve geliştirme) ya da PAKETLİ (`{v: 2, packs, clips}`;
 *   tek dosya / yayın önizlemesi, scripts/voice-pack.mjs). Paketli düzende paket bir kez bütün olarak iner, klip baytları
 *   bayt aralığıyla kesilip çözülür; paket baytları toplam ~8 MB'lık LRU'da tutulur, masada olmayan karakterlerin paketleri
 *   önce atılır (prepare). Her klip eksiksiz bir mp3 olduğundan aralığı kesmek geçerli bir dosya verir.
 *
 * Konuşma sırası, balon eşlemesi, atışma (banter) dizileri ve duraklatma bu sınıfın ÜSTÜNDE: src/audio/speech.ts
 * (SpeechDirector). Oyun kodu doğrudan `play` çağırmaz; tek kanal yöneticisi üzerinden konuşur.
 */

/** onEnd nedeni: doğal bitiş · kesildi (stop / yüksek öncelik) · hiç çalmadı (bayat, çözülemedi, bağlam yok, yerine başkası geldi). */
export type VoiceEnd = 'ended' | 'cut' | 'dropped';

export interface VoiceEntry {
  /** Manifest dosyasına göreli (ör. "riza/riza_botPisti_1.mp3") ya da mutlak URL. */
  url: string;
  /** Süre (sn). */
  dur: number;
  /** Üretildiği tts metninin özeti (dialogue.ts → ttsHash). */
  h?: string;
  /** Varsayılan öncelik (dialogue.ts → momentPriority); play() önceliği verilmezse kullanılır. */
  p?: number;
  /** Paketli düzen: paket adı + klibin paket içindeki bayt aralığı (url = paketin adresi). */
  pack?: string;
  o?: number;
  n?: number;
  /** @internal önbellek anahtarı: dosya adresi ya da "paket#ofset" */
  key?: string;
}

/** Paketli düzende bir paket: adres, bayt boyu, karakter, grup (pisti · blof · bot · say · meta). */
export interface VoicePack {
  url: string;
  n: number;
  char: string;
  group: string;
}

export interface VoiceOptions {
  /** Bellekte tutulacak paket baytları üst sınırı (paketli düzen). Varsayılan 8 MB. */
  packCapBytes?: number;
}

export interface VoicePlayOpts {
  /** Ses bitince / kesilince / düşünce (bir kez). */
  onEnd?: (why: VoiceEnd) => void;
  /** Ses gerçekten başlayınca (çözme + sıra beklemesinden sonra): süre (sn). */
  onStart?: (durS: number) => void;
  /** Konuşma başlarken duck(miktar 0..1), bitince duck(0): ortam/müzik kısmak için. */
  duck?: (amount: number) => void;
  /** 1 boş laf, 2 olay tepkisi, 3 pişti / el sonu. Verilmezse manifestteki `p`, o da yoksa 2. */
  priority?: number;
  /** İstekten başlangıca izin verilen en uzun gecikme (ms; çözme + sıra). Varsayılan 1500. */
  maxDelayMs?: number;
}

const MAX_DECODED = 12;
const MAX_BYTES = 32;
/** Sabitlenmiş (preload) çözülmüş tampon üst sınırı: düşük cihazda bellek ≈ 14 × ~1,6 sn × 192 KB/sn. */
const MAX_PINNED_DECODED = 14;
/** Paketli düzen: bellekteki paket baytları üst sınırı. */
export const PACK_CAP_BYTES = 8 * 1048576;
const QUEUE_MAX_S = 1.0; // eşit öncelik: çalanın kalan süresi bundan azsa sıraya gir
const MAX_DELAY_MS = 1500; // sıra bekleme dahil; daha geç gelen tepki bayattır
const FADE_S = 0.05;
const DUCK = 0.5;
const TOP_PRIO = 3; // bu öncelikte eşit öncelikli yeni replik çalanı keser (pişti tepkisi kaybolmasın)

interface Job {
  id: string;
  prio: number;
  opts: VoicePlayOpts;
  at: number;
  buf: AudioBuffer | null;
  ducked: boolean;
  done: boolean;
}

interface Playing {
  job: Job;
  ctx: AudioContext;
  src: AudioBufferSourceNode;
  gain: GainNode;
  endsAt: number;
  timer: ReturnType<typeof setTimeout> | undefined;
}

const nowMs = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());

function lruGet<V>(m: Map<string, V>, k: string): V | undefined {
  const v = m.get(k);
  if (v !== undefined) {
    m.delete(k);
    m.set(k, v);
  }
  return v;
}

function lruSet<V>(m: Map<string, V>, k: string, v: V, max: number): void {
  m.delete(k);
  m.set(k, v);
  while (m.size > max) m.delete(m.keys().next().value as string);
}

/** Eski WebView'lar için geri çağırmalı + söz veren decodeAudioData. */
function decodeAudio(ctx: BaseAudioContext, data: ArrayBuffer): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    try {
      const p = ctx.decodeAudioData(data, resolve, reject) as Promise<AudioBuffer> | undefined;
      if (p && typeof p.then === 'function') p.then(resolve, reject);
    } catch (e) {
      reject(e);
    }
  });
}

/** Önbellek anahtarı: dosya adresi ya da paket#ofset. */
const keyOf = (e: VoiceEntry): string => e.key ?? (e.pack ? `${e.url}#${e.o}` : e.url);

function resolveUrl(url: string, manifestUrl: string): string {
  if (/^([a-z][a-z0-9+.-]*:|\/)/i.test(url)) return url;
  const base = manifestUrl.split(/[?#]/)[0];
  const i = base.lastIndexOf('/');
  return (i >= 0 ? base.slice(0, i + 1) : '') + url;
}

export class VoicePlayer {
  private getCtx: () => AudioContext | null;
  private enabled = true;
  private volume = 1;
  private entries = new Map<string, VoiceEntry>();
  private bytes = new Map<string, ArrayBuffer>();
  private bytesLoading = new Map<string, Promise<ArrayBuffer | null>>();
  private decoded = new Map<string, AudioBuffer>();
  private decoding = new Map<string, Promise<AudioBuffer | null>>();
  private bufCtx: BaseAudioContext | null = null;
  private bus: GainNode | null = null;
  private cur: Playing | null = null;
  private next: Job | null = null;
  /** Sabitlenmiş baytlar / tamponlar (adres → veri): LRU'dan bağımsız, unpin ile bırakılır. */
  private pinned = new Set<string>();
  private pinnedBytes = new Map<string, ArrayBuffer>();
  private pinnedDecoded = new Map<string, AudioBuffer>();
  private pinTok = 0;
  /** Paketli düzen: paket tablosu, bellekteki paketler (LRU, toplam bayt sınırlı), inenler, istenenler (masadakiler). */
  private packs = new Map<string, VoicePack>();
  private packBytes = new Map<string, ArrayBuffer>();
  private packTotal = 0;
  private packLoading = new Map<string, Promise<ArrayBuffer | null>>();
  private wanted = new Set<string>();
  private prepTok = 0;
  private readonly packCap: number;

  /** @param getCtx oyunun AudioContext'i (ör. `() => sfx.context`); henüz yoksa null. */
  constructor(getCtx: () => AudioContext | null, o: VoiceOptions = {}) {
    this.getCtx = getCtx;
    this.packCap = o.packCapBytes ?? PACK_CAP_BYTES;
  }

  setEnabled(on: boolean): void {
    this.enabled = !!on;
    if (!this.enabled) {
      this.stop();
      this.decoded.clear(); // belleği bırak
      this.pinnedDecoded.clear();
      this.dropPacks(() => true);
    }
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  setVolume(v: number): void {
    this.volume = Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 1;
    if (this.bus) this.bus.gain.value = this.volume;
  }

  /**
   * Manifesti yükler: {id: {url, dur, h?, p?}} ya da paketli {v: 2, packs, clips}. Boş adres, 404 ya da ağ hatası →
   * yalnızca yazı kipi (hata fırlatmaz).
   * @param resolve İsteğe bağlı: manifestteki göreli yolu gerçek URL'ye çevirir (ör. Vite import.meta.glob ile
   *   paketlenmiş dosyalar). undefined dönerse o replik sessiz kalır. Verilmezse yol manifest adresine göre çözülür.
   */
  async load(manifestUrl: string, resolve?: (rel: string) => string | undefined): Promise<void> {
    this.entries.clear();
    if (!manifestUrl || typeof fetch !== 'function') return;
    try {
      const r = await fetch(manifestUrl);
      if (!r.ok) return;
      this.setManifest((await r.json()) as unknown, manifestUrl, resolve);
    } catch {
      /* yalnızca yazı kipi */
    }
  }

  /** Manifesti doğrudan ver (paketlenmiş / satır içi manifest için). */
  setManifest(manifest: unknown, manifestUrl = '', resolve?: (rel: string) => string | undefined): void {
    this.entries.clear();
    this.packs.clear();
    this.dropPacks(() => true);
    if (!manifest || typeof manifest !== 'object') return;
    const m = manifest as {v?: unknown; packs?: unknown; clips?: unknown};
    const num = (x: unknown): number | undefined => (typeof x === 'number' && Number.isFinite(x) ? x : undefined);
    const str = (x: unknown): string | undefined => (typeof x === 'string' ? x : undefined);
    if (m.v === 2 && m.packs && typeof m.packs === 'object' && m.clips && typeof m.clips === 'object') {
      // paketli düzen
      for (const [name, pk] of Object.entries(m.packs as Record<string, unknown>)) {
        if (!pk || typeof pk !== 'object') continue;
        const q = pk as Record<string, unknown>;
        const url = str(q.url);
        const full = url ? (resolve ? resolve(url) : resolveUrl(url, manifestUrl)) : undefined;
        if (!full) continue;
        this.packs.set(name, {url: full, n: num(q.n) ?? 0, char: str(q.char) ?? '', group: str(q.group) ?? ''});
      }
      for (const [id, c] of Object.entries(m.clips as Record<string, unknown>)) {
        if (!c || typeof c !== 'object') continue;
        const q = c as Record<string, unknown>;
        const pack = str(q.p);
        const pk = pack ? this.packs.get(pack) : undefined;
        const o = num(q.o), n = num(q.n);
        if (!pk || o === undefined || !n || o < 0 || n <= 0 || (pk.n && o + n > pk.n)) continue;
        const dur = num(q.dur);
        this.entries.set(id, {url: pk.url, dur: dur && dur > 0 ? dur : 0, h: str(q.h), p: num(q.prio), pack, o, n, key: `${pk.url}#${o}`});
      }
      return;
    }
    for (const [id, e] of Object.entries(manifest as Record<string, unknown>)) {
      if (!e || typeof e !== 'object') continue;
      const {url, dur, h, p} = e as Partial<VoiceEntry>;
      if (typeof url !== 'string' || !url) continue;
      const full = resolve ? resolve(url) : resolveUrl(url, manifestUrl);
      if (!full) continue;
      this.entries.set(id, {
        url: full,
        dur: typeof dur === 'number' && dur > 0 ? dur : 0,
        h: typeof h === 'string' ? h : undefined,
        p: typeof p === 'number' ? p : undefined,
        key: full,
      });
    }
  }

  /** Paketli düzen mi? */
  get packed(): boolean {
    return this.packs.size > 0;
  }

  /**
   * Paketli düzende önden indirme (boşta çağırın): istenen (karakter, grup) paketleri SIRAYLA, toplam bayt sınırı
   * dolana dek indirilir; listede olmayan (masada olmayan karakterlerin) paketleri hemen bellekten atılır. Sınıra
   * sığmayanlar gerektiğinde tembel iner. Dosya başına düzende hiçbir şey yapmaz.
   * @param want öncelik sırasıyla [karakter, grup] çiftleri (ör. [['cem','pisti'], ['riza','say'], ['cem','bot']])
   */
  async prepare(want: readonly (readonly [string, string])[]): Promise<void> {
    if (!this.packs.size) return;
    const tok = ++this.prepTok;
    const names: string[] = [];
    for (const [char, group] of want)
      for (const [name, pk] of this.packs) if (pk.char === char && pk.group === group && !names.includes(name)) names.push(name);
    this.wanted = new Set(names);
    this.dropPacks(name => !this.wanted.has(name));
    if (!this.enabled) return;
    for (const name of names) {
      if (tok !== this.prepTok || !this.enabled) return;
      if (this.packBytes.has(name)) continue;
      const pk = this.packs.get(name)!;
      if (this.packTotal + pk.n > this.packCap) continue; // sınıra sığmıyor: gerekince tembel iner
      await this.loadPack(name);
    }
  }

  /** Bu replik için ses var mı? `hash` verilirse (dialogue.ts → ttsHash(line.tts)) metni değişmiş eski ses sayılmaz. */
  has(id: string, hash?: string): boolean {
    const e = this.entries.get(id);
    if (!e) return false;
    return !(hash && e.h && e.h !== hash);
  }

  /** Manifestteki süre (sn); balonun ekranda kalma süresi için. Ses yoksa null. */
  duration(id: string): number | null {
    const e = this.entries.get(id);
    return e && e.dur > 0 ? e.dur : null;
  }

  /** Şu an konuşuyor mu (ya da başlamak üzere mi)? */
  get busy(): boolean {
    return !!(this.cur || this.next);
  }

  /** Manifestteki replik sayısı (0: ses yok → yalnız yazı kipi). */
  get size(): number {
    return this.entries.size;
  }

  /**
   * Repliği çalar. Ses yoksa, kapalıysa, bağlam yoksa/çalışmıyorsa ya da öncelik yetmiyorsa false (balon yine gösterilir).
   * true: çalındı ya da çözülüp birazdan çalınacak (`onEnd` her durumda bir kez gelir).
   */
  play(id: string, opts: VoicePlayOpts = {}): boolean {
    if (!this.enabled) return false;
    const e = this.entries.get(id);
    if (!e) return false;
    const c = this.liveCtx();
    if (!c) return false;
    const prio = opts.priority ?? e.p ?? 2;
    const cur = this.cur;
    if (cur) {
      if (prio < cur.job.prio) return false;
      if (prio === cur.job.prio && prio < TOP_PRIO && cur.endsAt - c.currentTime > QUEUE_MAX_S) return false;
    }
    if (this.next) {
      if (prio < this.next.prio) return false;
      const old = this.next;
      this.next = null;
      this.finish(old, 'dropped');
    }
    const job: Job = {id, prio, opts, at: nowMs(), buf: null, ducked: false, done: false};
    this.next = job;
    const hit = this.bufCtx === c ? this.cachedBuf(keyOf(e)) : undefined;
    if (hit) {
      job.buf = hit;
      this.pump();
    } else {
      void this.decode(id, c).then(buf => {
        if (job.done || this.next !== job) return;
        if (!buf) {
          this.next = null;
          this.finish(job, 'dropped');
          return;
        }
        job.buf = buf;
        this.pump();
      });
    }
    return true;
  }

  /** Olası replikleri önceden indir (yalnızca sıkıştırılmış baytlar; çözme yok, hafif). */
  async prefetch(ids: readonly string[]): Promise<void> {
    if (!this.enabled) return;
    for (const id of ids) {
      const e = this.entries.get(id);
      if (e) await this.fetchClip(e);
    }
  }

  /**
   * Küçük bir kümeyi sabitler (ör. oyuncunun kendi hızlı sohbet sesleri): baytlar LRU'dan düşmez, ilk `decode` tanesi
   * ayrıca çözülüp hazır tutulur (bağlam varsa). Önceki sabit küme bırakılır. Sırayla, tek tek iner (ağı boğmaz).
   */
  async preload(ids: readonly string[], decode = 0): Promise<void> {
    const tok = ++this.pinTok;
    this.unpinAll();
    if (!this.enabled) return;
    const list: VoiceEntry[] = [];
    for (const id of ids) {
      const e = this.entries.get(id);
      if (e && !list.some(x => x.key === e.key)) list.push(e);
    }
    for (const e of list) this.pinned.add(keyOf(e));
    let n = 0;
    for (const e of list) {
      if (tok !== this.pinTok || !this.enabled) return;
      const k = keyOf(e);
      const b = await this.fetchClip(e);
      if (tok !== this.pinTok || !b) continue;
      this.pinnedBytes.set(k, b);
      if (n >= Math.min(decode, MAX_PINNED_DECODED)) continue;
      const c = this.liveCtx();
      if (!c) continue;
      const buf = await this.decodeClip(e, c);
      if (tok !== this.pinTok || !buf) continue;
      this.pinnedDecoded.set(k, buf);
      n++;
    }
  }

  /** Sabit kümeyi bırakır. */
  unpin(): void {
    this.pinTok++;
    this.unpinAll();
  }

  private unpinAll(): void {
    this.pinned.clear();
    this.pinnedBytes.clear();
    this.pinnedDecoded.clear();
  }

  /** Çalanı ve sıradakini durdurur (çalan kısa bir sönümle kesilir). */
  stop(): void {
    const n = this.next;
    this.next = null;
    if (n) this.finish(n, 'dropped');
    this.stopCur();
  }

  /** Her şeyi bırakır (HMR / çıkış). */
  dispose(): void {
    this.stop();
    this.unpin();
    this.decoded.clear();
    this.bytes.clear();
    this.entries.clear();
    this.dropPacks(() => true);
    this.packs.clear();
    try {
      this.bus?.disconnect();
    } catch {
      /* yoksay */
    }
    this.bus = null;
  }

  /** @internal test/ölçüm */
  stats(): {entries: number; decoded: number; bytes: number; pinned: number; pinnedDecoded: number; packs: number; packsLoaded: string[]; packBytes: number; playing: string | null; queued: string | null} {
    return {
      entries: this.entries.size,
      decoded: this.decoded.size,
      bytes: this.bytes.size,
      pinned: this.pinnedBytes.size,
      pinnedDecoded: this.pinnedDecoded.size,
      packs: this.packs.size,
      packsLoaded: [...this.packBytes.keys()],
      packBytes: this.packTotal,
      playing: this.cur?.job.id ?? null,
      queued: this.next?.id ?? null,
    };
  }

  // ───────────── iç işler ─────────────

  private liveCtx(): AudioContext | null {
    let c: AudioContext | null = null;
    try {
      c = this.getCtx();
    } catch {
      return null;
    }
    if (!c || c.state !== 'running') return null;
    return c;
  }

  private busFor(c: AudioContext): GainNode {
    if (!this.bus || this.bus.context !== c) {
      try {
        this.bus?.disconnect();
      } catch {
        /* yoksay */
      }
      this.bus = c.createGain();
      this.bus.gain.value = this.volume;
      this.bus.connect(c.destination);
    }
    return this.bus;
  }

  /** Klibin sıkıştırılmış baytları (anahtar: dosya adresi ya da paket#ofset; takma adlar aynı kaydı paylaşır). */
  private fetchClip(e: VoiceEntry): Promise<ArrayBuffer | null> {
    const k = keyOf(e);
    const pin = this.pinnedBytes.get(k);
    if (pin) return Promise.resolve(pin);
    const hit = lruGet(this.bytes, k);
    if (hit) return Promise.resolve(hit);
    let p = this.bytesLoading.get(k);
    if (!p) {
      if (typeof fetch !== 'function') return Promise.resolve(null);
      const raw: Promise<ArrayBuffer | null> = e.pack
        ? this.loadPack(e.pack).then(buf => (buf && e.o !== undefined && e.n && e.o + e.n <= buf.byteLength ? buf.slice(e.o, e.o + e.n) : null))
        : fetch(e.url).then(r => (r.ok ? r.arrayBuffer() : null));
      p = raw
        .then(b => {
          const ok = b && b.byteLength ? b : null;
          if (ok) {
            if (this.pinned.has(k)) this.pinnedBytes.set(k, ok);
            else lruSet(this.bytes, k, ok, MAX_BYTES);
          }
          return ok;
        })
        .catch(() => null)
        .finally(() => this.bytesLoading.delete(k));
      this.bytesLoading.set(k, p);
    }
    return p;
  }

  /** Paketin tamamı (bir kez iner; bellekte LRU, toplam bayt sınırlı). */
  private loadPack(name: string): Promise<ArrayBuffer | null> {
    const hit = this.packBytes.get(name);
    if (hit) {
      this.packBytes.delete(name);
      this.packBytes.set(name, hit); // en yeni
      return Promise.resolve(hit);
    }
    let p = this.packLoading.get(name);
    if (p) return p;
    const pk = this.packs.get(name);
    if (!pk || typeof fetch !== 'function') return Promise.resolve(null);
    p = fetch(pk.url)
      .then(r => (r.ok ? r.arrayBuffer() : null))
      .then(b => {
        if (!b || !b.byteLength) return null;
        if (this.enabled && this.packs.get(name) === pk) this.storePack(name, b);
        return b;
      })
      .catch(() => null)
      .finally(() => this.packLoading.delete(name));
    this.packLoading.set(name, p);
    return p;
  }

  /** Paketi belleğe al; sınır aşılırsa önce istenmeyen (masada olmayan), sonra en eski paketler atılır (yenisi hariç). */
  private storePack(name: string, b: ArrayBuffer): void {
    const old = this.packBytes.get(name);
    if (old) this.packTotal -= old.byteLength;
    this.packBytes.delete(name);
    this.packBytes.set(name, b);
    this.packTotal += b.byteLength;
    for (const pass of [false, true]) {
      for (const k of [...this.packBytes.keys()]) {
        if (this.packTotal <= this.packCap) return;
        if (k === name || (!pass && this.wanted.has(k))) continue;
        this.packTotal -= this.packBytes.get(k)!.byteLength;
        this.packBytes.delete(k);
      }
    }
  }

  private dropPacks(which: (name: string) => boolean): void {
    for (const [k, b] of [...this.packBytes]) {
      if (!which(k)) continue;
      this.packTotal -= b.byteLength;
      this.packBytes.delete(k);
    }
  }

  private cachedBuf(key: string): AudioBuffer | undefined {
    return this.pinnedDecoded.get(key) ?? lruGet(this.decoded, key);
  }

  private decode(id: string, c: AudioContext): Promise<AudioBuffer | null> {
    const e = this.entries.get(id);
    return e ? this.decodeClip(e, c) : Promise.resolve(null);
  }

  private decodeClip(e: VoiceEntry, c: AudioContext): Promise<AudioBuffer | null> {
    if (this.bufCtx !== c) {
      this.decoded.clear();
      this.decoding.clear();
      this.pinnedDecoded.clear();
      this.bufCtx = c;
    }
    const k = keyOf(e);
    const hit = this.cachedBuf(k);
    if (hit) return Promise.resolve(hit);
    let p = this.decoding.get(k);
    if (!p) {
      p = this.fetchClip(e)
        .then(b => (b ? decodeAudio(c, b.slice(0)) : null)) // decodeAudioData baytları devralır: kopya ver
        .then(buf => {
          if (buf && this.bufCtx === c && this.enabled && !this.pinned.has(k)) lruSet(this.decoded, k, buf, MAX_DECODED);
          return buf;
        })
        .catch(() => null)
        .finally(() => this.decoding.delete(k));
      this.decoding.set(k, p);
    }
    return p;
  }

  /** Sıradaki iş hazırsa başlat (gerekirse çalanı kes). */
  private pump(): void {
    const job = this.next;
    if (!job || !job.buf) return;
    const c = this.liveCtx();
    if (!c || nowMs() - job.at > (job.opts.maxDelayMs ?? MAX_DELAY_MS)) {
      this.next = null;
      this.finish(job, 'dropped');
      return;
    }
    const cur = this.cur;
    if (cur) {
      const left = cur.endsAt - c.currentTime;
      const preempt = job.prio > cur.job.prio || (job.prio === cur.job.prio && job.prio >= TOP_PRIO && left > QUEUE_MAX_S);
      if (preempt) this.stopCur();
      else if (job.prio < cur.job.prio) {
        this.next = null;
        this.finish(job, 'dropped');
        return;
      } else return; // eşit öncelik, çalan bitmek üzere: bitince ended() → pump()
    }
    this.next = null;
    this.start(job, c);
  }

  private start(job: Job, c: AudioContext): void {
    const buf = job.buf as AudioBuffer;
    let p: Playing;
    try {
      const src = c.createBufferSource();
      src.buffer = buf;
      const gain = c.createGain();
      gain.gain.value = 1;
      src.connect(gain);
      gain.connect(this.busFor(c));
      p = {job, ctx: c, src, gain, endsAt: c.currentTime + buf.duration, timer: undefined};
      src.onended = () => this.ended(p);
      // onended bazı WebView'larda (bağlam askıdayken) hiç gelmeyebilir: güvenlik zamanlayıcısı
      p.timer = setTimeout(() => this.ended(p), (buf.duration + 0.4) * 1000);
      this.cur = p;
      if (job.opts.duck) {
        job.ducked = true;
        try {
          job.opts.duck(DUCK);
        } catch {
          /* yoksay */
        }
      }
      src.start();
      try {
        job.opts.onStart?.(buf.duration);
      } catch {
        /* yoksay */
      }
    } catch {
      if (this.cur && this.cur.job === job) this.ended(this.cur);
      else this.finish(job, 'dropped');
    }
  }

  private release(p: Playing): void {
    clearTimeout(p.timer);
    p.src.onended = null;
    try {
      p.src.disconnect();
      p.gain.disconnect();
    } catch {
      /* yoksay */
    }
  }

  private ended(p: Playing): void {
    if (this.cur === p) this.cur = null;
    this.release(p);
    this.finish(p.job, 'ended');
    this.pump();
  }

  private stopCur(): void {
    const p = this.cur;
    if (!p) return;
    this.cur = null;
    clearTimeout(p.timer);
    try {
      const t = p.ctx.currentTime;
      const g = p.gain.gain;
      g.cancelScheduledValues(t);
      g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(0, t + FADE_S);
      p.src.onended = () => this.release(p);
      p.src.stop(t + FADE_S + 0.01);
    } catch {
      this.release(p);
    }
    this.finish(p.job, 'cut');
  }

  private finish(job: Job, why: VoiceEnd): void {
    if (job.done) return;
    job.done = true;
    job.buf = null;
    if (job.ducked) {
      try {
        job.opts.duck?.(0);
      } catch {
        /* yoksay */
      }
    }
    try {
      job.opts.onEnd?.(why);
    } catch {
      /* yoksay */
    }
  }
}
