// Oyuncu profili ve ekonomi: jeton, seviye/XP, envanter, kuşanılanlar, istatistikler, günlük ödül.
// Tek kaynak burası; ekranlar okur, satın alma/kuşanma buradan geçer. (İleride sunucuya taşınacak.)
import {store} from '../platform/bridge';
import {CATALOG, itemOf, type ItemKind} from './catalog';
import type {CharId} from './roster';
import type {Difficulty, Game, HandLayout, Mode} from './types';
import {DIFFICULTIES, GAMES, GAME_INFO, HAND_LAYOUTS} from './types';

/** Mod başına oynanan / kazanılan (Pişti'de '3' hep 0: Pişti üç kişi oynanmaz). */
export type ModeStats = Record<Mode, {played: number; won: number}>;

/** Pişti istatistikleri (eski kayıtlardaki `stats` aynen budur). */
export interface PistiStats {
  played: number;
  won: number;
  lost: number;
  draw: number;
  pisti: number;
  valePisti: number;
  streak: number;
  bestStreak: number;
  byMode: ModeStats;
}

/** Blöf istatistikleri: galibiyet/mod + blöf sayıları. */
export interface BlofStats {
  played: number;
  won: number;
  lost: number;
  streak: number;
  bestStreak: number;
  byMode: ModeStats;
  /** Yaptığı blöf (içinde yanlış kart olan atış) */
  bluffs: number;
  /** Yakaladığı blöf (başkasının yalanını doğru çağırdı) */
  caught: number;
  /** Kendi blöfünün yakalandığı sayı */
  timesCaught: number;
  /** Boşa blöf çağrısı (doğru çıktı) */
  wrongChallenges: number;
}

export interface ProfileData {
  v: 4;
  name: string;
  level: number;
  xp: number;
  coins: number;
  /** Seçili oyuncu karakteri (avatar). Açılış hediyesinden önce null. */
  char: CharId | null;
  /** İlk açılış hikâyesi ve hediye seçimi tamamlandı mı */
  onboarded: boolean;
  owned: Record<ItemKind, string[]>;
  equipped: {deck: string; table: string; fx: string; frame: string};
  /** Pişti istatistikleri */
  stats: PistiStats;
  /** Blöf istatistikleri */
  blof: BlofStats;
  daily: {last: string; day: number};
  /** Oyuncu ayarları (profile bağlı). blofHand: Blöf el düzeni; undefined = henüz seçmedi (ilk Blöf'te seçici açılır). */
  settings: {blofHand?: HandLayout};
  /** Bedava sandık: bir sonraki açılabilir zaman (ms) */
  chestAt: number;
  /** Ana ekranın hatırladıkları: son oyun, oyun başına son mod, Blöf zorluğu ve bahis */
  lastGame: Game;
  lastMode: Record<Game, Mode>;
  lastDifficulty: Difficulty;
  lastStake: number;
  /** Günlük görevler (tarihe göre her gün yenilenir) */
  quests: {date: string; list: QuestState[]; bonus: boolean};
}

// ───────── günlük görevler ─────────
export type QuestId = 'play3' | 'pisti2' | 'cards60' | 'win2' | 'majority2' | 'mode4' | 'esli1' | 'vale1' | 'streak3' | 'pisti5' | 'cards30'
  | 'blofCatch1' | 'blofPlay2' | 'blofWin1' | 'blofCatch3' | 'blofLie3' | 'blofStreak2';
export interface QuestDef {
  id: QuestId;
  title: string;
  desc: string;
  goal: number;
  reward: number;
  /** 0 kolay · 1 orta · 2 zor — her gün her zorluktan bir görev */
  tier: 0 | 1 | 2;
  /** icons.ts anahtarı (ya da 'mask': gameicons.ts) */
  icon: string;
  /** Yalnız bu oyunda ilerler ve yalnız oyuncu o oyunu bir kez oynadıktan sonra teklif edilir. Boşsa her oyunda geçerli. */
  game?: Game;
}
export interface QuestState {
  id: QuestId;
  progress: number;
  claimed: boolean;
}
export const QUESTS: readonly QuestDef[] = [
  {id: 'play3', title: 'Isınma Turu', desc: '3 el oyna', goal: 3, reward: 250, tier: 0, icon: 'cards'},
  {id: 'pisti2', title: 'Pişti Avcısı', desc: '2 pişti yap', goal: 2, reward: 350, tier: 0, icon: 'target'},
  {id: 'cards60', title: 'Kart Toplayıcı', desc: 'Toplam 60 kart topla', goal: 60, reward: 300, tier: 0, icon: 'fan'},
  {id: 'win2', title: 'Kazanan Masa', desc: '2 el kazan', goal: 2, reward: 500, tier: 1, icon: 'crown'},
  {id: 'majority2', title: 'Çoğunluk Benim', desc: '2 elde en çok kartı topla', goal: 2, reward: 450, tier: 1, icon: 'grid'},
  {id: 'mode4', title: 'Kalabalık Masa', desc: '4 Kişi modunda 2 el oyna', goal: 2, reward: 400, tier: 1, icon: 'friends'},
  {id: 'esli1', title: 'Ortaklık', desc: 'Eşli modda 1 el kazan', goal: 1, reward: 500, tier: 1, icon: 'swords'},
  {id: 'vale1', title: 'Vale Ustası', desc: '1 Vale Pişti yap', goal: 1, reward: 800, tier: 2, icon: 'sparkle'},
  {id: 'streak3', title: 'Yenilmez', desc: 'Üst üste 3 el kazan', goal: 3, reward: 900, tier: 2, icon: 'flame'},
  {id: 'pisti5', title: 'Pişti Kralı', desc: 'Bugün 5 pişti yap', goal: 5, reward: 750, tier: 2, icon: 'star'},
  {id: 'cards30', title: 'Masayı Sildim', desc: 'Tek elde 30+ kart topla', goal: 1, reward: 700, tier: 2, icon: 'shuffle'},
  // ---- Blöf (yalnız Blöf'ü bir kez oynamış oyuncuya teklif edilir; havuzun SONUNA eklenir: Pişti oyuncusunun günlük seçimi değişmez) ----
  {id: 'blofCatch1', title: 'Keskin Göz', desc: 'Bir blöf yakala', goal: 1, reward: 300, tier: 0, icon: 'target', game: 'blof'},
  {id: 'blofPlay2', title: 'Maskeli Masa', desc: "Blöf'te 2 el oyna", goal: 2, reward: 250, tier: 0, icon: 'mask', game: 'blof'},
  {id: 'blofWin1', title: 'Yalan Dolan', desc: "Blöf'te 1 el kazan", goal: 1, reward: 500, tier: 1, icon: 'crown', game: 'blof'},
  {id: 'blofCatch3', title: 'Avcı Gözü', desc: 'Bugün 3 blöf yakala', goal: 3, reward: 450, tier: 1, icon: 'swords', game: 'blof'},
  {id: 'blofLie3', title: 'Poker Yüzü', desc: 'Yakalanmadan 3 blöf yap', goal: 3, reward: 800, tier: 2, icon: 'mask', game: 'blof'},
  {id: 'blofStreak2', title: 'Usta Blöfçü', desc: "Blöf'te üst üste 2 el kazan", goal: 2, reward: 900, tier: 2, icon: 'flame', game: 'blof'},
];
export const QUEST_BONUS = 1000;
export const questDef = (id: QuestId): QuestDef => QUESTS.find(q => q.id === id) ?? QUESTS[0];

/** Tarihe bağlı günlük seçim (kolay + orta + zor). blof: Blöf görevleri havuza girer (oyuncu Blöf'ü en az bir kez oynadıysa). */
export function questsFor(date: string, blof = false): QuestState[] {
  let h = 2166136261;
  for (let i = 0; i < date.length; i++) h = Math.imul(h ^ date.charCodeAt(i), 16777619);
  return ([0, 1, 2] as const).map(t => {
    const pool = QUESTS.filter(q => q.tier === t && (!q.game || (q.game === 'blof' && blof)));
    h = Math.imul(h ^ (h >>> 13), 0x5bd1e995);
    return {id: pool[(h >>> 0) % pool.length].id, progress: 0, claimed: false};
  });
}

/** Bir elin görevlere katkısı. */
export interface HandFacts {
  game: Game;
  mode: Mode;
  outcome: 'win' | 'lose' | 'draw';
  pisti: number;
  valePisti: number;
  cards: number;
  majority: boolean;
  /** Yalnız Blöf: elin sayıları */
  blof?: BlofHandFacts;
}
/** Blöf elinde insan oyuncunun sayıları. */
export interface BlofHandFacts {
  /** Yaptığı blöf */
  bluffs: number;
  /** Yakaladığı blöf */
  caught: number;
  /** Kendi blöfünün yakalanma sayısı */
  timesCaught: number;
  /** Boşa blöf çağrısı */
  wrongChallenges: number;
}

/** Kayıt anahtarı sürümler arasında aynı kalır (şema sürümü `v` alanında). */
const KEY = 'profile3';
export const DAILY_REWARDS = [200, 300, 400, 500, 650, 800, 1500];
export const xpNext = (lvl: number): number => Math.round(120 * Math.pow(lvl, 1.35));
const today = () => new Date().toISOString().slice(0, 10);

const emptyModes = (): ModeStats => ({'1v1': {played: 0, won: 0}, '3': {played: 0, won: 0}, '4': {played: 0, won: 0}, esli: {played: 0, won: 0}});

export function fresh(): ProfileData {
  const starters = (k: ItemKind) => CATALOG.filter(i => i.kind === k && i.starter).map(i => i.id);
  return {
    v: 4,
    name: 'Misafir',
    level: 1,
    xp: 0,
    coins: 2500,
    char: null,
    onboarded: false,
    owned: {char: [], deck: starters('deck'), table: starters('table'), fx: starters('fx'), frame: starters('frame')},
    equipped: {deck: 'yildizli', table: 'arena', fx: 'klasik', frame: 'standart'},
    stats: {played: 0, won: 0, lost: 0, draw: 0, pisti: 0, valePisti: 0, streak: 0, bestStreak: 0, byMode: emptyModes()},
    blof: {played: 0, won: 0, lost: 0, streak: 0, bestStreak: 0, byMode: emptyModes(), bluffs: 0, caught: 0, timesCaught: 0, wrongChallenges: 0},
    daily: {last: '', day: 0},
    settings: {},
    chestAt: 0,
    lastGame: 'pisti',
    lastMode: {pisti: '1v1', blof: '3'},
    lastDifficulty: 'orta',
    lastStake: 100,
    quests: {date: today(), list: questsFor(today()), bonus: false},
  };
}

/** Sayı alanı: sonlu, negatif olmayan tam sayı; değilse varsayılan. */
const nat = (v: unknown, def: number): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : def);
const isRec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Mod başına sayaçlar: bilinmeyen/bozuk girdiler atılır, eksikler 0. */
function mergeModes(base: ModeStats, raw: unknown): ModeStats {
  const out = emptyModes();
  for (const m of Object.keys(out) as Mode[]) {
    const r = isRec(raw) && isRec(raw[m]) ? raw[m] : base[m];
    out[m] = {played: nat(r.played, 0), won: nat(r.won, 0)};
  }
  return out;
}

function mergePisti(f: PistiStats, raw: unknown): PistiStats {
  const r = isRec(raw) ? raw : {};
  return {
    played: nat(r.played, f.played), won: nat(r.won, f.won), lost: nat(r.lost, f.lost), draw: nat(r.draw, f.draw),
    pisti: nat(r.pisti, f.pisti), valePisti: nat(r.valePisti, f.valePisti), streak: nat(r.streak, f.streak), bestStreak: nat(r.bestStreak, f.bestStreak),
    byMode: mergeModes(f.byMode, r.byMode),
  };
}

function mergeBlof(f: BlofStats, raw: unknown): BlofStats {
  const r = isRec(raw) ? raw : {};
  return {
    played: nat(r.played, f.played), won: nat(r.won, f.won), lost: nat(r.lost, f.lost), streak: nat(r.streak, f.streak), bestStreak: nat(r.bestStreak, f.bestStreak),
    byMode: mergeModes(f.byMode, r.byMode),
    bluffs: nat(r.bluffs, f.bluffs), caught: nat(r.caught, f.caught), timesCaught: nat(r.timesCaught, f.timesCaught), wrongChallenges: nat(r.wrongChallenges, f.wrongChallenges),
  };
}

/**
 * Kayıttan profil kur. v3 (yalnız Pişti) kayıtları: mevcut `stats` Pişti istatistiğidir ve aynen korunur; Blöf istatistiği sıfırdan başlar;
 * tek `lastMode` metni Pişti'nin modu olur. v öncesi (eski `profile` anahtarı) yalnız ad/jeton/seviye taşır. Bozuk alanlar varsayılana döner.
 * legacy: eski `profile` anahtarının içeriği (varsa).
 */
export function migrateProfile(d: unknown, legacy: {name?: string; level?: number; xp?: number; coins?: number} | null = null): ProfileData {
  const f = fresh();
  if (!isRec(d) || (d.v !== 3 && d.v !== 4)) {
    // önceki sürümden yalnız ad/jeton/seviye taşınır
    if (legacy) Object.assign(f, {name: legacy.name ?? f.name, level: legacy.level ?? 1, xp: legacy.xp ?? 0, coins: Math.max(f.coins, legacy.coins ?? 0)});
    return f;
  }
  const raw = d as Partial<ProfileData> & Record<string, unknown>;
  // katalogdan kaldırılmış bir ürün kuşanılıysa varsayılana dön (sahip olunanlar listesinde kalması zararsız)
  const equipped = {...f.equipped, ...(isRec(raw.equipped) ? raw.equipped : {})};
  for (const k of ['deck', 'table', 'fx', 'frame'] as const) if (!itemOf(k, equipped[k])) equipped[k] = f.equipped[k];
  // oyun/mod hatırası: v3'te lastMode tek metindi (Pişti)
  const modeOk = (g: Game, m: unknown): Mode => (typeof m === 'string' && GAME_INFO[g].modes.includes(m as Mode) ? (m as Mode) : f.lastMode[g]);
  const lm = raw.lastMode as unknown;
  const lastMode: Record<Game, Mode> = isRec(lm)
    ? {pisti: modeOk('pisti', lm.pisti), blof: modeOk('blof', lm.blof)}
    : {pisti: modeOk('pisti', lm), blof: f.lastMode.blof};
  const out = {
    ...f,
    ...raw,
    v: 4,
    owned: {...f.owned, ...(isRec(raw.owned) ? raw.owned : {})},
    equipped,
    stats: mergePisti(f.stats, raw.stats),
    blof: mergeBlof(f.blof, raw.blof),
    daily: {...f.daily, ...(isRec(raw.daily) ? raw.daily : {})},
    // yeni alan: eski kayıtlarda yok → seçilmemiş (undefined); bozuk değer de seçilmemiş sayılır
    settings: isRec(raw.settings) && HAND_LAYOUTS.includes(raw.settings.blofHand as HandLayout) ? {blofHand: raw.settings.blofHand as HandLayout} : {},
    lastGame: GAMES.includes(raw.lastGame as Game) ? (raw.lastGame as Game) : 'pisti',
    lastMode,
    lastDifficulty: DIFFICULTIES.includes(raw.lastDifficulty as Difficulty) ? (raw.lastDifficulty as Difficulty) : 'orta',
    quests: isRec(raw.quests) && Array.isArray(raw.quests.list) ? raw.quests : f.quests,
  } as ProfileData;
  return out;
}

type Listener = (p: ProfileData) => void;

export class Profile {
  readonly data: ProfileData;
  private listeners = new Set<Listener>();

  constructor() {
    const raw = store.get<unknown>(KEY, null);
    this.data = migrateProfile(raw, store.get<{name?: string; level?: number; xp?: number; coins?: number} | null>('profile', null));
    this.save();
  }

  save(): void {
    store.set(KEY, this.data);
    this.listeners.forEach(f => f(this.data));
  }

  /** Profil değişince çağrılır (jeton sayaçları vb.). Aboneliği kaldıran fonksiyon döner. */
  subscribe(f: Listener): () => void {
    this.listeners.add(f);
    return () => this.listeners.delete(f);
  }

  get xpNext(): number {
    return xpNext(this.data.level);
  }

  owns(kind: ItemKind, id: string): boolean {
    return this.data.owned[kind].includes(id);
  }

  /** Ücretsiz verme (hediye, sandık, ödül). */
  grant(kind: ItemKind, id: string): void {
    if (!this.owns(kind, id)) this.data.owned[kind].push(id);
    this.save();
  }

  addCoins(n: number): void {
    this.data.coins = Math.max(0, this.data.coins + Math.round(n));
    this.save();
  }

  /** Satın al: yetersiz jetonda 'poor', zaten varsa 'owned', başarıda 'ok'. */
  buy(kind: ItemKind, id: string): 'ok' | 'poor' | 'owned' | 'missing' {
    const it = itemOf(kind, id);
    if (!it) return 'missing';
    if (this.owns(kind, id)) return 'owned';
    if (this.data.coins < it.price) return 'poor';
    this.data.coins -= it.price;
    this.data.owned[kind].push(id);
    this.save();
    return 'ok';
  }

  /** Kuşan (karakter için avatarı değiştirir). Sahip değilse false. */
  equip(kind: ItemKind, id: string): boolean {
    if (!this.owns(kind, id)) return false;
    if (kind === 'char') this.data.char = id as CharId;
    else this.data.equipped[kind] = id;
    this.save();
    return true;
  }

  /** Açılış hediyesi: karakter verilir, avatar yapılır, açılış tamamlanır. */
  completeOnboarding(char: CharId, name: string): void {
    this.data.char = char;
    if (!this.owns('char', char)) this.data.owned.char.push(char);
    if (name.trim()) this.data.name = name.trim().slice(0, 16);
    this.data.onboarded = true;
    this.save();
  }

  /** XP ekle; atlanan seviye sayısını döner (seviye ödülü: her seviyede 250 × seviye jeton). */
  addXp(n: number): {levels: number; reward: number} {
    this.data.xp += Math.round(n);
    let levels = 0, reward = 0;
    while (this.data.xp >= xpNext(this.data.level)) {
      this.data.xp -= xpNext(this.data.level);
      this.data.level++;
      levels++;
      reward += 250 * this.data.level;
    }
    this.data.coins += reward;
    this.save();
    return {levels, reward};
  }

  /** Pişti el sonu istatistikleri. outcome: oyuncunun (veya takımının) sonucu. */
  recordMatch(mode: Mode, outcome: 'win' | 'lose' | 'draw', pisti: number, valePisti: number, extra?: {cards: number; majority: boolean}): void {
    const s = this.data.stats;
    s.played++;
    s.byMode[mode].played++;
    if (outcome === 'win') {
      s.won++;
      s.byMode[mode].won++;
      s.streak++;
      s.bestStreak = Math.max(s.bestStreak, s.streak);
    } else {
      if (outcome === 'lose') s.lost++;
      else s.draw++;
      s.streak = 0;
    }
    s.pisti += pisti;
    s.valePisti += valePisti;
    this.advanceQuests({game: 'pisti', mode, outcome, pisti, valePisti, cards: extra?.cards ?? 0, majority: extra?.majority ?? false});
    this.save();
  }

  /** Blöf el sonu istatistikleri (beraberlik yok: ilk bitiren kazanır). */
  recordBlof(mode: Mode, outcome: 'win' | 'lose', x: BlofHandFacts): void {
    const s = this.data.blof;
    s.played++;
    s.byMode[mode].played++;
    if (outcome === 'win') {
      s.won++;
      s.byMode[mode].won++;
      s.streak++;
      s.bestStreak = Math.max(s.bestStreak, s.streak);
    } else {
      s.lost++;
      s.streak = 0;
    }
    s.bluffs += x.bluffs;
    s.caught += x.caught;
    s.timesCaught += x.timesCaught;
    s.wrongChallenges += x.wrongChallenges;
    this.advanceQuests({game: 'blof', mode, outcome, pisti: 0, valePisti: 0, cards: 0, majority: false, blof: x});
    this.save();
  }

  /** Oyuncu Blöf'ü en az bir kez oynadı mı (Blöf görevleri ve ana ekran ipuçları buna bakar). */
  get playedBlof(): boolean {
    return this.data.blof.played > 0;
  }

  /** Bir oyunun özet sayıları (profil sayfası ve ana ekran için). */
  gameStats(game: Game): {played: number; won: number; lost: number; streak: number; bestStreak: number; byMode: ModeStats} {
    return game === 'blof' ? this.data.blof : this.data.stats;
  }

  /** Bugünün görevleri (gün değiştiyse yenilenir). */
  dailyQuests(): {list: QuestState[]; bonus: boolean} {
    const d = today();
    if (this.data.quests.date !== d) {
      this.data.quests = {date: d, list: questsFor(d, this.playedBlof), bonus: false};
      this.save();
    }
    return this.data.quests;
  }

  private advanceQuests(f: HandFacts): void {
    const add = (q: QuestState, n: number) => (q.progress = Math.min(questDef(q.id).goal, q.progress + n));
    const blof = f.game === 'blof';
    const b = f.blof;
    for (const q of this.dailyQuests().list) {
      if (q.claimed) continue;
      switch (q.id) {
        case 'play3': add(q, 1); break;
        case 'pisti2': case 'pisti5': add(q, f.pisti); break;
        case 'cards60': add(q, f.cards); break;
        case 'win2': if (f.outcome === 'win') add(q, 1); break;
        case 'majority2': if (f.majority) add(q, 1); break;
        case 'mode4': if (f.mode === '4') add(q, 1); break;
        case 'esli1': if (f.mode === 'esli' && f.outcome === 'win') add(q, 1); break;
        case 'vale1': add(q, f.valePisti); break;
        case 'streak3': q.progress = Math.min(3, Math.max(q.progress, blof ? this.data.blof.streak : this.data.stats.streak)); break;
        case 'cards30': if (f.cards >= 30) add(q, 1); break;
        // ---- Blöf ----
        case 'blofCatch1': case 'blofCatch3': if (blof && b) add(q, b.caught); break;
        case 'blofPlay2': if (blof) add(q, 1); break;
        case 'blofWin1': if (blof && f.outcome === 'win') add(q, 1); break;
        // "yakalanmadan": hiç yakalanmadığın ellerde yaptığın blöfler sayılır
        case 'blofLie3': if (blof && b && b.timesCaught === 0) add(q, b.bluffs); break;
        case 'blofStreak2': if (blof) q.progress = Math.min(2, Math.max(q.progress, this.data.blof.streak)); break;
      }
    }
  }

  /** Tamamlanmış ama alınmamış görev/bonus sayısı (menü rozeti için). */
  questsReady(): number {
    const qs = this.dailyQuests();
    const done = qs.list.filter(q => !q.claimed && q.progress >= questDef(q.id).goal).length;
    return done + (this.bonusReady() ? 1 : 0);
  }

  /** Görev ödülünü al; tamamlanmadıysa 0. */
  claimQuest(id: QuestId): number {
    const q = this.dailyQuests().list.find(x => x.id === id);
    if (!q || q.claimed || q.progress < questDef(id).goal) return 0;
    q.claimed = true;
    const r = questDef(id).reward;
    this.data.coins += r;
    this.save();
    return r;
  }

  bonusReady(): boolean {
    const qs = this.dailyQuests();
    return !qs.bonus && qs.list.every(q => q.claimed);
  }

  claimQuestBonus(): number {
    if (!this.bonusReady()) return 0;
    this.data.quests.bonus = true;
    this.data.coins += QUEST_BONUS;
    this.save();
    return QUEST_BONUS;
  }

  dailyReady(): boolean {
    return this.data.daily.last !== today();
  }

  /** Günlük ödülü al: {gün (1..7), miktar}. Bugün alındıysa null. */
  claimDaily(): {day: number; amount: number} | null {
    if (!this.dailyReady()) return null;
    const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    const day = this.data.daily.last === y ? (this.data.daily.day % 7) + 1 : 1;
    const amount = DAILY_REWARDS[day - 1];
    this.data.daily = {last: today(), day};
    this.data.coins += amount;
    this.save();
    return {day, amount};
  }

  /** Bir sonraki günlük ödülün günü (1..7) — ödül penceresinde göstermek için. */
  nextDailyDay(): number {
    const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    return this.data.daily.last === y ? (this.data.daily.day % 7) + 1 : this.data.daily.last === today() ? this.data.daily.day : 1;
  }

  /** Bedava sandık: 4 saatte bir. */
  chestReady(now = Date.now()): boolean {
    return now >= this.data.chestAt;
  }
  openChest(now = Date.now()): number {
    if (!this.chestReady(now)) return 0;
    const amount = 150 + Math.round(Math.random() * 6) * 50;
    this.data.chestAt = now + 4 * 3600e3;
    this.data.coins += amount;
    this.save();
    return amount;
  }
}
