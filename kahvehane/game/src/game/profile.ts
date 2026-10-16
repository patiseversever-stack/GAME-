// Oyuncu profili ve ekonomi: jeton, seviye/XP, envanter, kuşanılanlar, istatistikler, günlük ödül.
// Tek kaynak burası; ekranlar okur, satın alma/kuşanma buradan geçer. (İleride sunucuya taşınacak.)
import {store} from '../platform/bridge';
import {CATALOG, itemOf, type ItemKind} from './catalog';
import type {CharId} from './roster';
import type {Mode} from './types';

export interface ProfileData {
  v: 3;
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
  stats: {played: number; won: number; lost: number; draw: number; pisti: number; valePisti: number; streak: number; bestStreak: number; byMode: Record<Mode, {played: number; won: number}>};
  daily: {last: string; day: number};
  /** Bedava sandık: bir sonraki açılabilir zaman (ms) */
  chestAt: number;
  /** Son seçilen mod ve bahis (ana ekran hatırlar) */
  lastMode: Mode;
  lastStake: number;
  /** Günlük görevler (tarihe göre her gün yenilenir) */
  quests: {date: string; list: QuestState[]; bonus: boolean};
}

// ───────── günlük görevler ─────────
export type QuestId = 'play3' | 'pisti2' | 'cards60' | 'win2' | 'majority2' | 'mode4' | 'esli1' | 'vale1' | 'streak3' | 'pisti5' | 'cards30';
export interface QuestDef {
  id: QuestId;
  title: string;
  desc: string;
  goal: number;
  reward: number;
  /** 0 kolay · 1 orta · 2 zor — her gün her zorluktan bir görev */
  tier: 0 | 1 | 2;
  /** icons.ts anahtarı */
  icon: string;
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
];
export const QUEST_BONUS = 1000;
export const questDef = (id: QuestId): QuestDef => QUESTS.find(q => q.id === id) ?? QUESTS[0];

/** Tarihe bağlı, herkes için aynı günlük seçim (kolay + orta + zor). */
function questsFor(date: string): QuestState[] {
  let h = 2166136261;
  for (let i = 0; i < date.length; i++) h = Math.imul(h ^ date.charCodeAt(i), 16777619);
  return ([0, 1, 2] as const).map(t => {
    const pool = QUESTS.filter(q => q.tier === t);
    h = Math.imul(h ^ (h >>> 13), 0x5bd1e995);
    return {id: pool[(h >>> 0) % pool.length].id, progress: 0, claimed: false};
  });
}

/** Bir elin görevlere katkısı. */
export interface HandFacts {
  mode: Mode;
  outcome: 'win' | 'lose' | 'draw';
  pisti: number;
  valePisti: number;
  cards: number;
  majority: boolean;
}

const KEY = 'profile3';
export const DAILY_REWARDS = [200, 300, 400, 500, 650, 800, 1500];
export const xpNext = (lvl: number): number => Math.round(120 * Math.pow(lvl, 1.35));
const today = () => new Date().toISOString().slice(0, 10);

function fresh(): ProfileData {
  const starters = (k: ItemKind) => CATALOG.filter(i => i.kind === k && i.starter).map(i => i.id);
  return {
    v: 3,
    name: 'Misafir',
    level: 1,
    xp: 0,
    coins: 2500,
    char: null,
    onboarded: false,
    owned: {char: [], deck: starters('deck'), table: starters('table'), fx: starters('fx'), frame: starters('frame')},
    equipped: {deck: 'yildizli', table: 'arena', fx: 'klasik', frame: 'standart'},
    stats: {played: 0, won: 0, lost: 0, draw: 0, pisti: 0, valePisti: 0, streak: 0, bestStreak: 0,
      byMode: {'1v1': {played: 0, won: 0}, '4': {played: 0, won: 0}, esli: {played: 0, won: 0}}},
    daily: {last: '', day: 0},
    chestAt: 0,
    lastMode: '1v1',
    lastStake: 100,
    quests: {date: today(), list: questsFor(today()), bonus: false},
  };
}

/** Eksik alanları tamamla (eski kayıtlar / yeni sürüm alanları). */
function migrate(d: Partial<ProfileData> | null): ProfileData {
  const f = fresh();
  if (!d || d.v !== 3) {
    // önceki sürümden yalnız ad/jeton/seviye taşınır
    const old = store.get<{name?: string; level?: number; xp?: number; coins?: number} | null>('profile', null);
    if (old) Object.assign(f, {name: old.name ?? f.name, level: old.level ?? 1, xp: old.xp ?? 0, coins: Math.max(f.coins, old.coins ?? 0)});
    return f;
  }
  // katalogdan kaldırılmış bir ürün kuşanılıysa varsayılana dön (sahip olunanlar listesinde kalması zararsız)
  const equipped = {...f.equipped, ...d.equipped};
  for (const k of ['deck', 'table', 'fx', 'frame'] as const) if (!itemOf(k, equipped[k])) equipped[k] = f.equipped[k];
  return {
    ...f,
    ...d,
    owned: {...f.owned, ...d.owned},
    equipped,
    stats: {...f.stats, ...d.stats, byMode: {...f.stats.byMode, ...(d.stats?.byMode ?? {})}},
    daily: {...f.daily, ...d.daily},
    quests: d.quests && Array.isArray(d.quests.list) ? d.quests : f.quests,
  } as ProfileData;
}

type Listener = (p: ProfileData) => void;

export class Profile {
  readonly data: ProfileData;
  private listeners = new Set<Listener>();

  constructor() {
    this.data = migrate(store.get<Partial<ProfileData> | null>(KEY, null));
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

  /** El sonu istatistikleri. outcome: oyuncunun (veya takımının) sonucu. */
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
    this.advanceQuests({mode, outcome, pisti, valePisti, cards: extra?.cards ?? 0, majority: extra?.majority ?? false});
    this.save();
  }

  /** Bugünün görevleri (gün değiştiyse yenilenir). */
  dailyQuests(): {list: QuestState[]; bonus: boolean} {
    const d = today();
    if (this.data.quests.date !== d) {
      this.data.quests = {date: d, list: questsFor(d), bonus: false};
      this.save();
    }
    return this.data.quests;
  }

  private advanceQuests(f: HandFacts): void {
    const add = (q: QuestState, n: number) => (q.progress = Math.min(questDef(q.id).goal, q.progress + n));
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
        case 'streak3': q.progress = Math.min(3, Math.max(q.progress, this.data.stats.streak)); break;
        case 'cards30': if (f.cards >= 30) add(q, 1); break;
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
