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
  return {
    ...f,
    ...d,
    owned: {...f.owned, ...d.owned},
    equipped: {...f.equipped, ...d.equipped},
    stats: {...f.stats, ...d.stats, byMode: {...f.stats.byMode, ...(d.stats?.byMode ?? {})}},
    daily: {...f.daily, ...d.daily},
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
  recordMatch(mode: Mode, outcome: 'win' | 'lose' | 'draw', pisti: number, valePisti: number): void {
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
    this.save();
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
