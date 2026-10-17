// Hızlı sohbet denetleyicisi (uygulama başına bir tane; her maç attach / detach eder).
//  düğme → pencere (oyuncunun karakterine göre sözler) → gönder: istemci sınırı (4 sn + dakikada 6) → maçın taşıması
//  (Blöf: GameClient → LocalHost; Pişti: ChatRelay) → ev sahibi doğrular + yayar → receive(): söyleyiş, OYUNCUNUN kendi
//  karakter sesiyle, kendi koltuğunda balonla; sonra kurala göre bir bot cevabı (ortak destekler, rakip iğneler;
//  söyleyiş bittikten 0,8–1,6 sn sonra). İkisi tek bölünmez birim: öncelik 3 gelirse cevap da düşer.
// Uzak (çevrimiçi) insan koltukları otomatik cevap vermez. "Rakipleri sustur": rakip koltuklardan gelen mesajlar ve rakip
// botların cevapları söylenmez.
// Hedefli söz + belirlenimci yayın (src/ai/quickTalk.ts): gönderirken hedef (son hamleyi yapan / sıradaki / ortak / 1'e 1'de
// rakip) ve söyleyiş BU cihazda seçilir, kimliğiyle taşınır; ev sahibi doğrular ve bot cevabını planlar (rp) → her cihaz aynı
// sesi çalar. Söyleyişsiz eski yayında (politikasız kapı) eskisi gibi: söz yerelde nötr seçilir, bot cevabı yerelde planlanır.
// Öneri: maç olay ipucu verir (cue: rakibin piştisi, kendi hatam, blöf penceresi, el sonu…); pencere ~9 sn içinde açılırsa
// uygun 3–4 mesaj öne gelir ve parlar (öğe sayısı aynı: yerleşim kaymaz; açıkken sıra değişmez).
import {QUICK_CHAT, lineById, type LineRef} from '../ai/dialogue';
import {
  ALL_QUICK_IDS, CUE_TTL_MS, arrange, chatMenu, humansOf, msgAvailable, pickSay, planReply, replyLineOk, resolveTarget, sayIdsFor, sayLineOk,
  type ChatCue, type TableMode,
} from '../ai/quickTalk';
import type {SpeechDirector, Utter} from '../audio/speech';
import type {VoicePlayer} from '../audio/voice';
import {CHAT_COOLDOWN_MS, CHAT_PER_MINUTE, ChatLimiter, type ChatReply} from '../net/chat';
import type {GameHud, QuickChatSheetPort} from '../ui/types';
import {whenIdle} from '../platform/sched';
import {SeatBubble, utter} from './seatBubble';

export type {ChatCue} from '../ai/quickTalk';

/** "Rakipleri sustur" tercihinin saklandığı yer (oyunda localStorage; testte bellek). */
export interface ChatPrefs {
  get(): boolean;
  set(on: boolean): void;
}

/** Geçerli mesaj kimlikleri (ev sahibi kapısı bunlarla doğrular): QUICK_CHAT + eşli takım mesajları. */
export const QUICK_IDS: readonly string[] = ALL_QUICK_IDS;

export interface ChatSeat {
  seat: number;
  char: string;
  team: number;
  /** İnsan (bu cihazdaki oyuncu ya da uzak oyuncu): otomatik cevap vermez. */
  human: boolean;
  /** Çevrimiçi uzak oyuncu. */
  remote?: boolean;
}

export interface ChatSession {
  game: 'pisti' | 'blof';
  /** Masa düzeni: eşlide takım mesajları (ortağa). Verilmezse takım mesajı yok. */
  mode?: TableMode;
  /** Bu cihazdaki oyuncunun koltuğu */
  me: number;
  seats: readonly ChatSeat[];
  /** Mesajı (+ seçilen söyleyiş + hedef koltuk) maçın taşımasına ver (ev sahibi doğrulayıp yayınca receive() gelir). */
  send(msg: string, line?: string, to?: number): void;
}

/** Yayının söyleyiş / hedef / bot cevabı alanları (ev sahibinden; yoksa eski biçim). */
export interface ChatExtra {
  line?: string;
  to?: number;
  rp?: ChatReply;
}

/** Oyuncunun karakterinin hızlı sohbet söyleyişleri (önce her mesajın ilk söyleyişi: sabitlenip çözülecekler). */
export function quickSayIds(char: string): string[] {
  const out: string[] = [];
  for (let n = 1; n <= 4; n++) for (const q of QUICK_CHAT) {
    const id = `qc_${char}_${q.id}_${n}`;
    if (lineById(id)) out.push(id);
  }
  return out;
}

/** Söyleyiş + cevabın sırada bekleyebileceği en uzun süre (atışma bitene dek). */
const CHAT_TTL_MS = 8000;
const now = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());

interface Plan {
  seat: number;
  char: string;
  line: LineRef;
  delayMs: number;
}

export class QuickChat {
  private s: ChatSession | null = null;
  private readonly limiter = new ChatLimiter(CHAT_COOLDOWN_MS, CHAT_PER_MINUTE);
  private readonly recent = new Map<string, string[]>();
  private muted: boolean;
  private pinnedFor = '';
  private sheetUsed = false;
  /** Gönderen dışında son hamleyi yapan / sırası gelen koltuk (hedef çözümü). */
  private lastOther = -1;
  private nextSeat = -1;
  private cueKind: ChatCue | null = null;
  private cueAt = -Infinity;

  constructor(
    private hud: GameHud,
    private sheet: () => QuickChatSheetPort,
    private speech: SpeechDirector,
    private voice: Pick<VoicePlayer, 'size' | 'preload'> | null,
    /** Sabitlenip önceden çözülecek söyleyiş sayısı (düşük cihazda 0: yalnız baytlar). */
    private decode = 14,
    private prefs: ChatPrefs = {get: () => false, set: () => undefined},
  ) {
    this.muted = prefs.get();
  }

  get isMuted(): boolean {
    return this.muted;
  }

  /** Maç başı: düğme görünür, oyuncunun söyleyişleri boşta önden indirilir. */
  attach(s: ChatSession): void {
    this.s = s;
    this.lastOther = -1;
    this.nextSeat = -1;
    this.cueKind = null;
    this.hud.onChat = () => this.open();
    this.hud.setChat?.(true);
    const w = this.limiter.waitMs(now());
    if (w > 0) this.hud.chatCooldown?.(w);
    this.preload(s);
  }

  /** Maç sonu / masadan kalkış: düğme ve pencere kapanır, söylenmekte olan sohbet susar. */
  detach(): void {
    if (!this.s) return;
    this.s = null;
    this.hud.setChat?.(false);
    this.hud.onChat = () => {};
    if (this.sheetUsed) this.sheet().close();
    this.speech.cancel('chat');
  }

  /** Pencere açıksa kapat (duraklat menüsü açılırken). */
  close(): void {
    if (this.sheetUsed) this.sheet().close();
  }

  /** Maç: bir koltuk hamlesini yaptı (tepki mesajlarının hedefi: gönderen dışında son hamleyi yapan). */
  acted(seat: number): void {
    if (this.s && seat !== this.s.me) this.lastOther = seat;
  }

  /** Maç: sıra bu koltukta ("hadi" mesajının hedefi). */
  turn(seat: number): void {
    this.nextSeat = seat;
  }

  /** Maç: olay ipucu (pencere kısa süre içinde açılırsa uygun mesajlar öne gelir). seat: olayın sahibi (tepkinin hedefi olur). */
  cue(kind: ChatCue, seat = -1): void {
    const s = this.s;
    if (!s) return;
    this.cueKind = kind;
    this.cueAt = now();
    if (seat >= 0 && seat !== s.me) this.lastOther = seat;
  }

  /** Açılışta geçerli ipucu (süresi dolduysa yok). */
  private freshCue(): ChatCue | null {
    return this.cueKind && now() - this.cueAt <= CUE_TTL_MS ? this.cueKind : null;
  }

  open(): void {
    const s = this.s;
    if (!s) return;
    const me = s.seats.find(x => x.seat === s.me);
    if (!me) return;
    this.sheetUsed = true;
    const sh = this.sheet();
    if (sh.isOpen) return sh.close();
    sh.open({
      items: arrange(chatMenu(me.char, s.game, s.mode, humansOf(s.seats)), this.freshCue()),
      muted: this.muted,
      coolMs: this.limiter.waitMs(now()),
      onPick: id => this.send(id),
      onMute: on => {
        this.muted = on;
        this.prefs.set(on);
      },
    });
  }

  /** Oyuncu mesaj seçti: istemci sınırı → hedef + söyleyiş (bu cihazda seçilir) → taşıma. */
  send(id: string): boolean {
    const s = this.s;
    if (!s || !msgAvailable(id, s.game, s.mode)) return false;
    const t = now();
    if (!this.limiter.take(t)) {
      this.hud.chatCooldown?.(this.limiter.waitMs(t));
      return false;
    }
    this.hud.chatCooldown?.(this.limiter.waitMs(t));
    const me = s.seats.find(x => x.seat === s.me);
    const to = resolveTarget(id, {me: s.me, seats: s.seats, mode: s.mode, last: this.lastOther, next: this.nextSeat});
    const line = me ? pickSay(me.char, id, to, s.seats, this.recentOf(me.char)) : null;
    s.send(id, line?.id, to >= 0 ? to : undefined);
    this.cueKind = null; // öneri kullanıldı: sonraki açılış varsayılan sırada
    return true;
  }

  /**
   * Ev sahibinden gelen yayın (gönderen dahil): söyleyiş + olası bot cevabı. x.line varsa (yeni biçim) söyleyiş ve cevap ev
   * sahibinin yaydığıdır (yerelde de denetlenir; geçersiz söyleyiş → nötr söz, geçersiz cevap → cevap yok). Yoksa (eski biçim)
   * söz yerelde seçilir, yerel oyuncunun mesajına bot cevabı yerelde planlanır.
   */
  receive(seat: number, msg: string, x?: ChatExtra): void {
    const s = this.s;
    if (!s || !QUICK_IDS.includes(msg)) return;
    const from = s.seats.find(q => q.seat === seat);
    const me = s.seats.find(q => q.seat === s.me);
    if (!from || !me) return;
    const mine = seat === s.me;
    if (!mine && this.muted && from.team !== me.team) return;
    const to = x?.to ?? -1;
    const sent = x?.line && sayLineOk(seat, msg, x.line, to, s.seats) ? lineById(x.line) : undefined;
    const say = sent ?? pickSay(from.char, msg, -1, s.seats, this.recentOf(from.char));
    if (!say) return;
    this.remember(from.char, say.id);
    const lines: Utter[] = [utter(say, from.char, new SeatBubble(this.hud, seat), 2200)];
    const gaps: number[] = [];
    let plan: Plan | null = null;
    if (x?.line) {
      // yeni biçim: cevabı ev sahibi planladı (herkes aynısını duyar)
      const rp = x.rp;
      const bot = rp ? s.seats.find(q => q.seat === rp.seat) : undefined;
      const l = rp && bot && replyLineOk(msg, seat, rp, s.seats) ? lineById(rp.line) : undefined;
      if (rp && bot && l) plan = {seat: bot.seat, char: bot.char, line: l, delayMs: rp.ms};
    } else if (mine) {
      const all: string[] = [];
      for (const r of this.recent.values()) all.push(...r);
      plan = planReply(msg, seat, to, s.seats, all);
    }
    const who = plan ? s.seats.find(q => q.seat === plan!.seat) : undefined;
    if (plan && who && !(this.muted && who.team !== me.team)) {
      this.remember(plan.char, plan.line.id);
      lines.push(utter(plan.line, plan.char, new SeatBubble(this.hud, plan.seat), 1800));
      gaps.push(plan.delayMs);
    }
    this.speech.exchange(lines, {prio: 2, tag: 'chat', queue: true, ttlMs: CHAT_TTL_MS, gapMs: gaps});
  }

  private recentOf(char: string): string[] {
    return this.recent.get(char) ?? [];
  }

  private remember(char: string, id: string): void {
    const r = this.recent.get(char) ?? [];
    r.push(id);
    while (r.length > 6) r.shift();
    this.recent.set(char, r);
  }

  /**
   * Oyuncunun kendi söyleyişleri (küçük küme) boşta indirilip sabitlenir; gönderince anında çalar: önce her mesajın ilk nötr
   * sözü ve masadaki botlara hedefli sözler (çözülür), kalanlar yalnız bayt. Masa (karakter, oyun, kadro) değişmedikçe bir kez.
   */
  private preload(s: ChatSession): void {
    const v = this.voice;
    const me = s.seats.find(x => x.seat === s.me);
    if (!v || !me) return;
    const key = `${me.char}|${s.game}|${s.mode ?? ''}|${s.seats.map(x => (x.human || x.remote ? '' : x.char)).join(',')}`;
    if (this.pinnedFor === key) return;
    const char = me.char;
    this.pinnedFor = key;
    const bots = s.seats.filter(x => !x.human && !x.remote).map(x => x.char);
    void whenIdle(2500).then(() => {
      if (this.pinnedFor !== key) return;
      if (!v.size) {
        this.pinnedFor = ''; // manifest henüz yok: sonraki maçta yeniden dene
        return;
      }
      void v.preload(sayIdsFor(char, s.game, s.mode, bots), this.decode);
    });
  }
}
