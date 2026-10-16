/**
 * Kahvehane — TEK konuşma yöneticisi (bütün uygulama için bir tane): oyun replikleri (Pişti / Blöf), botlar arası atışma
 * (banter), hızlı sohbet söyleyişi + bot cevabı, galeri tanıtımı, market satış konuşması. Hepsi buradan geçer ve tek ses
 * kanalına (VoicePlayer) iner. "Ne / ne zaman söylensin" kararı yine src/ai/dialogue.ts'teki DialogueDirector'da
 * (sıklık, tekrar önleme, atışma seçimi); bu sınıf "nasıl söylensin"i yönetir: sıra, öncelik, balon eşlemesi.
 *
 * GARANTİLER (tests/speech.test.ts):
 *  · Aynı anda asla iki ses yok: kanal tek; yeni replik başlamadan çalan sesi kısa bir sönümle (50 ms) keser.
 *  · Öncelik: 3 büyük an (pişti, el başı/sonu, Blöf anı, menü) > 2 olay / hızlı sohbet / atışma > 1 boş laf.
 *    Yüksek öncelik düşüğü keser; eşit öncelik çalanı kesmez (yalnız 3'te, çalanın > 1 sn kalanı varsa keser — pişti
 *    tepkisi kaybolmasın); düşük öncelik düşer. Eşit öncelik, çalan bitmek üzereyse (≤ 1 sn) sıraya girer.
 *  · Sıra tek yerdir; sıradaki replik bayatlarsa (ttl) çalınmadan düşer. `queue` isteyen (hızlı sohbet, atışma) düşmek
 *    yerine kanalın boşalmasını bekler (ttl kadar).
 *  · Atışma (exchange) bölünmez bir birimdir: A→B→C sırayla, satır arası boşlukla; öncelik 3 gelirse ya da el biterse
 *    (cancel('banter')) tamamı iptal olur — yarım atışma sürmez.
 *  · Balon sesle eşlenir: ses başlayınca balon en az ses süresi + 450 ms görünür; ses kesilirse balon hemen kapanır.
 *  · Ses yoksa (dosya henüz üretilmedi / bağlam kapalı) replik yalnız balondur ve kanalı tahmini süre kadar tutar.
 *  · Konuşmalar kapalıysa (ayar) ya da hiç ses dosyası yoksa: hiç ses çalmaz, balonlar eskisi gibi hemen görünür
 *    (atışma satırları tahmini sürelerle sıralanır).
 *  · hold(true) (duraklat menüsü) / stopAll() (masadan kalkış, ekran değişimi, VS / sonuç geçişi, uygulama arka plana
 *    geçince): konuşma anında durur, sıra temizlenir, balonlar kapanır.
 *  · Konuşurken efekt / ortam sesi kısılır (duck kancası, ör. sfx.duck).
 * Döngü yok (rAF yok): yalnız setTimeout; her zamanlayıcı iptal yollarında temizlenir.
 */
import {speechSeconds, ttsHash} from '../ai/dialogue';
import type {VoiceEnd, VoicePlayOpts} from './voice';

/** Kanalın kullandığı oynatıcı yüzeyi (VoicePlayer; testte sahte). */
export interface VoicePort {
  readonly size: number;
  readonly busy: boolean;
  readonly isEnabled: boolean;
  has(id: string, hash?: string): boolean;
  duration(id: string): number | null;
  play(id: string, opts?: VoicePlayOpts): boolean;
  stop(): void;
  setEnabled(on: boolean): void;
}

/** Replik yazısının göründüğü yer (koltuk balonu, galeri söz kutusu, market alıntısı…). */
export interface Bubble {
  /** Yazıyı göster; ms = beklenen görünme süresi (bileşen güvenlik zamanlayıcısı kurabilir). */
  show(text: string, mood: string | null | undefined, ms: number): void;
  /** Hemen kapat (yalnız bu yazıyı: arada başka yazı geldiyse dokunmaz). */
  hide(): void;
  /** En az ms daha görünür kalsın (ses geç başladı). */
  hold?(ms: number): void;
}

export interface Utter {
  /** Replik kimliği = ses dosyası kimliği (dialogue.ts). Yazı-yalnız tepkilerde herhangi bir ad. */
  id: string;
  text: string;
  /** Karakter (tahmini süre hızı için). */
  char: string;
  /** Seslendirme metni (süre tahmini + manifest h karşılaştırması). */
  tts?: string;
  mood?: string | null;
  bubble?: Bubble;
  /** Balonun en kısa görünme süresi (ms). */
  minMs?: number;
  /** false: sesi hiç yok (yalnız balon), yine de kanal sırasına uyar. */
  audio?: boolean;
}

export interface SayOpts {
  /** 1 boş laf · 2 olay / hızlı sohbet / atışma · 3 büyük an / menü */
  prio: number;
  /** İptal grubu: 'match' | 'banter' | 'chat' | 'menu' … */
  tag?: string;
  /** Kanal doluysa düşmek yerine boşalmasını bekle (ttlMs kadar). */
  queue?: boolean;
  ttlMs?: number;
  /** Atışmada satır arası boşluk (ms; tek sayı ya da satır başına). */
  gapMs?: number | readonly number[];
  /** Birim bitti (spoken=false: kesildi / düştü / bayatladı). */
  onDone?: (spoken: boolean) => void;
}

export interface SpeechOptions {
  /** Konuşurken efekt/ortam kısma kancası (0..1). */
  duck?: (amount: number) => void;
  /** Saat (ms). Varsayılan performance.now. */
  now?: () => number;
}

/** Ses bittikten sonra balonun kalma payı (ms). */
export const TAIL_MS = 450;
/** Eşit öncelikte "bitmek üzere" eşiği (ms). */
export const NEAR_MS = 1000;
/** Bitmek üzere olana sıraya giren tepkinin bayatlama süresi (ms). */
export const NEAR_TTL_MS = 1500;
/** queue isteyenin varsayılan bekleme sınırı (ms). */
export const QUEUE_TTL_MS = 5000;
/** Atışmada satır arası (ms; dialogue.ts BANTER_RULES.lineGapMs ile aynı). */
export const GAP_MS = 450;
const MIN_MS = 1600;
const MIN_TEXT_MS = 800;
/** Ses başlayamazsa / onEnd gelmezse kanalı bırakma payı (ms). */
const SAFETY_MS = 2500;

type Timer = ReturnType<typeof setTimeout>;

interface Item {
  lines: Utter[];
  gaps: readonly number[];
  gap: number;
  prio: number;
  tag: string;
  at: number;
  ttl: number;
  i: number;
  done: boolean;
  onDone?: (spoken: boolean) => void;
}

interface Shown {
  b: Bubble;
  until: number;
  timer: Timer | undefined;
}

interface Active {
  item: Item;
  u: Utter;
  start: number;
  est: number;
  end: number;
  audio: boolean;
  timer: Timer | undefined;
  bub: Shown | null;
}

/** Ses kapalı / dosyasız kipte atışma dizisi (balonlar tahmini sürelerle sırayla). */
interface Seq {
  item: Item;
  timer: Timer | undefined;
  bub: Shown | null;
  end: number;
}

interface Waiter {
  busy: () => boolean;
  res: () => void;
  timer: Timer | undefined;
}

const perfNow = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export class SpeechDirector {
  private enabled = true;
  private held = false;
  private own: Item | null = null;
  private cur: Active | null = null;
  private pending: Item | null = null;
  private gapTimer: Timer | undefined;
  private loose = new Set<Seq>();
  private bubbles = new Set<Shown>();
  private waiters = new Set<Waiter>();
  private readonly now: () => number;
  private readonly duckFn: ((a: number) => void) | undefined;
  private readonly onVis = (): void => {
    if (typeof document !== 'undefined' && document.hidden) this.stopAll();
  };

  constructor(private voice: VoicePort, o: SpeechOptions = {}) {
    this.now = o.now ?? perfNow;
    this.duckFn = o.duck;
    this.enabled = voice.isEnabled;
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this.onVis);
  }

  // ───────────── ayarlar ─────────────

  /** "Konuşmalar" ayarı: kapalıyken hiç ses yok, balonlar eskisi gibi. */
  setEnabled(on: boolean): void {
    this.enabled = !!on;
    this.voice.setEnabled(this.enabled); // çalan ses kesilir; balonu kendi süresince kalır
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  /** Ses kanalı kullanılıyor mu (ayar açık + manifestte en az bir ses). Değilse balonlar sıraya girmez. */
  get live(): boolean {
    return this.enabled && this.voice.size > 0;
  }

  /** Duraklat menüsü: konuşma susar, açık kaldıkça yeni replik söylenmez. */
  hold(on: boolean): void {
    this.held = !!on;
    if (this.held) this.stopAll();
  }

  get isHeld(): boolean {
    return this.held;
  }

  // ───────────── konuşma ─────────────

  /** Tek replik. true: söylendi ya da sıraya girdi; false: düştü (çağıran yalnız yüz ifadesi gösterebilir). */
  say(u: Utter, o: SayOpts): boolean {
    return this.submit(this.item([u], o), !!o.queue);
  }

  /** Bölünmez dizi (atışma A→B→C, hızlı sohbet söyleyiş → cevap). Önceliği o.prio. */
  exchange(lines: readonly Utter[], o: SayOpts): boolean {
    if (!lines.length) return false;
    return this.submit(this.item([...lines], o), !!o.queue);
  }

  /** Bu öncelikte bir replik şimdi kabul edilir mi (yan etkisiz; replik seçmeden önce sorulur → tekrar hafızası boşa yanmaz). */
  canSay(prio: number, queue = false): boolean {
    if (this.held) return false;
    if (!this.live) return true;
    const own = this.own;
    if (!own) return true;
    const rem = this.remaining();
    if (prio > own.prio || (prio >= 3 && own.prio >= 3 && rem > NEAR_MS)) return true;
    if (queue || (prio === own.prio && own.lines.length === 1 && rem <= NEAR_MS)) return !(this.pending && this.pending.prio > prio);
    return false;
  }

  /** Şu an söylenen (yoksa null): kimlik, etiket, öncelik, kalan ms. */
  current(): {id: string; tag: string; prio: number; leftMs: number} | null {
    const c = this.cur;
    if (!c) return null;
    return {id: c.u.id, tag: c.item.tag, prio: c.item.prio, leftMs: Math.max(0, c.end - this.now())};
  }

  /** Kanal ya da (tag verilirse) o gruptan bir şey konuşuyor / sırada mı. */
  busy(tag?: string): boolean {
    const t = (it: Item | null): boolean => !!it && (tag === undefined || it.tag === tag);
    if (t(this.own) || t(this.pending)) return true;
    for (const s of this.loose) if (t(s.item)) return true;
    return false;
  }

  /** Kanal (ya da tag grubu) susunca çözülür; en geç maxMs. stopAll da çözer. */
  idle(o: {tag?: string; maxMs?: number} = {}): Promise<void> {
    const busy = (): boolean => this.busy(o.tag);
    if (!busy()) return Promise.resolve();
    return new Promise<void>(res => {
      const w: Waiter = {busy, res, timer: undefined};
      w.timer = setTimeout(() => this.release(w), o.maxMs ?? 8000);
      this.waiters.add(w);
    });
  }

  /** En az minMs bekle, sonra kanal susana dek (en çok maxMs toplam). Sonuç ekranından önce: son söz yarıda kalmasın. */
  async settle(minMs: number, maxMs: number): Promise<void> {
    await new Promise<void>(r => setTimeout(r, Math.max(0, minMs)));
    await this.idle({maxMs: Math.max(0, maxMs - minMs)});
  }

  /** Bir grubu (çalan + sıradaki + sessiz kip dizileri) iptal eder. */
  cancel(tag: string): void {
    if (this.pending?.tag === tag) {
      const p = this.pending;
      this.pending = null;
      this.finishItem(p, false);
    }
    for (const s of [...this.loose]) if (s.item.tag === tag) this.cancelSeq(s);
    if (this.own?.tag === tag) {
      this.cancelOwn();
      this.pump();
    }
    this.notify();
  }

  /** Her şeyi anında susturur: çalan kesilir, sıra temizlenir, balonlar kapanır. */
  stopAll(): void {
    const p = this.pending;
    this.pending = null;
    if (p) this.finishItem(p, false);
    for (const s of [...this.loose]) this.cancelSeq(s);
    this.cancelOwn();
    if (this.voice.busy) this.voice.stop();
    for (const b of [...this.bubbles]) this.hideBubble(b);
    this.notify();
  }

  dispose(): void {
    this.stopAll();
    for (const w of [...this.waiters]) this.release(w);
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.onVis);
  }

  /** @internal test/ölçüm */
  stats(): {own: string | null; line: string | null; pending: string | null; loose: number; bubbles: number; waiters: number} {
    return {
      own: this.own ? this.own.lines.map(l => l.id).join('>') : null,
      line: this.cur?.u.id ?? null,
      pending: this.pending ? this.pending.lines.map(l => l.id).join('>') : null,
      loose: this.loose.size,
      bubbles: this.bubbles.size,
      waiters: this.waiters.size,
    };
  }

  // ───────────── iç işler ─────────────

  private item(lines: Utter[], o: SayOpts): Item {
    const g = o.gapMs;
    return {
      lines, gaps: Array.isArray(g) ? g : [], gap: typeof g === 'number' ? g : GAP_MS, prio: o.prio, tag: o.tag ?? '', at: this.now(),
      ttl: o.ttlMs ?? QUEUE_TTL_MS, i: 0, done: false, onDone: o.onDone,
    };
  }

  private submit(item: Item, queue: boolean): boolean {
    if (this.held) return false;
    if (!this.live) return this.passThrough(item);
    // büyük an gelince sıradaki atışma / dizi de düşer (bölünmez birim yarım kalmaz, sonradan da başlamaz)
    if (item.prio >= 3 && this.pending && this.pending.prio < 3 && this.pending.lines.length > 1) {
      const p = this.pending;
      this.pending = null;
      this.finishItem(p, false);
    }
    const own = this.own;
    if (!own) {
      this.start(item);
      return true;
    }
    const rem = this.remaining();
    if (item.prio > own.prio || (item.prio >= 3 && own.prio >= 3 && rem > NEAR_MS)) {
      this.cancelOwn();
      this.start(item);
      return true;
    }
    const near = item.prio === own.prio && own.lines.length === 1 && rem <= NEAR_MS;
    if (queue || near) {
      const p = this.pending;
      if (p && p.prio > item.prio) return false;
      if (p) this.finishItem(p, false);
      item.at = this.now();
      if (!queue) item.ttl = NEAR_TTL_MS;
      this.pending = item;
      this.notify();
      return true;
    }
    return false;
  }

  /** Çalan birimin kalan süresi (ms): çalan satırın kalanı + sıradaki satırların tahmini + boşluklar. */
  private remaining(): number {
    const own = this.own;
    if (!own) return 0;
    const t = this.now();
    let ms = this.cur ? Math.max(0, this.cur.end - t) : 0;
    const from = this.cur ? own.i + 1 : own.i;
    for (let k = from; k < own.lines.length; k++) ms += this.estimate(own.lines[k]) + this.gapOf(own, k - 1);
    return ms;
  }

  private gapOf(item: Item, k: number): number {
    return item.gaps[k] ?? item.gap;
  }

  private hashOf(u: Utter): string | undefined {
    return u.tts ? ttsHash(u.tts) : undefined;
  }

  private hasAudio(u: Utter): boolean {
    return u.audio !== false && this.enabled && this.voice.has(u.id, this.hashOf(u));
  }

  /** Tahmini süre (ms): manifestteki ses süresi, yoksa konuşma hızından. */
  private estimate(u: Utter): number {
    const d = this.hasAudio(u) ? this.voice.duration(u.id) : null;
    if (d) return d * 1000;
    return Math.max(MIN_TEXT_MS, speechSeconds(u.char, u.tts ?? u.text) * 1000);
  }

  private start(item: Item): void {
    this.own = item;
    item.i = 0;
    this.playLine(item);
  }

  private playLine(item: Item): void {
    const u = item.lines[item.i];
    const t = this.now();
    const est = this.estimate(u);
    const line: Active = {item, u, start: t, est, end: t + est, audio: false, timer: undefined, bub: null};
    this.cur = line;
    line.bub = this.showBubble(u, Math.max(u.minMs ?? MIN_MS, est + TAIL_MS));
    if (this.hasAudio(u)) {
      if (this.voice.busy) this.voice.stop(); // eski sesin sönümü; asla üst üste değil
      line.audio = this.voice.play(u.id, {
        priority: 3, // karar burada verildi: oynatıcının kendi öncelik kuralı devreye girmesin
        duck: this.duckFn,
        onStart: d => this.started(line, d),
        onEnd: why => this.audioEnd(line, why),
      });
    }
    // önbellekteki ses play() içinde hemen başlamış olabilir (started zamanlayıcıyı kurdu)
    if (this.cur === line && line.timer === undefined) line.timer = setTimeout(() => this.lineDone(line), line.audio ? est + SAFETY_MS : est);
    this.notify();
  }

  /** Ses gerçekten başladı: bitiş zamanı + balon süresi buna göre. */
  private started(line: Active, durS: number): void {
    if (this.cur !== line) return;
    const ms = durS * 1000;
    line.end = this.now() + ms;
    clearTimeout(line.timer);
    line.timer = setTimeout(() => this.lineDone(line), ms + SAFETY_MS);
    if (line.bub) this.extendBubble(line.bub, ms + TAIL_MS);
  }

  private audioEnd(line: Active, why: VoiceEnd): void {
    if (this.cur !== line) return;
    if (why === 'ended') return this.lineDone(line);
    // hiç çalmadı (bayat çözme, bağlam kapandı) ya da dışarıdan kesildi: satır yazı olarak tahmini süresini doldurur
    line.audio = false;
    clearTimeout(line.timer);
    const left = Math.max(0, line.start + line.est - this.now());
    line.end = this.now() + left;
    line.timer = setTimeout(() => this.lineDone(line), left);
  }

  private lineDone(line: Active): void {
    if (this.cur !== line) return;
    clearTimeout(line.timer);
    this.cur = null;
    if (line.bub) this.extendBubble(line.bub, TAIL_MS);
    const item = line.item;
    if (this.own === item && item.i + 1 < item.lines.length) {
      const gap = this.gapOf(item, item.i);
      item.i++;
      clearTimeout(this.gapTimer);
      this.gapTimer = setTimeout(() => {
        this.gapTimer = undefined;
        if (this.own === item && !this.held) this.playLine(item);
      }, gap);
      this.notify();
      return;
    }
    if (this.own === item) this.own = null;
    this.finishItem(item, true);
    this.pump();
  }

  private cancelOwn(): void {
    const item = this.own;
    if (!item) return;
    this.own = null;
    clearTimeout(this.gapTimer);
    this.gapTimer = undefined;
    const line = this.cur;
    this.cur = null;
    if (line) {
      clearTimeout(line.timer);
      if (line.audio) this.voice.stop();
      if (line.bub) this.hideBubble(line.bub);
    }
    this.finishItem(item, false);
  }

  private pump(): void {
    if (this.own || this.held) return this.notify();
    const p = this.pending;
    this.pending = null;
    if (!p) return this.notify();
    if (this.now() - p.at > p.ttl) {
      this.finishItem(p, false);
      return this.pump();
    }
    this.start(p);
  }

  private finishItem(item: Item, spoken: boolean): void {
    if (item.done) return;
    item.done = true;
    try {
      item.onDone?.(spoken);
    } catch {
      /* yoksay */
    }
    this.notify();
  }

  // ───── ses kapalı / dosyasız kip: balonlar hemen (eski davranış); diziler tahmini sürelerle ─────

  private passThrough(item: Item): boolean {
    if (item.prio >= 3) for (const s of [...this.loose]) if (s.item.prio < 3) this.cancelSeq(s);
    if (item.lines.length === 1) {
      const u = item.lines[0];
      this.showBubble(u, Math.max(u.minMs ?? MIN_MS, this.estimate(u) + TAIL_MS));
      this.finishItem(item, true);
      return true;
    }
    const seq: Seq = {item, timer: undefined, bub: null, end: 0};
    this.loose.add(seq);
    this.seqStep(seq);
    return true;
  }

  private seqStep(seq: Seq): void {
    const item = seq.item;
    const u = item.lines[item.i];
    const est = this.estimate(u);
    seq.bub = this.showBubble(u, Math.max(u.minMs ?? MIN_MS, est + TAIL_MS));
    seq.end = this.now() + est;
    seq.timer = setTimeout(() => {
      if (!this.loose.has(seq)) return;
      if (item.i + 1 < item.lines.length) {
        const gap = this.gapOf(item, item.i);
        item.i++;
        seq.timer = setTimeout(() => {
          if (this.loose.has(seq)) this.seqStep(seq);
        }, gap);
      } else {
        this.loose.delete(seq);
        this.finishItem(item, true);
      }
    }, est);
  }

  private cancelSeq(seq: Seq): void {
    if (!this.loose.delete(seq)) return;
    clearTimeout(seq.timer);
    if (seq.bub) this.hideBubble(seq.bub);
    this.finishItem(seq.item, false);
  }

  // ───── balonlar ─────

  private showBubble(u: Utter, ms: number): Shown | null {
    const b = u.bubble;
    if (!b) return null;
    try {
      b.show(u.text, u.mood, ms);
    } catch {
      return null;
    }
    const s: Shown = {b, until: this.now() + ms, timer: undefined};
    s.timer = setTimeout(() => this.hideBubble(s), ms);
    this.bubbles.add(s);
    return s;
  }

  /** En az ms daha görünsün. */
  private extendBubble(s: Shown, ms: number): void {
    if (!this.bubbles.has(s)) return;
    const until = this.now() + ms;
    if (until <= s.until) return;
    s.until = until;
    clearTimeout(s.timer);
    s.timer = setTimeout(() => this.hideBubble(s), ms);
    try {
      s.b.hold?.(ms);
    } catch {
      /* yoksay */
    }
  }

  private hideBubble(s: Shown): void {
    if (!this.bubbles.delete(s)) return;
    clearTimeout(s.timer);
    try {
      s.b.hide();
    } catch {
      /* yoksay */
    }
  }

  // ───── bekleyenler ─────

  private notify(): void {
    if (!this.waiters.size) return;
    for (const w of [...this.waiters]) if (!w.busy()) this.release(w);
  }

  private release(w: Waiter): void {
    if (!this.waiters.delete(w)) return;
    clearTimeout(w.timer);
    w.res();
  }
}

/** Oynatıcı başına tek yönetici: uygulama (main.ts) kurar; maçlar ve ekranlar aynı örneği alır. */
const DIRECTORS = new WeakMap<object, SpeechDirector>();
export function speechFor(voice: VoicePort, o?: SpeechOptions): SpeechDirector {
  let d = DIRECTORS.get(voice);
  if (!d) {
    d = new SpeechDirector(voice, o);
    DIRECTORS.set(voice, d);
  }
  return d;
}
