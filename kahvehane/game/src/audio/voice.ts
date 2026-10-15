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
 * - Her başarılı `play` için `onEnd` tam bir kez çağrılır (bitti, kesildi, düştü ya da çözülemedi).
 */

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
  onEnd?: () => void;
  /** Konuşma başlarken duck(miktar 0..1), bitince duck(0): ortam/müzik kısmak için. */
  duck?: (amount: number) => void;
  /** 1 boş laf, 2 olay tepkisi, 3 pişti / el sonu. Verilmezse manifestteki `p`, o da yoksa 2. */
  priority?: number;
  /** İstekten başlangıca izin verilen en uzun gecikme (ms; çözme + sıra). Varsayılan 1500. */
  maxDelayMs?: number;
}

const MAX_DECODED = 12;
const MAX_BYTES = 32;
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

  /** @param getCtx oyunun AudioContext'i (ör. `() => sfx.context`); henüz yoksa null. */
  constructor(getCtx: () => AudioContext | null) {
    this.getCtx = getCtx;
  }

  setEnabled(on: boolean): void {
    this.enabled = !!on;
    if (!this.enabled) {
      this.stop();
      this.decoded.clear(); // belleği bırak
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
      this.finish(old);
    }
    const job: Job = {id, prio, opts, at: nowMs(), buf: null, ducked: false, done: false};
    this.next = job;
    const hit = this.bufCtx === c ? lruGet(this.decoded, id) : undefined;
    if (hit) {
      job.buf = hit;
      this.pump();
    } else {
      void this.decode(id, c).then(buf => {
        if (job.done || this.next !== job) return;
        if (!buf) {
          this.next = null;
          this.finish(job);
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

  /** Çalanı ve sıradakini durdurur. */
  stop(): void {
    const n = this.next;
    this.next = null;
    if (n) this.finish(n);
    this.stopCur();
  }

  /** Her şeyi bırakır (HMR / çıkış). */
  dispose(): void {
    this.stop();
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
  stats(): {entries: number; decoded: number; bytes: number; playing: string | null; queued: string | null} {
    return {
      entries: this.entries.size,
      decoded: this.decoded.size,
      bytes: this.bytes.size,
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
    const hit = lruGet(this.bytes, id);
    if (hit) return Promise.resolve(hit);
    let p = this.bytesLoading.get(id);
    if (!p) {
      const e = this.entries.get(id);
      if (!e || typeof fetch !== 'function') return Promise.resolve(null);
      p = fetch(e.url)
        .then(r => (r.ok ? r.arrayBuffer() : null))
        .then(b => {
          if (b && b.byteLength) lruSet(this.bytes, id, b, MAX_BYTES);
          return b && b.byteLength ? b : null;
        })
        .catch(() => null)
        .finally(() => this.bytesLoading.delete(id));
      this.bytesLoading.set(id, p);
    }
    return p;
  }

  private decode(id: string, c: AudioContext): Promise<AudioBuffer | null> {
    if (this.bufCtx !== c) {
      this.decoded.clear();
      this.decoding.clear();
      this.bufCtx = c;
    }
    const hit = lruGet(this.decoded, id);
    if (hit) return Promise.resolve(hit);
    let p = this.decoding.get(id);
    if (!p) {
      p = this.fetchBytes(id)
        .then(b => (b ? decodeAudio(c, b.slice(0)) : null)) // decodeAudioData baytları devralır: kopya ver
        .then(buf => {
          if (buf && this.bufCtx === c && this.enabled) lruSet(this.decoded, id, buf, MAX_DECODED);
          return buf;
        })
        .catch(() => null)
        .finally(() => this.decoding.delete(id));
      this.decoding.set(id, p);
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
      this.finish(job);
      return;
    }
    const cur = this.cur;
    if (cur) {
      const left = cur.endsAt - c.currentTime;
      const preempt = job.prio > cur.job.prio || (job.prio === cur.job.prio && job.prio >= TOP_PRIO && left > QUEUE_MAX_S);
      if (preempt) this.stopCur();
      else if (job.prio < cur.job.prio) {
        this.next = null;
        this.finish(job);
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
    } catch {
      if (this.cur && this.cur.job === job) this.ended(this.cur);
      else this.finish(job);
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
    this.finish(p.job);
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
    this.finish(p.job);
  }

  private finish(job: Job): void {
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
      job.opts.onEnd?.();
    } catch {
      /* yoksay */
    }
  }
}
