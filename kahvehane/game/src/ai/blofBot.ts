// Blöf botu: yalnız kendi koltuğunun görünümü (BlofView) ve kendisine süzülmüş olaylarla karar verir —
// gizli duruma asla bakmaz; bu yüzden aynı bot çevrimiçinde sunucuda boş koltuğu doldurabilir (oyun ortasında
// devralsa bile: geçmişi görmediyse en temkinli varsayımla başlar).
//
// Bilgi modeli: her kart için "olası yerler" bit maskesi (koltuk 0–3, yığın, kenar). Yalnız KESİN bilgiyle daraltılır
// (kendi elim, kendi attığım kartlar, açılan kartlar ve gittiği yer, yığının kime gittiği). Unutmak = maskeyi genişletmek
// (hep güvenli). Blöf olasılığı bu maskelerden ve el sayılarından hesaplanır.
//
// Zorluk (karakterler aynı, yalnız zorluk farkı):
//  kolay — yalnız kendi eline bakar, sık sık blöf yapar, nadiren ve geç "Blöf!" der, son kartta bile kaçırabilir, ele verir.
//  orta  — kart sayar (çoğunu hatırlar), riski yığın büyüklüğüyle tartar, son kartı nadiren kaçırır.
//  zor   — her şeyi hatırlar, turdaki iddiaları da hesaba katar, bitirmeye yakın rakibi sıkıştırır, az ele verir.
import type {BotBrain, BotDecision} from '../core/game';
import {mulberry32} from '../core/rng';
import {rankOf} from '../core/types';
import {BLOF_MAX_PLAY, type BlofAction, type BlofEvent, type BlofTell, type BlofView, type CardId} from '../core/blofTypes';

export type BlofDifficulty = 'kolay' | 'orta' | 'zor';
export const BLOF_DIFFICULTIES: readonly BlofDifficulty[] = ['kolay', 'orta', 'zor'];

export interface BlofBotParams {
  /** 0..1: açılan/alınan kartların yerini hatırlama olasılığı (unutunca maske genişler). */
  memory: number;
  /** Maskelerle kart sayar mı (false: yalnız kendi eli). */
  counting: boolean;
  /** Turdaki önceki iddiaları da hesaba katar mı. */
  claims: boolean;
  /** Yığın küçükken açışta araya fazladan (yalan) kart katma eğilimi. */
  greed: number;
  /** Elinde o değer yokken blöf yapma isteği (değer çarpanı). */
  bluffLove: number;
  /** Yakalanma riskine duyarlılık (1'e 1 / kalabalık masa). */
  caution: number;
  cautionN: number;
  /** Karar gürültüsü (beklenen değere eklenen sapmanın ölçeği). */
  noise: number;
  /** "Blöf!" deme eşiği kayması (+: daha şüpheci). */
  suspicion: number;
  /** Son kartlarını atan rakibe "Blöf!" deme olasılığı. */
  finalCatch: number;
  /** Kesin yalanı (kendi elinden) fark etme olasılığı. */
  notice: number;
  /** Blöfte gergin görünme olasılığı / doğruyken gergin görünme olasılığı / blöfte sırıtma (taklit). */
  tellLeak: number;
  tellFake: number;
  tellMask: number;
  /** Bekleme aralıkları (ms): hamle düşünme, şüpheli "Blöf!", kesin "Blöf!", "geç". */
  think: [number, number];
  react: [number, number];
  sure: [number, number];
  decline: [number, number];
  /** Blöf yaparken fazladan duraksama (ms) — zamanlama ipucu; zor bot saklar. */
  hesitate: [number, number];
  /** Turu açmanın değeri (kart cinsinden): 1'e 1'de / kalabalık masada. Pas ve blöf kararlarını tartar. */
  tempo2: number;
  tempoN: number;
  /** Eşli masada (takım arkadaşı varken) üzerine yazılan ayarlar. */
  team?: Partial<Omit<BlofBotParams, 'team'>>;
}

export const BLOF_BOT_PARAMS: Record<BlofDifficulty, BlofBotParams> = {
  kolay: {
    memory: 0.3,
    counting: false,
    claims: false,
    greed: 0.15,
    bluffLove: 1.15,
    caution: 0.6,
    cautionN: 0.6,
    noise: 1.1,
    suspicion: -0.4,
    finalCatch: 0.7,
    notice: 0.55,
    tellLeak: 0.65,
    tellFake: 0.1,
    tellMask: 0.02,
    think: [1000, 2300],
    react: [1500, 3800],
    sure: [1200, 3000],
    decline: [700, 2000],
    hesitate: [300, 900],
    tempo2: 1,
    tempoN: 0.5,
  },
  orta: {
    memory: 0.75,
    counting: true,
    claims: false,
    greed: 0.3,
    bluffLove: 1,
    caution: 0.6,
    cautionN: 1.2,
    noise: 0.45,
    suspicion: 0,
    finalCatch: 0.93,
    notice: 0.95,
    tellLeak: 0.4,
    tellFake: 0.12,
    tellMask: 0.08,
    think: [800, 1900],
    react: [1000, 3000],
    sure: [700, 1600],
    decline: [500, 1500],
    hesitate: [100, 500],
    tempo2: 4,
    tempoN: 0.5,
  },
  zor: {
    memory: 1,
    counting: true,
    claims: true,
    greed: 0.45,
    bluffLove: 1.3,
    caution: 0.6,
    cautionN: 0.6,
    noise: 0.12,
    suspicion: 0,
    finalCatch: 1,
    notice: 1,
    tellLeak: 0.2,
    tellFake: 0.15,
    tellMask: 0.2,
    think: [700, 1700],
    react: [800, 2600],
    sure: [450, 1100],
    decline: [400, 1300],
    hesitate: [0, 0],
    tempo2: 5,
    tempoN: 1.5,
    team: {cautionN: 1.2, tempoN: 0.5, bluffLove: 1.6},
  },
};

const PILE = 16;
const DISC = 32;
const SLOT_PILE = 4;
const SLOT_DISC = 5;
const bit = (seat: number): number => 1 << seat;
/** Takipçinin elinde o değer yokken k kart iddia etme eğilimi (k = 1..4). */
const BLUFF_K = [0, 0.4, 0.25, 0.1, 0.05];

export class BlofBot implements BotBrain<BlofAction, BlofEvent, BlofView, BlofTell> {
  readonly seat: number;
  readonly difficulty: BlofDifficulty;
  private p: BlofBotParams;
  private readonly base: BlofBotParams;
  private teamMode = false;
  private readonly rnd: () => number;
  /** Kart başına olası yerler. */
  private readonly loc = new Uint8Array(52);
  /** Son rakip atışından hemen önceki maskeler (pencere kararı atandan önceki ele bakar). */
  private readonly pre = new Uint8Array(52);
  /**
   * "Muhtemel sahip": kesin bildiğim bir kartı (ör. aldığı yığından) o koltuk sonra kart atınca maske genişler
   * (hangi kartları attığını bilemem) ama kart büyük olasılıkla hâlâ onda — iddia edilen değerde değilse.
   * −1: yok. Kesinlik denetiminde kullanılmaz, yalnız olasılıkta.
   */
  private readonly likely = new Int8Array(52).fill(-1);
  private readonly preLikely = new Int8Array(52).fill(-1);
  private inited = false;
  private others = 0; // diğer koltukların bitleri
  // karar sırasında yeniden kullanılan tamponlar
  private readonly cnt = new Int8Array(14);
  private readonly slots = new Float64Array(6);
  private readonly exact = new Int16Array(6);
  private readonly prob = new Float64Array(5);
  private readonly dist = new Float64Array(5);
  /** Rakip modeli (kamuya açık): koltuk başına blöf diyebildiği pencere sayısı ve dediği blöf sayısı. */
  private readonly eligibleN = new Float64Array(4);
  private readonly challengedN = new Float64Array(4);
  private readonly soft = new Int16Array(6);

  constructor(seat: number, difficulty: BlofDifficulty = 'orta', seed: number | (() => number) = seat * 7919 + 17, params?: Partial<BlofBotParams>) {
    this.seat = seat;
    this.difficulty = difficulty;
    this.base = {...BLOF_BOT_PARAMS[difficulty], ...params};
    this.p = this.base;
    this.rnd = typeof seed === 'function' ? seed : mulberry32(seed);
  }

  /** Bu kartın olası yerleri (bit maskesi; test ve hata ayıklama için). */
  possible(card: CardId): number {
    return this.loc[card];
  }

  // ─────────────── Gözlem ───────────────

  private init(seats: number, hand: readonly CardId[], pileCount: number, discardCount: number, teams?: readonly number[]): void {
    if (teams) this.setTeams(teams);
    this.others = 0;
    for (let s = 0; s < seats; s++) if (s !== this.seat) this.others |= bit(s);
    const unknown = this.others | (pileCount > 0 ? PILE : 0) | (discardCount > 0 ? DISC : 0);
    this.loc.fill(unknown);
    for (const c of hand) this.loc[c] = bit(this.seat);
    this.pre.set(this.loc);
    this.likely.fill(-1);
    this.preLikely.fill(-1);
    this.inited = true;
  }

  /** Unutma: kesin bilgiyi bırakıp maskeyi genişletir (her zaman güvenli). */
  private forget(c: CardId): void {
    this.loc[c] = this.loc[c] | this.others | PILE | DISC;
    this.likely[c] = -1;
  }

  observe(e: BlofEvent): void {
    const me = this.seat;
    switch (e.t) {
      case 'deal': {
        const hand = e.hands[me] ?? [];
        this.init(e.counts.length, hand, 0, 0);
        break;
      }
      case 'opened':
      case 'played': {
        if (!this.inited) return;
        if (e.seat === me && e.cards) {
          for (const c of e.cards) {
            this.loc[c] = PILE;
            this.likely[c] = -1;
          }
        } else {
          this.pre.set(this.loc);
          this.preLikely.set(this.likely);
          const b = bit(e.seat);
          for (let c = 0; c < 52; c++) {
            if (!(this.loc[c] & b)) continue;
            this.loc[c] |= PILE;
            // Bildiğim kart iddia edilen değerdeyse muhtemelen şimdi atıldı.
            if (this.likely[c] === e.seat && rankOf(c) === e.rank) this.likely[c] = -1;
          }
          if (e.handCount === 0)
            for (let c = 0; c < 52; c++)
              if (this.loc[c] & b) {
                this.loc[c] &= ~b;
                if (this.likely[c] === e.seat) this.likely[c] = -1;
              }
        }
        break;
      }
      case 'reveal':
        if (!this.inited) return;
        for (const c of e.cards) {
          this.loc[c] = PILE;
          this.likely[c] = -1;
        }
        break;
      case 'pileTaken': {
        if (!this.inited) return;
        const b = bit(e.seat);
        if (e.seat === me && e.cards) {
          const took = new Uint8Array(52);
          for (const c of e.cards) took[c] = 1;
          for (let c = 0; c < 52; c++) {
            if (took[c]) {
              this.loc[c] = b;
              this.likely[c] = -1;
            } else if (this.loc[c] & PILE) {
              this.loc[c] &= ~PILE;
              if (this.loc[c] === 0) this.loc[c] = this.others | DISC;
            }
          }
        } else {
          for (let c = 0; c < 52; c++) {
            const m = this.loc[c];
            if (!(m & PILE)) continue;
            this.loc[c] = (m & ~PILE) | b;
            if (m === PILE) this.likely[c] = e.seat; // kesin yığındaydı → kesin onda
            if (this.rnd() >= this.p.memory) this.forget(c);
          }
        }
        break;
      }
      case 'windowOpen':
        for (const s of e.eligible) if (s !== me) this.eligibleN[s]++;
        break;
      case 'challenged':
        if (e.by !== me) this.challengedN[e.by]++;
        break;
      case 'pileCleared':
        if (!this.inited) return;
        for (let c = 0; c < 52; c++) {
          const m = this.loc[c];
          if (m & PILE) this.loc[c] = (m & ~PILE) | DISC;
        }
        break;
      default:
        break;
    }
  }

  /** Görünümle tutarlılaştırma: kendi elim kesin; boş yerler elenir; kesin sayısı dolan yere başka kart giremez. */
  /** Takım arkadaşım varsa eşli ayarlarına geç. */
  private setTeams(teams: readonly number[]): void {
    const mate = teams.some((t, i) => i !== this.seat && t === teams[this.seat]);
    if (mate === this.teamMode) return;
    this.teamMode = mate;
    this.p = mate && this.base.team ? {...this.base, ...this.base.team} : this.base;
  }

  private refine(v: BlofView): void {
    if (!this.inited) this.init(v.seats, v.hand, v.pileCount, v.discardCount);
    this.setTeams(v.teams);
    const me = bit(this.seat);
    const loc = this.loc;
    for (let c = 0; c < 52; c++) {
      if (!(loc[c] & me)) continue;
      loc[c] &= ~me;
      if (loc[c] === 0) loc[c] = this.others | PILE | DISC; // elimden çıkmış ama nereye gittiğini görmedim
    }
    for (const c of v.hand) {
      loc[c] = me;
      this.likely[c] = -1;
    }
    for (let c = 0; c < 52; c++) {
      const l = this.likely[c];
      if (l >= 0 && !(loc[c] & bit(l))) this.likely[c] = -1;
    }
    let drop = 0;
    for (let s = 0; s < v.seats; s++) if (s !== this.seat && v.handCounts[s] === 0) drop |= bit(s);
    if (v.pileCount === 0) drop |= PILE;
    if (v.discardCount === 0) drop |= DISC;
    // Kesin sayısı kapasiteye ulaşan yerler
    const ex = this.exact;
    ex.fill(0);
    for (let c = 0; c < 52; c++) {
      const m = loc[c];
      if (m === 0 || m === me || (m & (m - 1)) !== 0) continue;
      ex[m === PILE ? SLOT_PILE : m === DISC ? SLOT_DISC : Math.log2(m) | 0]++;
    }
    for (let s = 0; s < v.seats; s++) if (s !== this.seat && ex[s] >= v.handCounts[s]) drop |= bit(s);
    if (ex[SLOT_PILE] >= v.pileCount) drop |= PILE;
    if (ex[SLOT_DISC] >= v.discardCount) drop |= DISC;
    if (drop === 0) return;
    for (let c = 0; c < 52; c++) {
      const m = loc[c];
      if (m === me) continue;
      const single = (m & (m - 1)) === 0;
      if (single) continue; // kesin bilgi kendi yerini işgal eder
      const n = m & ~drop;
      loc[c] = n !== 0 ? n : this.others | PILE | DISC; // çelişki: temkinli genişlet
    }
  }

  // ─────────────── Karar ───────────────

  decide(v: BlofView): BotDecision<BlofAction, BlofTell> | null {
    if (v.over || v.seat !== this.seat) return null;
    this.refine(v);
    if (v.canChallenge && v.window) return this.decideWindow(v);
    if (v.myTurn) return this.decideTurn(v);
    return null;
  }

  private range(r: [number, number]): number {
    return r[0] + this.rnd() * (r[1] - r[0]);
  }

  /** Yaklaşık normal gürültü. */
  private gauss(): number {
    return (this.rnd() + this.rnd() + this.rnd() - 1.5) * 2;
  }

  private opponents(v: BlofView): number[] {
    const out: number[] = [];
    for (let s = 0; s < v.seats; s++) if (v.teams[s] !== v.teams[this.seat]) out.push(s);
    return out;
  }

  /**
   * Atanın (atıştan ÖNCEKİ elinde) bu değerden kaç kart tuttuğunun dağılımı → this.dist[0..4] (bağımsız yaklaşık).
   * possible: atanın elinde olabilecek kopya sayısı (kesin üst sınır).
   */
  private holdDist(v: BlofView, x: number, rank: number, count: number, othersClaims: number): number {
    const pre = this.pre;
    const bx = bit(x);
    const slots = this.slots;
    const ex = this.exact;
    const soft = this.soft;
    ex.fill(0);
    soft.fill(0);
    for (let c = 0; c < 52; c++) {
      const m = pre[c];
      if (m === 0) continue;
      if ((m & (m - 1)) === 0) ex[m === PILE ? SLOT_PILE : m === DISC ? SLOT_DISC : Math.log2(m) | 0]++;
      else if (this.preLikely[c] >= 0) soft[this.preLikely[c]]++;
    }
    for (let s = 0; s < v.seats; s++) {
      slots[s] = s === this.seat ? 0 : Math.max(0, v.handCounts[s] + (s === x ? count : 0) - ex[s] - soft[s]);
    }
    slots[SLOT_PILE] = Math.max(0, v.pileCount - count - ex[SLOT_PILE]);
    slots[SLOT_DISC] = Math.max(0, v.discardCount - ex[SLOT_DISC]);

    const prob = this.prob;
    let k = 0;
    for (let suit = 0; suit < 4; suit++) {
      const c = suit * 13 + rank - 1;
      const m = pre[c];
      if (!(m & bx)) continue;
      let pc: number;
      if (m === bx) pc = 1;
      else if (this.preLikely[c] === x) pc = 0.88;
      else if (this.preLikely[c] >= 0) pc = 0.06;
      else {
        let den = 0;
        for (let s = 0; s < 6; s++) if (m & (1 << s)) den += slots[s];
        pc = den > 0 ? slots[x] / den : 0;
      }
      prob[k++] = pc;
    }
    // Turda başkalarının iddiaları doğruysa o kopyalar yığında: belirsiz kopyaların olasılığı düşer.
    if (k > 0 && othersClaims > 0) {
      const f = Math.max(0.15, 1 - (0.6 * othersClaims) / Math.max(1, k));
      for (let i = 0; i < k; i++) if (prob[i] < 1) prob[i] *= f;
    }
    const d = this.dist;
    d.fill(0);
    d[0] = 1;
    for (let i = 0; i < k; i++) {
      const q = prob[i];
      for (let j = Math.min(i + 1, 4); j >= 1; j--) d[j] = d[j] * (1 - q) + d[j - 1] * q;
      d[0] *= 1 - q;
    }
    return k;
  }

  /** Son atış yalan olasılığı (bu botun bilgisiyle). */
  lieProbability(v: BlofView): number {
    const w = v.window;
    if (!w) return 0;
    this.refine(v);
    return this.estimateLie(v);
  }

  private estimateLie(v: BlofView): number {
    const w = v.window!;
    const r = w.rank;
    const k = w.count;
    const opening = v.roundPlays.length === 1;
    // Kendi elimden, kendi attıklarımdan ve kenardakilerden kesin kontrol.
    let mine = 0;
    for (const c of v.hand) if (rankOf(c) === r) mine++;
    for (let s = 0; s < 4; s++) {
      const c = s * 13 + r - 1;
      if (this.pre[c] === PILE || this.pre[c] === DISC) mine++;
    }
    if (!this.p.counting) {
      // Kolay: yalnız kendi eline bakar.
      if (mine + k > 4) return this.rnd() < this.p.notice ? 1 : 0.35;
      return (opening ? 0.12 : 0.2) + 0.08 * k;
    }
    let ownClaims = 0;
    let othersClaims = 0;
    if (this.p.claims) {
      const plays = v.roundPlays;
      for (let i = 0; i < plays.length - 1; i++) {
        const pl = plays[i];
        if (pl.seat === this.seat) continue;
        if (pl.seat === w.by) ownClaims += pl.count;
        else othersClaims += pl.count;
      }
    }
    const possible = this.holdDist(v, w.by, r, k, othersClaims);
    if (possible < k || mine + k > 4) return this.rnd() < this.p.notice ? 1 : 0.4;
    const d = this.dist;
    // Atanın bu turda önceki (doğru varsayılan) atışları elindeki kopyaları azaltır.
    const shift = Math.round(0.6 * ownClaims);
    let hi = 0;
    for (let j = Math.min(4, k + shift); j <= 4; j++) hi += d[j];
    let none = 0;
    for (let j = 0; j <= Math.min(4, shift); j++) none += d[j];
    const mid = Math.max(0, 1 - hi - none);
    // Bayes: tutan çoğunlukla doğru atar; tutmayanın bu kadar kart iddia etme eğilimi düşüktür.
    let truth: number;
    // Açan değeri kendisi seçer (çoğunlukla en kalabalık grubunu): az tutup çok iddia etmek nadir.
    if (opening) truth = hi / Math.max(1e-9, hi + mid * 0.2 + none * 0.01);
    else truth = (hi * 0.95) / Math.max(1e-9, hi * 0.95 + mid * 0.3 + none * BLUFF_K[k]);
    return 1 - Math.min(0.995, Math.max(0, truth));
  }

  private decideWindow(v: BlofView): BotDecision<BlofAction, BlofTell> {
    const w = v.window!;
    const me = this.seat;
    const limit = Math.max(150, w.ms - 300);
    const say = (ms: number): BotDecision<BlofAction, BlofTell> => ({action: {t: 'challenge', seat: me}, delayMs: Math.min(limit, ms)});
    const pass = (): BotDecision<BlofAction, BlofTell> => ({action: {t: 'decline', seat: me}, delayMs: Math.min(limit, this.range(this.p.decline))});

    if (w.final) {
      // Son kartlar: blöf dememek = kaybetmek. Kolay bot bazen kaçırır.
      return this.rnd() < this.p.finalCatch ? say(this.range(this.p.sure)) : pass();
    }
    const q = this.estimateLie(v);
    if (q >= 0.999) return say(this.range(this.p.sure));

    const S = v.pileCount;
    const opps = this.opponents(v).length;
    const gW = 1 / Math.max(1, opps);
    const hcX = v.handCounts[w.by];
    const danger = hcX <= 3 ? (4 - hcX) * 1.5 : 0;
    const T = this.tempo(v);
    // Doğru tahmin: atan yığını alır, yeni turu ben açarım. Yanlış: yığın bana, atan açar.
    const ev = q * (S * gW + T + danger) - (1 - q) * (S + T * gW) * this.caution(v) + this.p.suspicion + this.p.noise * this.gauss();
    if (ev > 0) {
      const urgency = Math.min(1, ev / 4);
      const ms = this.range(this.p.react) * (1 - 0.4 * urgency);
      return say(ms);
    }
    return pass();
  }

  /** Elden "yük" kartları: en az tutulan değerlerden (tekler önce), istenen değer hariç. */
  private junk(hand: readonly CardId[], except: number, n: number): CardId[] {
    const cnt = this.cnt;
    cnt.fill(0);
    for (const c of hand) cnt[rankOf(c)]++;
    const pool = hand.filter((c) => rankOf(c) !== except);
    // tekler önce; eşitlikte rastgele (deterministik rnd)
    const keyed = pool.map((c) => ({c, k: cnt[rankOf(c)] * 10 + this.rnd()}));
    keyed.sort((a, b) => a.k - b.k);
    return keyed.slice(0, n).map((x) => x.c);
  }

  /** Turu açmanın değeri (kart cinsinden): 1'e 1'de açan bedavaya en kalabalık grubunu atar. */
  private tempo(v: BlofView): number {
    return v.seats === 2 ? this.p.tempo2 : this.p.tempoN;
  }

  private caution(v: BlofView): number {
    return v.seats === 2 ? this.p.caution : this.p.cautionN;
  }

  /** Bir rakibin gözlenen blöf deme sıklığı (önsel 0,25). Kolay bot rakibini izlemez. */
  private rate(s: number): number {
    if (!this.p.counting) return 0.25;
    return (this.challengedN[s] + 1) / (this.eligibleN[s] + 4);
  }

  /** Benim atışıma (add kart, sonra elimde after kart) blöf denme olasılığı. */
  private challengeRisk(v: BlofView, add: number, after: number): number {
    if (after === 0) return 0.97; // son kartlara herkes blöf der
    let claimed = 0;
    for (const pl of v.roundPlays) claimed += pl.count;
    let mult = 1 + 0.05 * (v.pileCount + add);
    if (claimed + add > 4) mult += 1.2; // dörtten fazla iddia göze batar
    if (after <= 2) mult += 0.8;
    let none = 1;
    for (const s of this.opponents(v)) none *= 1 - Math.min(0.95, this.rate(s) * mult);
    return 1 - none;
  }

  private decideTurn(v: BlofView): BotDecision<BlofAction, BlofTell> {
    const me = this.seat;
    const hand = v.hand;
    const n = hand.length;
    const cnt = this.cnt;
    cnt.fill(0);
    for (const c of hand) cnt[rankOf(c)]++;
    const of = (r: number): CardId[] => hand.filter((c) => rankOf(c) === r);
    const opps = this.opponents(v).length;
    const gW = 1 / Math.max(1, opps);
    const caution = this.caution(v);
    const noise = this.p.noise;
    const pile = v.pileCount;
    const TEMPO = this.tempo(v);

    if (v.mustOpen) {
      // Seçenekler: her değer için doğru açış (hepsi) ya da araya bir yalan kart katarak.
      let best: {rank: number; pad: boolean; val: number} = {rank: 0, pad: false, val: -Infinity};
      for (let r = 1; r <= 13; r++) {
        if (cnt[r] === 0) continue;
        const c = Math.min(cnt[r], BLOF_MAX_PLAY);
        if (c === n) {
          best = {rank: r, pad: false, val: Infinity}; // hepsi doğru → bitiriş
          break;
        }
        const risk = this.challengeRisk(v, c, n - c);
        const vt = c + risk * c * gW + noise * 0.5 * this.gauss();
        if (vt > best.val) best = {rank: r, pad: false, val: vt};
        if (c < BLOF_MAX_PLAY && n - c - 1 >= 1) {
          const rp = this.challengeRisk(v, c + 1, n - c - 1);
          const vp = (1 - rp) * (c + 1) - rp * TEMPO * caution + (this.p.greed - 0.3) + noise * 0.5 * this.gauss();
          if (vp > best.val) best = {rank: r, pad: true, val: vp};
        }
      }
      let cards = of(best.rank).slice(0, BLOF_MAX_PLAY);
      if (this.difficulty === 'kolay' && cards.length > 1 && best.val !== Infinity && this.rnd() < 0.35) {
        cards = cards.slice(0, 1 + Math.floor(this.rnd() * cards.length));
      }
      if (best.pad) cards = cards.concat(this.junk(hand, best.rank, 1));
      return this.play({t: 'open', seat: me, rank: best.rank, cards}, best.pad);
    }

    const r = v.rank;
    const m = Math.min(cnt[r], BLOF_MAX_PLAY);
    if (m > 0 && m === n) return this.play({t: 'play', seat: me, cards: of(r)}, false); // doğru bitiriş

    // Pas: 1'e 1'de rakip yeniden açar (bedava atış) → pahalı; kalabalıkta daha ucuz.
    let bestKind: 'pass' | 'truth' | 'pad' | 'bluff' = 'pass';
    let bestB = 0;
    // Pas: herkes pas derse son atan yeniden açar; 1'e 1'de bu hemen olur (rakibe bedava açış).
    // Eşlide son atan ortağımsa pas iyidir: rakipler de geçerse tur ortağıma döner.
    const last = v.lastPlay ? v.lastPlay.seat : -1;
    const mateLast = last >= 0 && last !== me && v.teams[last] === v.teams[me];
    let bestV = (mateLast ? 0.5 * TEMPO : -(v.seats === 2 ? TEMPO : 0.5)) + noise * 0.5 * this.gauss();
    if (m > 0) {
      const risk = this.challengeRisk(v, m, n - m);
      const vt = m + risk * (pile + m) * gW + noise * 0.3 * this.gauss();
      if (vt > bestV) {
        bestV = vt;
        bestKind = 'truth';
      }
      if (m < BLOF_MAX_PLAY && n - m - 1 >= 1) {
        const rp = this.challengeRisk(v, m + 1, n - m - 1);
        const vp = (1 - rp) * (m + 1) - rp * (pile + TEMPO) * caution + (this.p.greed - 0.3) + noise * this.gauss();
        if (vp > bestV) {
          bestV = vp;
          bestKind = 'pad';
        }
      }
    } else {
      const maxB = Math.min(2, n);
      for (let b = 1; b <= maxB; b++) {
        const after = n - b;
        const risk = this.challengeRisk(v, b, after);
        const gain = after === 0 ? 25 : b; // son kartla blöf: tutarsa kazanır ama neredeyse kesin yakalanır
        // Yakalanmazsam: b kart erir, rakip pas derse turu ben açarım. Yakalanırsam: yığın bana, rakip açar.
        const vb = (1 - risk) * (gain * this.p.bluffLove + 0.5 * TEMPO) - risk * (pile + TEMPO) * caution + noise * this.gauss();
        if (vb > bestV) {
          bestV = vb;
          bestKind = 'bluff';
          bestB = b;
        }
      }
    }
    switch (bestKind) {
      case 'pass':
        return {action: {t: 'pass', seat: me}, delayMs: this.range(this.p.think) * 0.7};
      case 'truth': {
        let cards = of(r).slice(0, BLOF_MAX_PLAY);
        if (this.difficulty === 'kolay' && cards.length > 1 && this.rnd() < 0.3) cards = cards.slice(0, 1 + Math.floor(this.rnd() * cards.length));
        return this.play({t: 'play', seat: me, cards}, false);
      }
      case 'pad':
        return this.play({t: 'play', seat: me, cards: of(r).slice(0, BLOF_MAX_PLAY - 1).concat(this.junk(hand, r, 1))}, true);
      case 'bluff':
        return this.play({t: 'play', seat: me, cards: this.junk(hand, r, bestB)}, true);
    }
  }

  /** Atış kararı + ipucu + insan gibi bekleme. */
  private play(action: BlofAction, bluff: boolean): BotDecision<BlofAction, BlofTell> {
    const p = this.p;
    const nervous = bluff ? this.rnd() < p.tellLeak : this.rnd() < p.tellFake;
    const smug = bluff ? this.rnd() < p.tellMask : this.rnd() < 0.25;
    let delay = this.range(p.think);
    if (bluff) delay += this.range(p.hesitate);
    return {action, delayMs: delay, tell: {nervous, smug: smug && !nervous}};
  }
}
