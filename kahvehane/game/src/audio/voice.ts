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

  /** @param getCtx oyunun AudioContext'i (ör. `() => sfx.context`); henüz yoksa null. */
  constructor(getCtx: () => AudioContext | null) {
    this.getCtx = getCtx;
  }

  setEnabled(on: boolean): void {
    this.enabled = !!on;
    if (!this.enabled) {
      this.stop();
      this.decoded.clear(); // belleği bırak
      this.pinnedDecoded.clear();
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
   * Manifesti yükler: {id: {url, dur, h?}}. Boş adres, 404 ya da ağ hatası → yalnızca yazı kipi (hata fırlatmaz).
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
    if (!manifest || typeof manifest !== 'object') return;
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
      });
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
    const hit = this.bufCtx === c ? this.cachedBuf(e.url) : undefined;
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
    for (const id of ids) if (this.entries.has(id)) await this.fetchBytes(id);
  }

  /**
   * Küçük bir kümeyi sabitler (ör. oyuncunun kendi hızlı sohbet sesleri): baytlar LRU'dan düşmez, ilk `decode` tanesi
   * ayrıca çözülüp hazır tutulur (bağlam varsa). Önceki sabit küme bırakılır. Sırayla, tek tek iner (ağı boğmaz).
   */
  async preload(ids: readonly string[], decode = 0): Promise<void> {
    const tok = ++this.pinTok;
    this.unpinAll();
    if (!this.enabled) return;
    const urls: string[] = [];
    for (const id of ids) {
      const e = this.entries.get(id);
      if (e && !urls.includes(e.url)) urls.push(e.url);
    }
    for (const u of urls) this.pinned.add(u);
    let n = 0;
    for (const u of urls) {
      if (tok !== this.pinTok || !this.enabled) return;
      const b = await this.fetchUrl(u);
      if (tok !== this.pinTok || !b) continue;
      this.pinnedBytes.set(u, b);
      if (n >= Math.min(decode, MAX_PINNED_DECODED)) continue;
      const c = this.liveCtx();
      if (!c) continue;
      const buf = await this.decodeUrl(u, c);
      if (tok !== this.pinTok || !buf) continue;
      this.pinnedDecoded.set(u, buf);
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
    try {
      this.bus?.disconnect();
    } catch {
      /* yoksay */
    }
    this.bus = null;
  }

  /** @internal test/ölçüm */
  stats(): {entries: number; decoded: number; bytes: number; pinned: number; pinnedDecoded: number; playing: string | null; queued: string | null} {
    return {
      entries: this.entries.size,
      decoded: this.decoded.size,
      bytes: this.bytes.size,
      pinned: this.pinnedBytes.size,
      pinnedDecoded: this.pinnedDecoded.size,
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

  private fetchBytes(id: string): Promise<ArrayBuffer | null> {
    const e = this.entries.get(id);
    return e ? this.fetchUrl(e.url) : Promise.resolve(null);
  }

  /** Sıkıştırılmış baytlar (adres anahtarlı: takma adlar aynı dosyayı paylaşır). */
  private fetchUrl(url: string): Promise<ArrayBuffer | null> {
    const pin = this.pinnedBytes.get(url);
    if (pin) return Promise.resolve(pin);
    const hit = lruGet(this.bytes, url);
    if (hit) return Promise.resolve(hit);
    let p = this.bytesLoading.get(url);
    if (!p) {
      if (typeof fetch !== 'function') return Promise.resolve(null);
      p = fetch(url)
        .then(r => (r.ok ? r.arrayBuffer() : null))
        .then(b => {
          const ok = b && b.byteLength ? b : null;
          if (ok) {
            if (this.pinned.has(url)) this.pinnedBytes.set(url, ok);
            else lruSet(this.bytes, url, ok, MAX_BYTES);
          }
          return ok;
        })
        .catch(() => null)
        .finally(() => this.bytesLoading.delete(url));
      this.bytesLoading.set(url, p);
    }
    return p;
  }

  private cachedBuf(url: string): AudioBuffer | undefined {
    return this.pinnedDecoded.get(url) ?? lruGet(this.decoded, url);
  }

  private decode(id: string, c: AudioContext): Promise<AudioBuffer | null> {
    const e = this.entries.get(id);
    return e ? this.decodeUrl(e.url, c) : Promise.resolve(null);
  }

  private decodeUrl(url: string, c: AudioContext): Promise<AudioBuffer | null> {
    if (this.bufCtx !== c) {
      this.decoded.clear();
      this.decoding.clear();
      this.pinnedDecoded.clear();
      this.bufCtx = c;
    }
    const hit = this.cachedBuf(url);
    if (hit) return Promise.resolve(hit);
    let p = this.decoding.get(url);
    if (!p) {
      p = this.fetchUrl(url)
        .then(b => (b ? decodeAudio(c, b.slice(0)) : null)) // decodeAudioData baytları devralır: kopya ver
        .then(buf => {
          if (buf && this.bufCtx === c && this.enabled && !this.pinned.has(url)) lruSet(this.decoded, url, buf, MAX_DECODED);
          return buf;
        })
        .catch(() => null)
        .finally(() => this.decoding.delete(url));
      this.decoding.set(url, p);
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
