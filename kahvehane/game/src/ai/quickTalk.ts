// Kahvehane — hızlı sohbetin ikinci katmanı: MANTIK (saf; DOM / ses yok). Veri src/ai/quickTalkLines.ts'te.
//
//  · Hedef: 1'e 1'de rakip; 3–4 kişide bağlama göre — tepki mesajları (aferin, vay, şans, teşekkür, blöf) son hamleyi yapan,
//    "hadi" sıradaki, selam / gg / çay masa (hedefsiz), takım mesajları eşlide ortak (resolveTarget).
//  · Söyleyiş: hedef BOTSA ve o karaktere yazılmış söz varsa çoğunlukla o (Rıza'ya saygılı takılma, Cem'e telefon / yayın,
//    Dursun'a çay / tepsi, Defne'ye zarif iltifat); hedef insansa (çevrimiçi "Mustafa"), bilinmiyorsa ya da söz yoksa nötr
//    söyleyiş. Nötr havuzdan da masadaki insan avatarını anan söz düşer (dialogue.ts → lineAllowed).
//  · Çevrimiçi ve belirlenimci: söyleyişi GÖNDEREN seçer; taşıma mesaj + söyleyiş + hedef taşır; ev sahibi (chatPolicy) söyleyişin
//    o mesaja + gönderenin karakterine ait olduğunu ve kişiye özel sözün yalnız BOT hedefe gittiğini doğrular, bot cevabını
//    kendisi planlar → her cihaz aynı sesi çalar. Alıcılar da aynı denetimden geçirir (sayLineOk / replyLineOk).
//  · Menü: gönderenin karakterine göre sözler, eşlide takım mesajları; bir olaydan hemen sonra (rakibin piştisi, kendi hatam,
//    blöf penceresi, el sonu) en uygun 3–4 mesaj öne gelir ve parlar (arrange) — öğe sayısı sabit, yerleşim kaymaz.
import {
  QUICK_CHAT, QUICK_REPLY_DELAY_MS, QUICK_REPLY_RULES, lineAllowed, lineById, mentionsOf, pickFreshLine, quickReplyPool, quickSayPool,
  registerLines, soundKey, type CharId, type LineRef, type QuickReplyCat, type Rel,
} from './dialogue';
import {NEUTRAL_LABELS, TARGET_MSGS, TEAM_CHAT, extraLines, hasTargetSay, targetSayId} from './quickTalkLines';
import type {ChatPolicy, ChatReply} from '../net/chat';

// ek replikler (hedefli söyleyişler, takım mesajları, ince havuz ekleri) bir kez kaydedilir
registerLines(extraLines());

export type TableMode = '1v1' | '3' | '4' | 'esli';
export type Game = 'pisti' | 'blof';

/** Masadaki koltuk (QuickChat'in ChatSeat'i ile aynı biçim). */
export interface TalkSeat {
  seat: number;
  char: string;
  team: number;
  /** İnsan (bu cihazdaki oyuncu ya da uzak oyuncu). */
  human: boolean;
  /** Çevrimiçi uzak oyuncu. */
  remote?: boolean;
}

const isHuman = (s: TalkSeat | undefined): boolean => !!s && (s.human || !!s.remote);
const isBot = (s: TalkSeat | undefined): s is TalkSeat => !!s && !s.human && !s.remote;

/** Masadaki insan koltukların avatar karakterleri (bunlara adla / kişilikle seslenilmez). */
export function humansOf(seats: readonly TalkSeat[]): Set<string> {
  return new Set(seats.filter(isHuman).map(s => s.char));
}

// ───────────────────────── mesajlar ─────────────────────────

interface MsgDef {
  id: string;
  icon: string;
  reply: QuickReplyCat;
  labels: Readonly<Record<CharId, string>>;
  game?: Game;
  team?: true;
}

const MSGS: readonly MsgDef[] = [...QUICK_CHAT, ...TEAM_CHAT.map(t => ({...t, team: true as const}))];
const BY_MSG = new Map(MSGS.map(m => [m.id, m]));

/** Bütün mesaj kimlikleri (ev sahibi kapısı bunlarla doğrular): QUICK_CHAT + eşli takım mesajları. */
export const ALL_QUICK_IDS: readonly string[] = MSGS.map(m => m.id);
export const TEAM_IDS: readonly string[] = TEAM_CHAT.map(t => t.id);

/** Mesaj bu oyunda / masada gönderilebilir mi (Blöf mesajları yalnız Blöf'te, takım mesajları yalnız eşlide). */
export function msgAvailable(msg: string, game: Game, mode: TableMode | undefined): boolean {
  const m = BY_MSG.get(msg);
  return !!m && (!m.game || m.game === game) && (!m.team || mode === 'esli');
}

/** Hedef türü: son hamleyi yapan · sıradaki · masa · ortak · kendisi (1'e 1'de hepsi rakip; ortak hariç). */
type Aim = 'last' | 'next' | 'table' | 'mate' | 'self';
const AIM: Readonly<Record<string, Aim>> = {
  hello: 'table', gg: 'table', tea: 'table', revenge: 'table',
  nice: 'last', wow: 'last', lucky: 'last', thanks: 'last', bluffing: 'last',
  hurry: 'next',
  wait: 'self', oops: 'self', oh_no: 'self', trust_me: 'self',
  team_ours: 'mate', team_sorry: 'mate',
};

export interface AimCtx {
  /** Gönderenin koltuğu */
  me: number;
  seats: readonly TalkSeat[];
  mode?: TableMode;
  /** Gönderen dışında son hamleyi yapan koltuk (yoksa −1). */
  last?: number;
  /** Sırası gelen koltuk (yoksa −1). */
  next?: number;
}

const partnerOf = (me: number, seats: readonly TalkSeat[]): TalkSeat | undefined => {
  const t = seats.find(s => s.seat === me)?.team;
  return t === undefined ? undefined : seats.find(s => s.seat !== me && s.team === t);
};

/** Mesajın hedef koltuğu (−1: masa / hedefsiz). */
export function resolveTarget(msg: string, c: AimCtx): number {
  const aim = AIM[msg] ?? 'table';
  const has = (s: number | undefined): s is number => s !== undefined && s >= 0 && s !== c.me && c.seats.some(x => x.seat === s);
  if (aim === 'mate') return c.mode === 'esli' ? partnerOf(c.me, c.seats)?.seat ?? -1 : -1;
  if (c.seats.length === 2) return c.seats.find(s => s.seat !== c.me)?.seat ?? -1;
  if (aim === 'last') return has(c.last) ? c.last : -1;
  if (aim === 'next') return has(c.next) ? c.next : -1;
  return -1;
}

// ───────────────────────── söyleyiş ─────────────────────────

/** Hedef bot ve ona yazılmış söz varken o sözün seçilme olasılığı (kalanı nötr: çeşitlilik). */
export const TARGET_BIAS = 0.75;

/** Hedef koltuk bir botsa ve gönderenin ona yazılmış sözü varsa o sözün kimliği. */
function targetLine(sender: string, msg: string, to: number, seats: readonly TalkSeat[]): LineRef | null {
  const t = seats.find(s => s.seat === to);
  if (!isBot(t) || t.char === sender || !TARGET_MSGS.includes(msg) || !hasTargetSay(sender, msg, t.char)) return null;
  return lineById(targetSayId(sender, msg, t.char)) ?? null;
}

/** Nötr söyleyişler (masadaki insan avatarını anan söz hariç). */
function neutralPool(sender: string, msg: string, humans: ReadonlySet<string>): LineRef[] {
  return quickSayPool(sender, msg).filter(l => lineAllowed(l, humans));
}

/**
 * Gönderenin söyleyişini seçer (gönderen cihazda; seçilen kimlik taşınır). recent: son söylenenler (tekrar önleme).
 * Hedefli söz çoğunlukla seçilir (TARGET_BIAS), az önce söylendiyse nötr.
 */
export function pickSay(sender: string, msg: string, to: number, seats: readonly TalkSeat[], recent: readonly string[] = [], rnd: () => number = Math.random): LineRef | null {
  const humans = humansOf(seats);
  const tv = targetLine(sender, msg, to, seats);
  const rec = recent.map(soundKey);
  if (tv && !rec.includes(soundKey(tv.id)) && rnd() < TARGET_BIAS) return tv;
  return pickFreshLine(neutralPool(sender, msg, humans), recent, rnd) ?? tv;
}

/**
 * Söyleyiş bu gönderen + mesaj + hedef için geçerli mi (ev sahibi kapısı ve alıcılar). Nötr söz: o mesajın havuzunda ve
 * masadaki insan avatarını anmıyor. Hedefli söz: `to` bir BOT koltuk ve sözün yazıldığı karakter (insana asla).
 */
export function sayLineOk(fromSeat: number, msg: string, lineId: string, to: number, seats: readonly TalkSeat[]): boolean {
  const from = seats.find(s => s.seat === fromSeat);
  const l = lineById(lineId);
  if (!from || !l || l.moment !== 'quickSay' || l.char !== from.char || !BY_MSG.has(msg)) return false;
  if (to >= 0 && (to === fromSeat || !seats.some(s => s.seat === to))) return false;
  if (BY_MSG.get(msg)!.team && to >= 0 && to !== partnerOf(fromSeat, seats)?.seat) return false;
  if (quickSayPool(from.char, msg).includes(l)) return lineAllowed(l, humansOf(seats));
  const t = targetLine(from.char, msg, to, seats);
  return !!t && t.id === l.id;
}

// ───────────────────────── bot cevabı ─────────────────────────

/** Bota yöneltilmiş mesajda o botun cevap verme olasılığına ek (seslenilen cevap verir). */
const ADDRESSED_BONUS = 0.15;
/** Takım mesajına ortak bot cevap olasılığı. */
const TEAM_REPLY_CHANCE = 0.85;

export interface ReplyPlan {
  seat: number;
  char: CharId;
  line: LineRef;
  delayMs: number;
}

const relOf = (a: TalkSeat, b: TalkSeat): Rel => (a.team === b.team ? 'mate' : 'opp');

/** Botun bu mesaja (gönderen insana) cevap havuzu: ilişkiye uygun + nötr (insana adla / cinsiyetle seslenmez). */
function replyPool(bot: TalkSeat, from: TalkSeat, msg: string, humans: ReadonlySet<string>): LineRef[] {
  const def = BY_MSG.get(msg);
  if (!def) return [];
  const rel = relOf(bot, from);
  return quickReplyPool(bot.char as CharId, def.reply).filter(l => (!l.rel || l.rel === rel) && lineAllowed(l, humans, !isHuman(from)));
}

/**
 * Gelen mesaja en çok bir bot cevabı planlar (ev sahibinde ya da yerelde). Takım mesajı → yalnız ortak bot. Bota seslenildiyse
 * (to = bot) o bot cevaplar. Aksi hâlde kategorinin kuralı: ortak önce destek verir (mateFirst), yoksa rastgele bir rakip bot.
 */
export function planReply(msg: string, fromSeat: number, to: number, seats: readonly TalkSeat[], recent: readonly string[] = [], rnd: () => number = Math.random): ReplyPlan | null {
  const def = BY_MSG.get(msg);
  const from = seats.find(s => s.seat === fromSeat);
  if (!def || !from) return null;
  const humans = humansOf(seats);
  const bots = seats.filter(s => s.seat !== fromSeat && isBot(s));
  if (!bots.length) return null;
  const rule = QUICK_REPLY_RULES[def.reply];
  let who: TalkSeat | undefined;
  let chance = rule.chance;
  if (def.team) {
    who = bots.find(s => s.team === from.team);
    chance = TEAM_REPLY_CHANCE;
  } else {
    const addressed = bots.find(s => s.seat === to);
    if (addressed && replyPool(addressed, from, msg, humans).length) {
      who = addressed;
      chance = Math.min(1, rule.chance + ADDRESSED_BONUS);
    } else {
      const mates = bots.filter(s => s.team === from.team);
      const opps = bots.filter(s => s.team !== from.team);
      who = mates.length && (rule.mateFirst || !opps.length) ? mates[0] : opps.length ? opps[Math.floor(rnd() * opps.length) % opps.length] : undefined;
    }
  }
  if (!who || rnd() >= chance) return null;
  const line = pickFreshLine(replyPool(who, from, msg, humans), recent, rnd);
  if (!line) return null;
  const [lo, hi] = QUICK_REPLY_DELAY_MS;
  return {seat: who.seat, char: who.char as CharId, line, delayMs: Math.round(lo + rnd() * (hi - lo))};
}

/** Yayındaki bot cevabı geçerli mi (alıcılar): koltuk bot, söz o botun bu mesaja (gönderene) uygun cevap havuzunda. */
export function replyLineOk(msg: string, fromSeat: number, rp: ChatReply, seats: readonly TalkSeat[]): boolean {
  const bot = seats.find(s => s.seat === rp.seat);
  const from = seats.find(s => s.seat === fromSeat);
  const l = lineById(rp.line);
  if (!isBot(bot) || !from || !l || bot.seat === fromSeat || !Number.isFinite(rp.ms) || rp.ms < 0 || rp.ms > 5000) return false;
  return replyPool(bot, from, msg, humansOf(seats)).includes(l);
}

// ───────────────────────── ev sahibi politikası ─────────────────────────

/**
 * Ev sahibinin sohbet politikası (net/chat.ts → ChatGate): gönderen insan koltuk, mesaj bu oyunda / masada var, söyleyiş geçerli
 * (sayLineOk); söyleyişsiz eski istemciye nötr ilk söz (herkes aynısını çalar); bot cevabını ev sahibi planlar (herkes aynısını duyar).
 */
export function chatPolicy(o: {game: Game; mode?: TableMode; seats: readonly TalkSeat[]; rnd?: () => number}): ChatPolicy {
  const seats = o.seats;
  const rnd = o.rnd ?? Math.random;
  const recent: string[] = [];
  const sender = (seat: number): TalkSeat | undefined => {
    const s = seats.find(x => x.seat === seat);
    return isHuman(s) ? s : undefined;
  };
  return {
    valid(seat, msg, line, to) {
      return !!sender(seat) && msgAvailable(msg, o.game, o.mode) && sayLineOk(seat, msg, line, to, seats);
    },
    fill(seat, msg) {
      const s = sender(seat);
      if (!s || !msgAvailable(msg, o.game, o.mode)) return null;
      return neutralPool(s.char, msg, humansOf(seats))[0]?.id ?? null;
    },
    reply(seat, msg, _line, to) {
      if (!sender(seat) || !msgAvailable(msg, o.game, o.mode)) return null;
      const p = planReply(msg, seat, to, seats, recent, rnd);
      if (!p) return null;
      recent.push(p.line.id);
      while (recent.length > 12) recent.shift();
      return {seat: p.seat, line: p.line.id, ms: p.delayMs};
    },
  };
}

// ───────────────────────── menü ─────────────────────────

export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  /** Bağlama uygun öneri (öne gelir, parlar). */
  hot?: boolean;
}

/** Gönderenin menüsü: karakterine göre sözler; masadaki insan avatarını anan söz nötrüne döner; eşlide takım mesajları. */
export function chatMenu(char: string, game: Game, mode: TableMode | undefined, humans: ReadonlySet<string>): MenuItem[] {
  const c = (['riza', 'cem', 'dursun', 'defne'] as const).find(x => x === char) ?? 'dursun';
  const out: MenuItem[] = [];
  for (const m of MSGS) {
    if (!msgAvailable(m.id, game, mode)) continue;
    let label = m.labels[c];
    if (humans.size && mentionsOf({id: `label:${c}:${m.id}`, char: c, text: label, tts: label}).some(x => humans.has(x))) label = NEUTRAL_LABELS[c]?.[m.id] ?? label;
    out.push({id: m.id, label, icon: m.icon});
  }
  return out;
}

/** Olay ipucu: bir olaydan hemen sonra menüde öne gelecek mesajlar. */
export type ChatCue = 'start' | 'theyScored' | 'iScored' | 'myMistake' | 'window' | 'myClaim' | 'caughtThem' | 'end';
export const CUE_PICKS: Readonly<Record<ChatCue, readonly string[]>> = {
  /** el başı */
  start: ['hello', 'team_ours', 'tea', 'trust_me'],
  /** başkası pişti / büyük alış yaptı */
  theyScored: ['wow', 'lucky', 'nice', 'oh_no'],
  /** ben pişti / büyük alış yaptım (teşekkür: kartı bırakana tatlı iğne) */
  iScored: ['tea', 'thanks', 'team_ours', 'hurry'],
  /** değerli kartımı kaptırdım / blöfüm yakalandı / boşa blöf dedim */
  myMistake: ['oops', 'team_sorry', 'oh_no', 'lucky'],
  /** Blöf: başkası attı, pencere bende */
  window: ['bluffing', 'wow', 'hurry', 'oh_no'],
  /** Blöf: ben attım, pencere onlarda */
  myClaim: ['trust_me', 'team_ours', 'wait', 'hurry'],
  /** Blöf: yalanı ben yakaladım */
  caughtThem: ['bluffing', 'tea', 'team_ours', 'thanks'],
  /** el sonu */
  end: ['gg', 'revenge', 'thanks', 'tea'],
};
/** İpucunun geçerlilik süresi (ms): bundan sonra menü varsayılan sırasına döner. */
export const CUE_TTL_MS = 9000;
export const SUGGEST_MAX = 4;

/** Menüyü ipucuna göre düzenler: uygun (en çok 4) mesaj öne + hot; kalanı varsayılan sırada. Öğe sayısı değişmez. */
export function arrange(items: readonly MenuItem[], cue: ChatCue | null): MenuItem[] {
  if (!cue) return items.map(i => ({...i}));
  const pick = CUE_PICKS[cue].filter(id => items.some(i => i.id === id)).slice(0, SUGGEST_MAX);
  const hot = pick.map(id => ({...items.find(i => i.id === id)!, hot: true}));
  return [...hot, ...items.filter(i => !pick.includes(i.id)).map(i => ({...i}))];
}

// ───────────────────────── önden indirme ─────────────────────────

/**
 * Oyuncunun söyleyiş kimlikleri, önden indirme sırasıyla: önce her mesajın EN OLASI sözü — masadaki botlara hedefli söz
 * varsa onlar, yoksa ilk nötr söz (1'e 1'de tam ≈ 12–14: hepsi çözülüp hazır tutulur) — sonra kalan nötr sözler (yalnız bayt).
 */
export function sayIdsFor(char: string, game: Game, mode: TableMode | undefined, bots: readonly string[]): string[] {
  const lead: string[] = [], rest: string[] = [];
  for (const m of MSGS) {
    if (!msgAvailable(m.id, game, mode)) continue;
    const pool = quickSayPool(char, m.id).map(l => l.id);
    const aimed = bots.filter(b => b !== char && hasTargetSay(char, m.id, b)).map(b => targetSayId(char, m.id, b));
    if (aimed.length) lead.push(...aimed), rest.push(...pool);
    else if (pool.length) lead.push(pool[0]), rest.push(...pool.slice(1));
  }
  return [...lead, ...rest].filter(id => lineById(id));
}
