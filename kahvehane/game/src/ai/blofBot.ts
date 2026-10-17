// Blöf botu: yalnız kendi koltuğunun görünümü (BlofView) ve kendisine süzülmüş olaylarla karar verir —
// gizli duruma asla bakmaz; bu yüzden aynı bot çevrimiçinde sunucuda boş koltuğu doldurabilir (oyun ortasında
// devralsa bile: geçmişi görmediyse en temkinli varsayımla başlar).
//
// Bilgi modeli: her kart için "olası yerler" bit maskesi (koltuk 0–3, yığın, kenar). Yalnız KESİN bilgiyle daraltılır
// (kendi elim, kendi attığım kartlar, açılan kartlar ve gittiği yer, yığının kime gittiği). Unutmak = maskeyi genişletmek
// (hep güvenli). Ek olarak "muhtemel sahip" katmanı (kim hangi yığını aldı) ve kamuya açık rakip modeli tutulur:
// kim ne sıklıkla "Blöf!" diyor, kimin açılan atışları ne sıklıkla yalan çıktı.
//
// Kararlar (kart cinsinden beklenen değer):
//  - Blöf mü? Atanın atıştan ÖNCEKİ elinde o değerden kaç kart olabileceğinin dağılımı × davranış olabilirliği (Bayes).
//    Turu açan değeri KENDİSİ seçer (çoğunlukla en kalabalık grubunu) → açış iddiaları çoğunlukla doğrudur; takipçinin
//    "2 tane" iddiası ise elinde yokken sık yapılan blöftür. Masadaki iddialar 4'ü aşıyorsa göze batar.
//  - Atış/pas: doğru at · araya yalan kart kat · blöf · pas. Yakalanma riski rakiplerin gözlenen blöf deme sıklığından ve
//    rakibin görebildiğinden (masadaki iddialar, açılan kartları alan) hesaplanır. Pas, turu kime açtırdığına bakar:
//    tek kartı kalan rakibe turu bedava açtırmak = eli vermek; eşlide son atan ortaksa pas ona turu açtırır.
//  - Yakalanan yalancı yığına ek olarak kenarın üstünden 2 ceza kartı alır (kenarda az varsa o kadar): her yalanın
//    beklenen bedeline eklenir, yakalamanın getirisine de. Bu kural 1'e 1'deki "açışa bedava yalan kat" açığını kapattı;
//    bot doğru açışına yalnız ara sıra bir yalan kart katar (padOpen2 ≈ %5) — simülasyonla ölçüldü, bkz. docs/BOTS.md.
//  - Ceza kartları kenarın üstünden gelir: bot kenara giden yığınlardaki kendi kartlarının sırasını bilir → kenarın
//    üstündekini kendisi attıysa ceza alanın elinde olduğunu kesin bilir; bilmediklerinde "olabilir" diye genişletir.
//  - Yığını alacaksam içinden dörtlü çıkacaksa (bedava açış) maliyet azalır; ama ancak açmaya vakit varsa.
//  - Kalabalık masada az "Blöf!" demek kazandırır (suspicionN), 1'e 1'de sıkışınca (geçersem zorunlu pas) denemek ucuzdur.
//
// Zorluk (karakterler aynı, yalnız zorluk farkı):
//  kolay — kart saymaz, yalnız kendi elini ve göze batan iddiaları görür; gelişigüzel blöf yapar ve der, ara sıra son karta
//          bile blöf demeyi unutur, blöfte sık ele verir, yavaş tepki verir.
//  orta  — kart sayar ama unutur, masadaki iddiaları çoğunlukla izler, kimin blöf dediğini izler, gürültülü karar verir.
//  zor   — neredeyse her şeyi hatırlar (yine de arada yanılır), iddiaları hesaba katar, rakibin blöf deme sıklığına göre
//          blöf dozunu ayarlar, bitirmeye yakın rakibi sıkıştırır, son karta hep "Blöf!" der, az ele verir.
// Her bot örneğinin ufak bir mizacı (cesaret/blöf sevgisi) vardır: aynı masadaki botlar hep aynı anda aynı şeyi yapmaz.
// Bekleme süreleri insan gibidir: karar zorsa ve yığın büyükse daha uzun düşünür, kesin yakalamada hızlı ama ani değil.
// Pencere kısaysa (sıradaki bot: 3 sn) yavaş tepkiler orantılı sıkışır — hızlılar aynı kalır, en yavaşı da pencere bitmeden gelir.
import type {BotBrain, BotDecision} from '../core/game';
import {mulberry32} from '../core/rng';
import {rankOf} from '../core/types';
import {BLOF_MAX_PLAY, BLOF_PENALTY, BLOF_WINDOW_MS, type BlofAction, type BlofEvent, type BlofTell, type BlofView, type CardId} from '../core/blofTypes';

export type BlofDifficulty = 'kolay' | 'orta' | 'zor';
export const BLOF_DIFFICULTIES: readonly BlofDifficulty[] = ['kolay', 'orta', 'zor'];

export interface BlofBotParams {
  /** 0..1: alınan yığının içeriğini (kim aldı, ne vardı) hatırlama olasılığı (unutunca maske genişler). */
  memory: number;
  /** Maskelerle kart sayar mı (false: yalnız kendi eli ve masadaki iddialar). */
  counting: boolean;
  /** 0..1: turdaki önceki iddiaları ne kadar hesaba katar. */
  claims: number;
  /** Kendi elinden kesin yalanı fark etme olasılığı. */
  notice: number;
  /** Turdaki iddiaların toplamı 4'ü aşınca fark etme olasılığı (göze batan yalan). */
  readTable: number;
  /** Dalgınlık: bir "Blöf!" kararında kart saymayı unutup yalnız kendi eline bakma olasılığı (zor bot da insan). */
  lapse: number;
  /** Kendi iddiasının masayı 4'ün üstüne çıkaracağını fark etme olasılığı (imkânsız iddia yapmama). */
  selfCheck: number;
  /** Açışta/atışta araya bir yalan kart katma eğilimi (kart cinsinden ek değer). */
  greed: number;
  /** Blöfle kart eritmenin değer çarpanı (1'e 1) / kalabalık masada ek çarpan (kahvehanede herkes biraz blöf yapar). */
  bluffLove: number;
  bluffLoveN: number;
  /** Yakalanınca alınacak yığının ağırlığı (1 = tarafsız beklenen değer; düşük = pervasız). */
  caution: number;
  /** Karar gürültüsü (beklenen değere eklenen sapmanın ölçeği, kart cinsinden). */
  noise: number;
  /** "Blöf!" deme eğilimi kayması (+: daha şüpheci): 1'e 1'de / kalabalık masada (kalabalıkta az demek kazandırır). */
  suspicion: number;
  suspicionN: number;
  /** Sınırda bir "Blöf!" kararında içgüdüyle yanılma olasılığı (zor bot da yanılır). */
  slip: number;
  /** Son kartlarını atan rakibe "Blöf!" deme olasılığı. */
  finalCatch: number;
  /** Az tanıdığı rakibin ucuz yığınına ara sıra "bir bakalım" deme olasılığı (rakibi öğrenmek için). */
  probe: number;
  /** Bot başına mizaç farkı (cesaret ± bu kadar; blöf sevgisi ± %15·bu). */
  temperament: number;
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
  /** Turu açmanın değeri (kart cinsinden): 1'e 1'de / kalabalık masada. */
  tempo2: number;
  tempoN: number;
  /** Yığından çıkacak dörtlü grubun (bedava açış) değer çarpanı (0: hesaba katmaz). */
  groupValue: number;
  /**
   * 1'e 1'de doğru açışın yanına (değer hesabından bağımsız) bir yalan kart katma olasılığı. Ceza kuralından önce
   * açışta yakalanmanın bedeli yalnız turu kaptırmaktı (%12–45 ayarlıydı); artık yakalanan 2 ceza kartı da alır → ~%5.
   */
  padOpen2: number;
  /**
   * Yakalanan yalancının kenardan aldığı ceza kartlarını kararlarda ne kadar hesaba katar (1 = tam): kendi yalanının
   * bedelinde de, yakalamanın getirisinde de. Kolay (acemi) cezayı küçümser: daha pervasız yalan söyler.
   */
  penaltyWeight: number;
  /** Önsel: takipçi elinde o değer yokken pas yerine blöf yapar (kalabalık masada; 1'e 1'de daha sık). */
  priorBluffN: number;
  /** Eşli masada (takım arkadaşı varken) üzerine yazılan ayarlar. */
  team?: Partial<Omit<BlofBotParams, 'team'>>;
}

export const BLOF_BOT_PARAMS: Record<BlofDifficulty, BlofBotParams> = {
  kolay: {
    memory: 0.3,
    counting: false,
    claims: 0,
    notice: 0.75,
    readTable: 0.35,
    lapse: 0,
    selfCheck: 0.92,
    greed: 0.25,
    bluffLove: 0.9,
    bluffLoveN: 1.3,
    caution: 1,
    noise: 0.75,
    suspicion: 0.6,
    suspicionN: -0.8,
    slip: 0.12,
    finalCatch: 0.93,
    probe: 0,
    temperament: 0.5,
    tellLeak: 0.65,
    tellFake: 0.1,
    tellMask: 0.02,
    think: [1100, 2500],
    react: [1500, 3600],
    sure: [1100, 2400],
    decline: [800, 2000],
    hesitate: [300, 900],
    tempo2: 2,
    tempoN: 0.8,
    groupValue: 0,
    padOpen2: 0.06,
    penaltyWeight: 0.3,
    priorBluffN: 0.25,
    // eşlide acemi ortağına güvenmez: kalabalık masadaki temkini bırakıp daha çok "Blöf!" der (çoğu boşa)
    team: {suspicionN: 0},
  },
  orta: {
    memory: 0.75,
    counting: true,
    claims: 0.7,
    notice: 0.95,
    readTable: 0.85,
    lapse: 0.2,
    selfCheck: 0.97,
    greed: 0.05,
    bluffLove: 1.05,
    bluffLoveN: 1.5,
    caution: 0.95,
    noise: 0.55,
    suspicion: 0,
    suspicionN: -0.2,
    slip: 0.07,
    finalCatch: 1,
    probe: 0.06,
    temperament: 0.35,
    tellLeak: 0.4,
    tellFake: 0.12,
    tellMask: 0.08,
    think: [900, 2100],
    react: [1100, 2900],
    sure: [800, 1700],
    decline: [600, 1500],
    hesitate: [100, 500],
    tempo2: 2.5,
    tempoN: 1,
    groupValue: 0.6,
    padOpen2: 0.05,
    penaltyWeight: 0.8,
    priorBluffN: 0.25,
  },
  zor: {
    memory: 0.93,
    counting: true,
    claims: 1,
    notice: 1,
    readTable: 0.97,
    lapse: 0.12,
    selfCheck: 1,
    greed: 0.1,
    bluffLove: 1.2,
    bluffLoveN: 1.375,
    caution: 1,
    noise: 0.3,
    suspicion: 0.8,
    suspicionN: -0.3,
    slip: 0.04,
    finalCatch: 1,
    probe: 0.08,
    temperament: 0.3,
    tellLeak: 0.2,
    tellFake: 0.15,
    tellMask: 0.2,
    think: [850, 1900],
    react: [950, 2600],
    sure: [650, 1400],
    decline: [500, 1400],
    hesitate: [0, 0],
    tempo2: 2.5,
    tempoN: 1,
    groupValue: 0.6,
    padOpen2: 0.05,
    penaltyWeight: 1,
    priorBluffN: 0.25,
  },
};

const PILE = 16;
const DISC = 32;
const SLOT_PILE = 4;
const SLOT_DISC = 5;
const bit = (seat: number): number => 1 << seat;
const clamp = (x: number, a: number, b: number): number => (x < a ? a : x > b ? b : x);

/** Bitirmenin (eli kazanmanın) değeri, kart cinsinden. */
const WIN = 14;
/** Turu açan oyuncu h kartla kaldıysa hemen bitirebilme olasılığı (hepsi aynı değer): 1 → kesin. */
const PFIN = [1, 1, 0.3, 0.12, 0.06];
const pFinish = (h: number): number => (h < PFIN.length ? PFIN[h] : 0);

// Davranış olabilirlikleri (Bayes): bir oyuncu elindeki kopya sayısına göre "k tane" iddiasını ne sıklıkla yapar.
/** Takipçi o değerden hiç tutmuyorsa blöf yapınca k kart iddia etme payı (k = 1..4). */
const BLUFF_K = [0, 0.62, 0.33, 0.04, 0.01];
/** Takipçi elinde yokken pas yerine blöf yapma olasılığı (1'e 1'de pas pahalı → daha sık). */
const BLUFF_F2 = 0.65;
/** Doğrunun yanına bir yalan kart katma (takipçi / açan), elinde olanı tutup yalan atma, hiç tutmadığı değeri açma. */
const PAD_F = 0.12;
const PAD_O = 0.07;
const EPS_F = 0.02;
const EPS_O = 0.01;
const PURE_O = 0.04;
/** Rakip modeli: açılan (blöf denen) atışlarda yalan payının önseli — açışta / takipte (şüpheli atışlar açıldığı için yüksek). */
const LIE_OPEN = 0.2;
const LIE_FOLLOW = 0.45;
/** Rakip modeli: bir açış / takip penceresinde (kim olursa) "Blöf!" denme sıklığının önseli. */
const CALL_OPEN = 0.1;
const CALL_FOLLOW = 0.3;

export class BlofBot implements BotBrain<BlofAction, BlofEvent, BlofView, BlofTell> {
  readonly seat: number;
  readonly difficulty: BlofDifficulty;
  private p: BlofBotParams;
  private readonly base: BlofBotParams;
  private teamMode = false;
  private readonly rnd: () => number;
  /** Mizaç: "Blöf!" deme eğilimi kayması ve blöf sevgisi çarpanı (bot başına sabit). */
  private readonly bold: number;
  private readonly bluffy: number;
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
  private readonly soft = new Int16Array(6);
  /** Rakip modeli (kamuya açık): koltuk başına blöf diyebildiği pencere, dediği blöf; açılan atışlarında yalan/doğru. */
  /** [koltuk*2 + tür]: tür 0 = açış penceresi, 1 = takip penceresi (son kart pencereleri sayılmaz: onlara herkes der). */
  private readonly eligibleN = new Float64Array(8);
  private readonly challengedN = new Float64Array(8);
  /** Açık pencerenin türü (0 açış, 1 takip) ve son kart mı. */
  private winKind = 0;
  private winFinal = false;
  /** [koltuk*2 + tür] (0 açış, 1 takip): açılan atışlarından yalan / doğru çıkanlar. */
  private readonly liesN = new Float64Array(8);
  private readonly truthsN = new Float64Array(8);
  /** Kenara giden turlarda söylenen kart sayısı (değer başına, ≤ 4): o değerin kopyaları büyük olasılıkla kenarda. */
  private readonly discClaims = new Float64Array(14);
  /** Bu turun değeri ve söylenen toplam (kenara giderse discClaims'e eklenir). */
  private roundRank = 0;
  private roundClaims = 0;
  /**
   * Yığındaki kartların atış sırasıyla bilinen kimliği (−1: bilinmiyor) ve kenarın sırası (en üstteki en sonda):
   * kendi attıklarım ve açılanlar bilinir. Ceza kartları kenarın üstünden alınır → kimin eline geçtiğini bilirim.
   */
  private pileOrder: number[] = [];
  private discOrder: number[] = [];
  /** Son atış kararında öngörülen "Blöf!" denme riski (ölçüm/test için). */
  lastRisk = 0;

  constructor(seat: number, difficulty: BlofDifficulty = 'orta', seed: number | (() => number) = seat * 7919 + 17, params?: Partial<BlofBotParams>) {
    this.seat = seat;
    this.difficulty = difficulty;
    this.base = {...BLOF_BOT_PARAMS[difficulty], ...params};
    this.p = this.base;
    this.rnd = typeof seed === 'function' ? seed : mulberry32(seed);
    const t = this.base.temperament;
    this.bold = (this.rnd() * 2 - 1) * t;
    this.bluffy = 1 + (this.rnd() * 2 - 1) * 0.15 * Math.min(1, t * 2);
  }

  /** Bu kartın olası yerleri (bit maskesi; test ve hata ayıklama için). */
  possible(card: CardId): number {
    return this.loc[card];
  }

  // ─────────────── Gözlem ───────────────

  private init(seats: number, hand: readonly CardId[], pileCount: number, discardCount: number): void {
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
        this.pileOrder = [];
        this.discOrder = [];
        break;
      }
      case 'opened':
      case 'played': {
        this.winKind = e.t === 'opened' ? 0 : 1;
        if (e.t === 'opened') {
          this.roundRank = e.rank;
          this.roundClaims = 0;
        }
        this.roundClaims += e.count;
        if (e.seat === me && e.cards) this.pileOrder.push(...e.cards);
        else for (let k = 0; k < e.count; k++) this.pileOrder.push(-1);
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
        for (let k = 0; k < e.cards.length; k++) {
          const i = this.pileOrder.length - e.cards.length + k;
          if (i >= 0) this.pileOrder[i] = e.cards[k];
        }
        if (e.seat !== me) {
          if (e.truthful) this.truthsN[e.seat * 2 + this.winKind]++;
          else this.liesN[e.seat * 2 + this.winKind]++;
        }
        if (!this.inited) return;
        for (const c of e.cards) {
          this.loc[c] = PILE;
          this.likely[c] = -1;
        }
        break;
      case 'pileTaken': {
        this.roundRank = 0;
        this.roundClaims = 0;
        this.pileOrder = [];
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
        this.winFinal = e.final;
        if (!e.final) for (const s of e.eligible) if (s !== me) this.eligibleN[s * 2 + this.winKind]++;
        break;
      case 'challenged':
        if (e.by !== me && !this.winFinal) this.challengedN[e.by * 2 + this.winKind]++;
        break;
      case 'pileCleared':
        if (this.roundRank > 0 && this.p.counting && this.rnd() < this.p.memory + (1 - this.p.memory) * 0.5)
          this.discClaims[this.roundRank] = Math.min(4, this.discClaims[this.roundRank] + this.roundClaims);
        this.roundRank = 0;
        this.roundClaims = 0;
        // kenarın sırası: hatırlarsam bu yığının (atış sırasıyla) kimlikleri, yoksa bilinmiyor
        if (this.p.counting && this.rnd() < this.p.memory) this.discOrder.push(...this.pileOrder);
        else for (let k = 0; k < this.pileOrder.length; k++) this.discOrder.push(-1);
        this.pileOrder = [];
        if (!this.inited) return;
        for (let c = 0; c < 52; c++) {
          const m = this.loc[c];
          if (m & PILE) this.loc[c] = (m & ~PILE) | DISC;
        }
        break;
      case 'penalty': {
        // ceza: kenarın üstünden count kart e.seat'e. Bildiğim üst kartlar kesin onda; diğer kenar kartları "olabilir".
        const top = this.discOrder.splice(Math.max(0, this.discOrder.length - e.count), e.count);
        if (!this.inited) return;
        const b = bit(e.seat);
        if (e.seat === me && e.cards) {
          for (const c of e.cards) {
            this.loc[c] = b;
            this.likely[c] = -1;
          }
          break;
        }
        const all = e.discardCount === 0; // kenar tümden alındı: kenardaki her kart artık onda
        for (let c = 0; c < 52; c++) {
          const m = this.loc[c];
          if (!(m & DISC)) continue;
          this.loc[c] = all ? (m & ~DISC) | b : m | b;
        }
        for (const c of top) {
          if (c < 0) continue;
          this.loc[c] = b;
          this.likely[c] = -1;
        }
        break;
      }
      default:
        break;
    }
  }

  /** Takım arkadaşım varsa eşli ayarlarına geç. */
  private setTeams(teams: readonly number[]): void {
    const mate = teams.some((t, i) => i !== this.seat && t === teams[this.seat]);
    if (mate === this.teamMode) return;
    this.teamMode = mate;
    this.p = mate && this.base.team ? {...this.base, ...this.base.team} : this.base;
  }

  /** Görünümle tutarlılaştırma: kendi elim kesin; boş yerler elenir; kesin sayısı dolan yere başka kart giremez. */
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

  /** Yaklaşık normal gürültü (ortalama 0, sapma ≈ 1). */
  private gauss(): number {
    return (this.rnd() + this.rnd() + this.rnd() - 1.5) * 2;
  }

  private opponents(v: BlofView): number[] {
    const out: number[] = [];
    for (let s = 0; s < v.seats; s++) if (v.teams[s] !== v.teams[this.seat]) out.push(s);
    return out;
  }

  /** Yakalanan yalancının kenardan alacağı ceza kartları (kenarda az varsa o kadar) × botun bunu ne kadar önemsediği. */
  private penalty(v: BlofView): number {
    return Math.min(BLOF_PENALTY, v.discardCount) * this.p.penaltyWeight;
  }

  /** Turu açmanın değeri (kart cinsinden): 1'e 1'de açan bedavaya en kalabalık grubunu atar. */
  private tempo(v: BlofView): number {
    return v.seats === 2 ? this.p.tempo2 : this.p.tempoN;
  }

  /** Bir rakibin turu açmasının bana maliyeti (kalabalık masada etkisi bölünür). */
  private oppTempo(v: BlofView): number {
    return v.seats === 2 ? this.p.tempo2 : this.p.tempoN * 0.7;
  }

  /**
   * Bir rakibin gözlenen "Blöf!" deme sıklığı, açışlara ve takiplere ayrı (önsel: pencere başına CALL_OPEN / CALL_FOLLOW,
   * rakipler arasında paylaşılır). Kolay bot rakibini izlemez.
   */
  private callRate(s: number, opps: number, opening: boolean): number {
    const kind = opening ? 0 : 1;
    const prior = 1 - Math.pow(1 - (opening ? CALL_OPEN : CALL_FOLLOW), 1 / Math.max(1, opps));
    if (!this.p.counting) return prior;
    return (this.challengedN[s * 2 + kind] + prior * 5) / (this.eligibleN[s * 2 + kind] + 5);
  }

  /** Bir rakibin açılan atışlarındaki yalan payına göre blöf eğilimi çarpanı (kamuya açık geçmiş). */
  private lieMul(s: number, opening: boolean): number {
    if (!this.p.counting) return 1;
    const k = s * 2 + (opening ? 0 : 1);
    const l = this.liesN[k];
    const t = this.truthsN[k];
    const base = opening ? LIE_OPEN : LIE_FOLLOW;
    // hızlı öğrenir: "açışta hep yalan atıyor" ya da "hiç blöf yapmıyor" birkaç açılışta belli olur
    return clamp((l + base * 3) / (l + t + 3) / base, 0.35, opening ? 6 : 2.2);
  }

  /** Bu rakibin bu tür atışından (açış/takip) kaç kez açılış gördüm (az ise ara sıra "bir bakayım" der). */
  private seen(s: number, opening: boolean): number {
    const k = s * 2 + (opening ? 0 : 1);
    return this.liesN[k] + this.truthsN[k];
  }

  /**
   * x koltuğunun elinde bu değerden kaç kart olduğunun dağılımı → this.dist[0..4] (kopyalar bağımsız yaklaşık).
   * masks/likely: hangi bilgiyle (atıştan önceki: pre; şimdiki: loc). addX: x'in eline geri eklenecek (atılan) kart sayısı;
   * subPile: yığından düşülecek. claimsOther/claimsOwn: turda başkalarının / x'in önceki iddiaları (doğruysa o kopyalar yığında).
   * Dönüş: x'te olabilecek kopya sayısı (kesin üst sınır).
   */
  private holdDist(masks: Uint8Array, likely: Int8Array, v: BlofView, x: number, rank: number, addX: number, subPile: number, claimsOther: number, claimsOwn: number): number {
    const bx = bit(x);
    const slots = this.slots;
    const ex = this.exact;
    const soft = this.soft;
    ex.fill(0);
    soft.fill(0);
    for (let c = 0; c < 52; c++) {
      const m = masks[c];
      if (m === 0) continue;
      if ((m & (m - 1)) === 0) ex[m === PILE ? SLOT_PILE : m === DISC ? SLOT_DISC : Math.log2(m) | 0]++;
      else if (likely[c] >= 0) soft[likely[c]]++;
    }
    for (let s = 0; s < v.seats; s++) {
      slots[s] = s === this.seat ? 0 : Math.max(0, v.handCounts[s] + (s === x ? addX : 0) - ex[s] - soft[s]);
    }
    slots[SLOT_PILE] = Math.max(0, v.pileCount - subPile - ex[SLOT_PILE]);
    slots[SLOT_DISC] = Math.max(0, v.discardCount - ex[SLOT_DISC]);
    // Kenar, söylenen değerlerle dolu: o değer kenara gittiyse kopyası kenarda olası, hiç gitmediyse az olası.
    let dc = 0;
    for (let r = 1; r <= 13; r++) dc += this.discClaims[r];
    const discW = v.discardCount > 0 ? clamp((0.35 + this.discClaims[rank]) / (0.35 + dc / 13), 0.2, 4) : 1;

    const prob = this.prob;
    let k = 0;
    for (let suit = 0; suit < 4; suit++) {
      const c = suit * 13 + rank - 1;
      const m = masks[c];
      if (!(m & bx)) continue;
      let pc: number;
      if (m === bx) pc = 1;
      else if (likely[c] === x) pc = 0.88;
      else if (likely[c] >= 0) pc = 0.06;
      else {
        let den = 0;
        for (let s = 0; s < 6; s++) if (m & (1 << s)) den += s === SLOT_DISC ? slots[s] * discW : slots[s];
        pc = den > 0 ? slots[x] / den : 0;
      }
      prob[k++] = pc;
    }
    // Turda başkalarının iddiaları doğruysa o kopyalar yığında: belirsiz kopyaların olasılığı düşer.
    if (k > 0 && claimsOther > 0) {
      const f = Math.max(0.15, 1 - (0.6 * claimsOther) / Math.max(1, k));
      for (let i = 0; i < k; i++) if (prob[i] < 1) prob[i] *= f;
    }
    // x bu turda bu değeri zaten söyledi: dürüst oyuncu elindekilerin hepsini atar → kalmış olması az olası.
    if (k > 0 && claimsOwn > 0) {
      const f = 1 - 0.85 * Math.min(1, claimsOwn);
      for (let i = 0; i < k; i++) if (prob[i] < 1) prob[i] *= f;
    }
    this.fold(k);
    return k;
  }

  /** this.prob[0..k) kopya olasılıklarından this.dist (0..4 kopya) dağılımı. */
  private fold(k: number): void {
    const d = this.dist;
    const prob = this.prob;
    d.fill(0);
    d[0] = 1;
    for (let i = 0; i < k; i++) {
      const q = prob[i];
      for (let j = Math.min(i + 1, 4); j >= 1; j--) d[j] = d[j] * (1 - q) + d[j - 1] * q;
      d[0] *= 1 - q;
    }
  }

  /** Kart saymayan (kolay) bot: x'in payı kadar, bilmediği kopyalar eşit dağılmış varsayılır. */
  private naiveDist(v: BlofView, x: number, rank: number, addX: number, mine: number): number {
    const unknown = 4 - mine;
    let pool = 52 - v.hand.length;
    for (let s = 0; s < 4; s++) {
      const c = s * 13 + rank - 1;
      if (this.pre[c] === PILE || this.pre[c] === DISC) pool--;
    }
    const hx = v.handCounts[x] + addX;
    const p = pool > 0 ? clamp(hx / pool, 0, 1) : 0;
    for (let i = 0; i < unknown; i++) this.prob[i] = p;
    this.fold(Math.max(0, unknown));
    return Math.max(0, unknown);
  }

  /** Kart saymadan: s koltuğunun elinde bu değerden kaç kopya olabileceği (bilmediğim kopyalar eşit dağılmış). */
  private naiveCopies(v: BlofView, s: number, rank: number): void {
    let mine = 0;
    for (const c of v.hand) if (rankOf(c) === rank) mine++;
    let pool = 52 - v.hand.length;
    for (let su = 0; su < 4; su++) {
      const c = su * 13 + rank - 1;
      if (this.loc[c] === PILE || this.loc[c] === DISC) {
        mine++;
        pool--;
      }
    }
    const unknown = Math.max(0, 4 - mine);
    const p = pool > 0 ? clamp(v.handCounts[s] / pool, 0, 1) : 0;
    for (let i = 0; i < unknown; i++) this.prob[i] = p;
    this.fold(unknown);
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
    const x = w.by;
    const opening = v.roundPlays.length === 1;
    // Kendi elimden, kendi attıklarımdan ve kenardakilerden kesin kontrol.
    let mine = 0;
    for (const c of v.hand) if (rankOf(c) === r) mine++;
    for (let s = 0; s < 4; s++) {
      const c = s * 13 + r - 1;
      if (this.pre[c] === PILE || this.pre[c] === DISC) mine++;
    }
    if (mine + k > 4) return this.rnd() < this.p.notice ? 1 : 0.5;
    // Turda bu atıştan önceki iddialar (kendi iddialarımın gerçeğini zaten biliyorum: mine içinde).
    let others = 0;
    let own = 0;
    const plays = v.roundPlays;
    for (let i = 0; i < plays.length - 1; i++) {
      const pl = plays[i];
      if (pl.seat === this.seat) continue;
      if (pl.seat === x) own += pl.count;
      else others += pl.count;
    }
    const tableImpossible = others + own + k + mine > 4;
    let possible: number;
    // dalgın anında yalnız kendi eline bakar (kart saymaz)
    if (this.p.counting && this.rnd() >= this.p.lapse) possible = this.holdDist(this.pre, this.preLikely, v, x, r, k, k, others * this.p.claims, own > 0 ? this.p.claims : 0);
    else possible = this.naiveDist(v, x, r, k, mine);
    if (possible < k) return this.rnd() < this.p.notice ? 1 : 0.5;
    const d = this.dist;
    const mul = this.lieMul(x, opening);
    const bluffF = v.seats === 2 ? BLUFF_F2 : this.p.priorBluffN;
    let pt = 0;
    let pl = 0;
    for (let j = 0; j <= 4; j++) {
      const dj = d[j];
      if (dj <= 0) continue;
      let lt = 0;
      let ll: number;
      if (opening) {
        // açan değeri kendisi seçer: elindeki kopya sayısının karesiyle orantılı (en kalabalık grubu)
        const sel = j * j;
        if (j >= k) lt = (j === k || k === 4 ? 1 : 0.05) * sel;
        if (j === 0) ll = PURE_O;
        else if (j === k - 1) ll = sel * PAD_O;
        else if (j < k - 1) ll = sel * PAD_O * 0.15;
        else ll = sel * EPS_O;
      } else {
        if (j >= k) lt = j === k || k === 4 ? 1 : 0.08;
        if (j === 0) ll = bluffF * BLUFF_K[k];
        else if (j === k - 1) ll = PAD_F;
        else if (j < k - 1) ll = PAD_F * 0.15;
        else ll = EPS_F;
      }
      pt += dj * lt;
      pl += dj * ll * mul;
    }
    let q = pl / Math.max(1e-9, pt + pl);
    // Masadaki iddialar 4'ü aşıyor: biri yalan söylüyor — ama kim? Son atan da olabilir, önceki biri (çoğu zaman araya
    // yalan kart katan açan) de. Kuşku, turdaki iddialara türüne ve atanın geçmişine göre paylaştırılır.
    if (tableImpossible && this.rnd() < this.p.readTable) {
      const suspect = (seat: number, count: number, open: boolean): number => (open ? 0.8 : count === 1 ? 1 : count === 2 ? 1.5 : 2.5) * this.lieMul(seat, open);
      let all = 0;
      for (let i = 0; i < plays.length; i++) if (plays[i].seat !== this.seat) all += suspect(plays[i].seat, plays[i].count, i === 0);
      const cur = suspect(x, k, opening);
      q = Math.max(q, 0.9 * (all > 0 ? cur / all : 1));
    }
    return clamp(q, 0, 0.995);
  }

  /** Bu pencere kararında kullanılan, gecikme için de gereken bağlam. */
  private decideWindow(v: BlofView): BotDecision<BlofAction, BlofTell> {
    const w = v.window!;
    const me = this.seat;
    const limit = Math.max(150, w.ms - 300);
    // Kısa pencere (sıradaki bot: 3 sn): 0,9 sn'nin üstündeki süreler orantılı sıkışır; 5 sn'lik pencerenin son anı
    // (4,7 sn) kısa pencerenin son anına (2,7 sn) denk gelir. Hızlı tepkiler aynı kalır, sıra (kim önce der) korunur.
    const knee = 900;
    const full = BLOF_WINDOW_MS - 300;
    const fit = (ms: number): number => (w.ms >= BLOF_WINDOW_MS || ms <= knee ? ms : knee + ((ms - knee) * Math.max(0, limit - knee)) / (full - knee));
    // insan en hızlı ~0,5 sn'de basar; pencere bitmeden (son 300 ms ev sahibine pay)
    const say = (ms: number): BotDecision<BlofAction, BlofTell> => ({action: {t: 'challenge', seat: me}, delayMs: clamp(fit(ms), Math.min(500, limit), limit)});
    const pass = (ms: number): BotDecision<BlofAction, BlofTell> => ({action: {t: 'decline', seat: me}, delayMs: clamp(fit(ms), Math.min(450, limit), limit)});
    const S = v.pileCount;
    // büyük yığında karar ağır: biraz daha bakılır
    const weight = Math.min(700, S * 25);

    if (w.final) {
      // Son kartlar: blöf dememek = kaybetmek (doğru çıksa da el biter; denemenin bedeli yok). Kolay bot ara sıra kaçırır.
      return this.rnd() < this.p.finalCatch ? say(this.range(this.p.sure) + weight * 0.5) : pass(this.range(this.p.decline) * 1.3);
    }
    const q = this.estimateLie(v);
    if (q >= 0.999) return say(this.range(this.p.sure) + weight * 0.4);

    const opps = this.opponents(v).length;
    const gW = 1 / Math.max(1, opps);
    const hcX = v.handCounts[w.by];
    // bitirmeye yaklaşan rakibi durdurmak ayrıca değerli
    const danger = hcX <= 3 ? (4 - hcX) * 1.2 : 0;
    const T = this.tempo(v);
    const To = this.oppTempo(v);
    // Doğru tahmin: atan yığını (+ kenardan ceza kartları) alır, yeni turu ben açarım. Yanlış: yığın bana, atan açar.
    // Karşılaştırma "geç"in getirisiyle: sıra bendeyse ve elimde o değer yoksa geçmek çoğu zaman zorunlu pas demektir.
    const gain = q * ((S + this.penalty(v)) * gW + T + danger);
    const loss = (1 - q) * (Math.max(0, S * this.p.caution - this.pileGroupBonus(v, w.rank)) + To);
    let ev = gain - loss - this.declineValue(v) + (v.seats === 2 ? this.p.suspicion : this.p.suspicionN) + this.bold + this.p.noise * this.gauss();
    // içgüdü: sınırda kararlarda arada bir yanılır (zor bot da)
    if (Math.abs(ev) < 1.5 && this.rnd() < this.p.slip) ev = -ev;
    // merak: bu rakibin böyle atışını henüz pek açmadım ve yığın ucuz → ara sıra "bir bakalım" (rakibi tanımak için).
    // Yalnız sıradaki oyuncu yapar (kalabalık masada herkes aynı anda merak etmesin).
    const opening = v.roundPlays.length === 1;
    if (ev <= 0 && v.turn === me && S <= 4 && q > 0.05 && this.seen(w.by, opening) < 2 && this.rnd() < this.p.probe) ev = 0.1;
    const doubt = 1 - Math.abs(q - 0.5) * 2; // 1: tam belirsiz
    if (ev > 0) {
      const urgency = Math.min(1, ev / 4);
      return say(this.range(this.p.react) * (1 - 0.35 * urgency) * (0.85 + 0.3 * doubt) + weight);
    }
    // açıkça doğru görünen atışa çabuk "geç"; kararsızken daha uzun bakar
    return pass(this.range(this.p.decline) * (0.75 + 0.6 * doubt) + weight * 0.5);
  }

  /**
   * Yığını alırsam içinden çıkacak grubun değeri (kart cinsinden, yığın maliyetinden düşülür): turda söylenenler büyük
   * olasılıkla gerçekten o değer. Elimdekilerle dördü tamamlarsam, o dört kart sonra kimsenin doğru takip edemeyeceği
   * bedava bir açış olur (1'e 1'de çok değerli).
   */
  private pileGroupBonus(v: BlofView, rank: number, extraMine = 0): number {
    if (!this.p.counting || rank === 0 || this.p.groupValue <= 0) return 0;
    let held = 0;
    for (const c of v.hand) if (rankOf(c) === rank) held++;
    let mineIn = extraMine;
    let others = 0;
    let earlier = 0;
    const plays = v.roundPlays;
    for (let s = 0; s < 4; s++) if (this.loc[s * 13 + rank - 1] === PILE) mineIn++;
    for (let i = 0; i < plays.length; i++) {
      if (plays[i].seat === this.seat) continue;
      others += plays[i].count;
      if (i < plays.length - 1) earlier++;
    }
    const after = held + mineIn + others;
    // önceki iddialar arada yalan olabilir (sonuncusu "doğru çıktı" dalında zaten doğru)
    const conf = Math.pow(0.9, earlier);
    // dörtlü ancak açmaya vakit kalırsa değerli: rakip bitirmeye yakınsa ya da elimde açılmayı bekleyen dörtlüler varsa az
    let near = 99;
    for (const s of this.opponents(v)) if (v.handCounts[s] > 0) near = Math.min(near, v.handCounts[s]);
    let quads = 0;
    const cnt = new Int8Array(14);
    for (const c of v.hand) if (++cnt[rankOf(c)] === 4) quads++;
    const g = this.p.groupValue * clamp((near - 3) / 10, 0, 1) / (1 + quads);
    if (after >= 4) return g * conf * (v.seats === 2 ? 3.8 : 3.3);
    return after >= 3 ? g * conf : 0;
  }

  /** "Geç" dersem (sıra bendeyse) sıradaki hamlemin değeri: doğru atış, blöf ya da zorunlu pas. Sıra başkasındaysa 0. */
  private declineValue(v: BlofView): number {
    const w = v.window!;
    if (v.turn !== this.seat) return 0;
    let m = 0;
    for (const c of v.hand) if (rankOf(c) === w.rank) m++;
    if (m > 0) return Math.min(m, BLOF_MAX_PLAY, 2) * 0.8;
    const pass = this.passValue(v);
    let claimed = 0;
    for (const pl of v.roundPlays) claimed += pl.count;
    if (claimed + 1 > 4 || v.hand.length < 2) return pass;
    const rb = this.challengeRisk(v, w.rank, 1, true, v.hand.length - 1, false);
    const cost = Math.max(0, v.pileCount * this.p.caution - this.pileGroupBonus(v, w.rank)) + this.oppTempo(v) + this.penalty(v) * this.p.caution;
    return Math.max(pass, (1 - rb) * this.p.bluffLove - rb * cost);
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

  /**
   * Benim "k tane rank" atışıma (sonra elimde after kart) birinin "Blöf!" deme olasılığı.
   * lie: atış yalan mı (rakip kendi elinden ya da masadaki iddialardan yalanı görebilir mi diye bakılır).
   */
  private challengeRisk(v: BlofView, rank: number, k: number, lie: boolean, after: number, opening: boolean): number {
    if (after === 0) return 0.985; // son kartlara herkes blöf der
    let claimed = 0;
    for (const pl of v.roundPlays) claimed += pl.count;
    const publicImpossible = claimed + k > 4;
    let none = 1;
    const opps = this.opponents(v);
    for (const s of opps) {
      if (v.handCounts[s] === 0) continue;
      let ps: number;
      if (publicImpossible) ps = 0.92;
      else {
        const base = this.callRate(s, opps.length, opening);
        const shape = (opening ? (k === 4 ? 1.2 : 1) : k === 1 ? 1 : k === 2 ? 1.4 : k === 3 ? 1.8 : 2.2) * (after <= 2 ? 1.5 : 1) * (1 + 0.03 * v.pileCount);
        ps = Math.min(0.9, base * shape);
        if (lie) {
          // rakip kendi elinden ne görür: elinde (5 − masadaki iddialar − k) ya da fazla kopya varsa yalan ona apaçık;
          // birkaç kopya tutuyorsa da kuşkulanır (iddiam onun elindekilerle zor tutar)
          const need = 5 - claimed - k;
          if (need <= 0) ps = 0.92;
          else {
            let sOwn = 0;
            let sOther = 0;
            for (const pl of v.roundPlays) {
              if (pl.seat === s) sOwn += pl.count;
              else if (pl.seat !== this.seat) sOther += pl.count;
            }
            if (this.p.counting) this.holdDist(this.loc, this.likely, v, s, rank, 0, 0, sOther, sOwn > 0 ? 1 : 0);
            else this.naiveCopies(v, s, rank);
            let know = 0;
            for (let j = need; j <= 4; j++) know += this.dist[j];
            const some = 1 - this.dist[0];
            ps = know * 0.95 + (1 - know) * Math.min(0.9, ps * (1 + 2 * some));
          }
        }
      }
      none *= 1 - ps;
    }
    return 1 - none;
  }

  /** Pas: turu kime açtırıyor? Değer (kart cinsinden): ortağa açtırmak +, tek kartı kalan rakibe açtırmak eli vermek. */
  private passValue(v: BlofView): number {
    const me = this.seat;
    const last = v.lastPlay ? v.lastPlay.seat : -1;
    if (last < 0 || last === me) return 0;
    // benim pasım seriyi tamamlıyor mu (son atan hariç herkes pas) — değilse sonrakiler de pas derse
    const completes = v.passes >= v.seats - 2;
    const pc = completes ? 1 : Math.pow(0.5, v.seats - 2 - v.passes);
    const h = v.handCounts[last];
    if (v.teams[last] === v.teams[me]) return pc * (this.tempo(v) + WIN * pFinish(h));
    return -pc * (this.oppTempo(v) + WIN * pFinish(h));
  }

  /** Atıştan sonra elde kalanlar tek değerse (≤ 4): turu açınca bitiririm. */
  private shape(hand: readonly CardId[], used: ReadonlySet<CardId>): number {
    let r = 0;
    let n = 0;
    for (const c of hand) {
      if (used.has(c)) continue;
      n++;
      const k = rankOf(c);
      if (r === 0) r = k;
      else if (r !== k) return 0;
    }
    return n > 0 && n <= BLOF_MAX_PLAY ? 1.5 : 0;
  }

  private decideTurn(v: BlofView): BotDecision<BlofAction, BlofTell> {
    const me = this.seat;
    const hand = v.hand;
    const n = hand.length;
    const cnt = this.cnt;
    cnt.fill(0);
    for (const c of hand) cnt[rankOf(c)]++;
    const of = (r: number): CardId[] => hand.filter((c) => rankOf(c) === r).slice(0, BLOF_MAX_PLAY);
    const opps = this.opponents(v).length;
    const gW = 1 / Math.max(1, opps);
    const caution = this.p.caution;
    const noise = this.p.noise;
    const S = v.pileCount;
    const T = this.tempo(v);
    const To = this.oppTempo(v);
    const greed = this.p.greed;
    const love = this.p.bluffLove * this.bluffy * (v.seats === 2 ? 1 : this.p.bluffLoveN);
    /** Yakalanırsam kenardan alacağım ceza kartlarının bedeli. */
    const pen = this.penalty(v) * caution;
    let claimed = 0;
    for (const pl of v.roundPlays) claimed += pl.count;
    /** İddiam masayı 4'ün üstüne çıkarıyor ve bunu fark ettim → yapma. */
    const blatant = (k: number): boolean => claimed + k > 4 && this.rnd() < this.p.selfCheck;

    // seçenekler: değer + gürültü; en iyisi ve ikincisi (düşünme süresi kararsızlığa göre)
    let best = -Infinity;
    let second = -Infinity;
    let pick: {action: BlofAction; bluff: boolean} | null = null;
    const consider = (val: number, action: BlofAction, bluff: boolean, risk = 0) => {
      if (val > best) {
        second = best;
        best = val;
        pick = {action, bluff};
        this.lastRisk = risk;
      } else if (val > second) second = val;
    };

    if (v.mustOpen) {
      for (let r = 1; r <= 13; r++) {
        if (cnt[r] === 0) continue;
        const cards = of(r);
        const c = cards.length;
        if (c === n) return this.play({t: 'open', seat: me, rank: r, cards}, false, 0.7); // hepsi doğru → bitiriş
        const rt = this.challengeRisk(v, r, c, false, n - c, true);
        const used = new Set(cards);
        consider(c + rt * (c * gW + T) + this.shape(hand, used) + noise * 0.5 * this.gauss(), {t: 'open', seat: me, rank: r, cards}, false, rt);
        if (c < BLOF_MAX_PLAY && n - c - 1 >= 1 && !blatant(c + 1)) {
          const extra = this.junk(hand, r, 1);
          const rp = this.challengeRisk(v, r, c + 1, true, n - c - 1, true);
          for (const x of extra) used.add(x);
          const vp = (1 - rp) * (c + 1 + this.shape(hand, used)) - rp * To * caution - rp * pen + greed + noise * 0.5 * this.gauss();
          consider(vp, {t: 'open', seat: me, rank: r, cards: cards.concat(extra)}, true, rp);
        }
      }
      const chosen = pick! as {action: Extract<BlofAction, {t: 'open'}>; bluff: boolean};
      // 1'e 1: ara sıra doğru açışa bir yalan kart kat (yakalanırsa kendi kartları + kenardan ceza kartları ona)
      if (v.seats === 2 && !chosen.bluff && this.rnd() < this.p.padOpen2) {
        const cs = chosen.action.cards;
        if (cs.length < BLOF_MAX_PLAY && n - cs.length - 1 >= 1 && !blatant(cs.length + 1)) {
          chosen.action = {...chosen.action, cards: cs.concat(this.junk(hand, chosen.action.rank, 1))};
          chosen.bluff = true;
        }
      }
      // kolay: bazen grubunun yalnız bir kısmını açar (acemi)
      if (this.difficulty === 'kolay' && !chosen.bluff && chosen.action.cards.length > 1 && this.rnd() < 0.3) {
        const cs = chosen.action.cards;
        chosen.action = {...chosen.action, cards: cs.slice(0, 1 + Math.floor(this.rnd() * cs.length))};
      }
      return this.play(chosen.action, chosen.bluff, this.closeness(best, second) + 0.15);
    }

    const r = v.rank;
    const mine = of(r);
    const m = mine.length;
    if (m > 0 && m === n) return this.play({t: 'play', seat: me, cards: mine}, false, 0.6); // doğru bitiriş

    consider(this.passValue(v) + noise * 0.5 * this.gauss(), {t: 'pass', seat: me}, false);
    if (m > 0) {
      const used = new Set(mine);
      const rt = this.challengeRisk(v, r, m, false, n - m, false);
      consider(m + rt * ((S + m) * gW + T) + this.shape(hand, used) + noise * 0.3 * this.gauss(), {t: 'play', seat: me, cards: mine}, false, rt);
      if (this.difficulty === 'kolay' && m > 1 && this.rnd() < 0.25) {
        // kolay: bazen elindekinin bir kısmını atar
        consider(m - 0.5 + noise * 0.3 * this.gauss(), {t: 'play', seat: me, cards: mine.slice(0, 1 + Math.floor(this.rnd() * (m - 1)))}, false);
      }
      if (m < BLOF_MAX_PLAY && n - m - 1 >= 1 && !blatant(m + 1)) {
        const extra = this.junk(hand, r, 1);
        for (const x of extra) used.add(x);
        const rp = this.challengeRisk(v, r, m + 1, true, n - m - 1, false);
        const gb = this.pileGroupBonus(v, r, m);
        const vp = (1 - rp) * (m + 1 + this.shape(hand, used)) - rp * (Math.max(0, S * caution - gb) + To + pen) + greed + noise * this.gauss();
        consider(vp, {t: 'play', seat: me, cards: mine.concat(extra)}, true, rp);
      }
    } else {
      const maxB = Math.min(2, n);
      for (let b = 1; b <= maxB; b++) {
        if (blatant(b)) continue;
        const after = n - b;
        const cards = this.junk(hand, r, b);
        const rb = this.challengeRisk(v, r, b, true, after, false);
        const gb = this.pileGroupBonus(v, r);
        // son kartla blöf: tutarsa kazanır ama neredeyse kesin yakalanır (yalnız pas eli vereceksese anlamlı)
        const gain = after === 0 ? WIN : b * love + this.shape(hand, new Set(cards));
        const vb = (1 - rb) * gain - rb * (Math.max(0, S * caution - gb) + To + pen) + noise * this.gauss();
        consider(vb, {t: 'play', seat: me, cards}, true, rb);
      }
    }
    const chosen = pick! as {action: BlofAction; bluff: boolean};
    if (chosen.action.t === 'pass') return {action: chosen.action, delayMs: this.thinkMs(this.closeness(best, second)) * 0.75};
    return this.play(chosen.action, chosen.bluff, this.closeness(best, second));
  }

  /** İki en iyi seçenek ne kadar yakın: 1 = kararsız (uzun düşünür), 0 = apaçık. */
  private closeness(best: number, second: number): number {
    if (!Number.isFinite(second)) return 0;
    return clamp(1 - (best - second) / 2.5, 0, 1);
  }

  /** İnsan gibi düşünme süresi: kararsızken uzun, ara sıra dalgın uzun düşünme. */
  private thinkMs(hard: number): number {
    let ms = this.range(this.p.think) * (0.8 + 0.55 * hard);
    if (this.rnd() < 0.06) ms *= 1.6;
    return ms;
  }

  /** Atış kararı + ipucu + insan gibi bekleme. hard: kararsızlık (0..1). */
  private play(action: BlofAction, bluff: boolean, hard: number): BotDecision<BlofAction, BlofTell> {
    const p = this.p;
    const nervous = bluff ? this.rnd() < p.tellLeak : this.rnd() < p.tellFake;
    const smug = bluff ? this.rnd() < p.tellMask : this.rnd() < 0.25;
    let delay = this.thinkMs(hard);
    if (bluff) delay += this.range(p.hesitate);
    return {action, delayMs: delay, tell: {nervous, smug: smug && !nervous}};
  }
}
