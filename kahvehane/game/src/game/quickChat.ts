// Hızlı sohbet denetleyicisi (uygulama başına bir tane; her maç attach / detach eder).
//  düğme → pencere (oyuncunun karakterine göre sözler) → gönder: istemci sınırı (4 sn + dakikada 6) → maçın taşıması
//  (Blöf: GameClient → LocalHost; Pişti: ChatRelay) → ev sahibi doğrular + yayar → receive(): söyleyiş, OYUNCUNUN kendi
//  karakter sesiyle, kendi koltuğunda balonla; sonra kurala göre bir bot cevabı (ortak destekler, rakip iğneler;
//  söyleyiş bittikten 0,8–1,6 sn sonra). İkisi tek bölünmez birim: öncelik 3 gelirse cevap da düşer.
// Uzak (çevrimiçi) insan koltukları otomatik cevap vermez; botlar yalnız bu cihazdaki oyuncunun mesajına cevap verir.
// "Rakipleri sustur": rakip koltuklardan gelen mesajlar ve rakip botların cevapları söylenmez.
import {QUICK_CHAT, lineById, planQuickReply, quickMenu, quickSay, type CharId, type QuickSeat} from '../ai/dialogue';
import type {SpeechDirector, Utter} from '../audio/speech';
import type {VoicePlayer} from '../audio/voice';
import {CHAT_COOLDOWN_MS, CHAT_PER_MINUTE, ChatLimiter} from '../net/chat';
import type {GameHud, QuickChatSheetPort} from '../ui/types';
import {whenIdle} from '../platform/sched';
import {SeatBubble, utter} from './seatBubble';

/** "Rakipleri sustur" tercihinin saklandığı yer (oyunda localStorage; testte bellek). */
export interface ChatPrefs {
  get(): boolean;
  set(on: boolean): void;
}

/** Geçerli mesaj kimlikleri (ev sahibi kapısı bunlarla doğrular). */
export const QUICK_IDS: readonly string[] = QUICK_CHAT.map(q => q.id);

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
  /** Bu cihazdaki oyuncunun koltuğu */
  me: number;
  seats: readonly ChatSeat[];
  /** Mesajı maçın taşımasına ver (ev sahibi doğrulayıp yayınca receive() gelir). */
  send(msg: string): void;
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

export class QuickChat {
  private s: ChatSession | null = null;
  private readonly limiter = new ChatLimiter(CHAT_COOLDOWN_MS, CHAT_PER_MINUTE);
  private readonly recent = new Map<string, string[]>();
  private muted: boolean;
  private pinnedFor = '';
  private sheetUsed = false;

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

  open(): void {
    const s = this.s;
    if (!s) return;
    const me = s.seats.find(x => x.seat === s.me);
    if (!me) return;
    this.sheetUsed = true;
    const sh = this.sheet();
    if (sh.isOpen) return sh.close();
    sh.open({
      items: quickMenu(me.char, s.game),
      muted: this.muted,
      coolMs: this.limiter.waitMs(now()),
      onPick: id => this.send(id),
      onMute: on => {
        this.muted = on;
        this.prefs.set(on);
      },
    });
  }

  /** Oyuncu mesaj seçti: istemci sınırı → taşıma. */
  send(id: string): boolean {
    const s = this.s;
    if (!s || !QUICK_IDS.includes(id)) return false;
    const t = now();
    if (!this.limiter.take(t)) {
      this.hud.chatCooldown?.(this.limiter.waitMs(t));
      return false;
    }
    this.hud.chatCooldown?.(this.limiter.waitMs(t));
    s.send(id);
    return true;
  }

  /** Ev sahibinden gelen yayın (gönderen dahil): söyleyiş + (yerel oyuncunun mesajıysa) olası bot cevabı. */
  receive(seat: number, msg: string): void {
    const s = this.s;
    if (!s || !QUICK_IDS.includes(msg)) return;
    const from = s.seats.find(x => x.seat === seat);
    const me = s.seats.find(x => x.seat === s.me);
    if (!from || !me) return;
    const mine = seat === s.me;
    if (!mine && this.muted && from.team !== me.team) return;
    const say = quickSay(from.char, msg, this.recentOf(from.char));
    if (!say) return;
    this.remember(from.char, say.id);
    const lines: Utter[] = [utter(say, from.char, new SeatBubble(this.hud, seat), 2200)];
    const gaps: number[] = [];
    if (mine) {
      const seats: QuickSeat[] = s.seats
        .filter(x => x.seat !== seat)
        .map(x => ({seat: x.seat, char: x.char as CharId, human: x.human || !!x.remote, rel: x.team === from.team ? 'mate' : 'opp'}));
      const all: string[] = [];
      for (const r of this.recent.values()) all.push(...r);
      const plan = planQuickReply(msg, seats, all);
      const who = plan ? s.seats.find(x => x.seat === plan.seat) : undefined;
      if (plan && who && !(this.muted && who.team !== me.team)) {
        this.remember(plan.char, plan.line.id);
        lines.push(utter(plan.line, plan.char, new SeatBubble(this.hud, plan.seat), 1800));
        gaps.push(plan.delayMs);
      }
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

  /** Oyuncunun kendi söyleyişleri (küçük küme) boşta indirilip sabitlenir; gönderince anında çalar. Karakter değişmedikçe bir kez. */
  private preload(s: ChatSession): void {
    const v = this.voice;
    const me = s.seats.find(x => x.seat === s.me);
    if (!v || !me || this.pinnedFor === me.char) return;
    const char = me.char;
    this.pinnedFor = char;
    void whenIdle(2500).then(() => {
      if (this.pinnedFor !== char) return;
      if (!v.size) {
        this.pinnedFor = ''; // manifest henüz yok: sonraki maçta yeniden dene
        return;
      }
      void v.preload(quickSayIds(char), this.decode);
    });
  }
}
