// Pişti botu: yalnızca kendi koltuğunun görebildiği bilgiyle (PlayerView + gördüğü olaylar)
// her kartı beklenen puana göre değerlendirir. Rastgelelik sadece enjekte edilen rnd'den gelir.

import {type CardId, type PistiEvent, type PlayerView, cardId, rankOf} from '../core/types';

export interface BotPersonality {
  /** 0..1: oynanan her kartı aklında tutma olasılığı (kart sayma). */
  memory: number;
  /** 0..1: 1 = hep en iyi hamle, düşük = softmax gürültüsü. */
  skill: number;
  /** 0..1: Valeyi ucuz yığına harcamaktan kaçınma eğilimi. */
  jackPatience: number;
}

const CARD_BONUS = 0.12; // her kart, +3 çoğunluk puanına yaklaşık katkısı
const HIDDEN_AVG = 0.3; // kapalı kartın ortalama değeri
const JACK_RISK = 0.8; // rakibin Valesiyle alma ihtimalinin ağırlığı
const LATER_OPP_WEIGHT = 0.4; // sıradaki ilk rakipten sonraki rakiplerin riski daha az
const DUMP_BONUS = 0.1; // değersiz kartı yığına atma eğilimi
const CLUB2 = cardId('C', 2);
const DIAMOND10 = cardId('D', 10);

/** Kartın puan değeri: As 1, Vale 1, ♣2 → 2, ♦10 → 3. */
const VALUE = ((): Float64Array => {
  const v = new Float64Array(52);
  for (let c = 0; c < 52; c++) {
    const r = rankOf(c);
    v[c] = r === 1 || r === 11 ? 1 : c === CLUB2 ? 2 : c === DIAMOND10 ? 3 : 0;
  }
  return v;
})();

/** Bilinmeyen u karttan h kartlık elde, bilinmeyen k kopyadan en az birinin olma olasılığı. */
function pHold(k: number, u: number, h: number): number {
  if (k <= 0 || h <= 0) return 0;
  let none = 1; // 1 − C(u−k, h) / C(u, h)
  for (let i = 0; i < h; i++) {
    const rest = u - k - i;
    if (rest <= 0) return 1;
    none *= rest / (u - i);
  }
  return 1 - none;
}

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

export class PistiBot {
  private readonly p: BotPersonality;
  private readonly seen = new Uint8Array(52); // hatırlanan kartlar
  private readonly known = new Uint8Array(52); // seen + el + yığındaki açık kartlar (choose içinde)
  private readonly unseen = new Int8Array(14); // rütbe başına görülmemiş kopya sayısı
  private scores = new Float64Array(8);

  // choose() boyunca geçerli bağlam (allocation olmasın diye alan olarak tutulur)
  private unknown = 0;
  private topRank = 0;
  private pileCount = 0;
  private pileVal = 0;
  private hasMatch = false;
  private futureFactor = 1;
  private nOpp = 0;
  private readonly oppHand = new Int8Array(4);
  private readonly oppW = new Float64Array(4);

  constructor(
    private readonly seat: number,
    personality: BotPersonality,
    private readonly rnd: () => number,
  ) {
    this.p = {
      memory: clamp01(personality.memory),
      skill: clamp01(personality.skill),
      jackPatience: clamp01(personality.jackPatience),
    };
  }

  /** Bu koltuğun hatırladığı kart mı (test ve hata ayıklama için). */
  knows(card: CardId): boolean {
    return this.seen[card] === 1;
  }

  /** Sadece bu koltuğun meşru olarak görebildiği bilgiyi hatırlar. */
  observe(ev: PistiEvent): void {
    switch (ev.t) {
      case 'tableDeal':
        for (let i = 0; i < ev.cards.length; i++) if (ev.faceUp[i]) this.seen[ev.cards[i]] = 1;
        break;
      case 'handDeal':
        for (const d of ev.deals) if (d.seat === this.seat) this.seen[d.card] = 1;
        break;
      case 'play':
        // Her kart tek kez oynanır: fark edip etmediği bir kez zarla belirlenir.
        if (this.seen[ev.card] === 0 && this.rnd() < this.p.memory) this.seen[ev.card] = 1;
        break;
      default:
        break; // capture/finalSweep/gameOver: oynanan kart zaten görüldü, yeni bilgi yok
    }
  }

  choose(view: PlayerView): CardId {
    const hand = view.hand;
    const n = hand.length;
    if (n === 0) throw new Error('Bot: elde kart yok');
    this.prepare(view);
    if (this.scores.length < n) this.scores = new Float64Array(n);
    const scores = this.scores;

    let bestIdx = 0;
    for (let i = 0; i < n; i++) {
      const s = this.score(hand[i]);
      scores[i] = s;
      const b = scores[bestIdx];
      if (s > b + 1e-9 || (s > b - 1e-9 && hand[i] < hand[bestIdx])) bestIdx = i;
    }

    const temp = (1 - this.p.skill) * 2;
    if (temp < 1e-6 || n === 1) return hand[bestIdx];

    // Softmax: düşük beceri → daha çok gürültü
    const max = scores[bestIdx];
    let sum = 0;
    for (let i = 0; i < n; i++) {
      scores[i] = Math.exp((scores[i] - max) / temp);
      sum += scores[i];
    }
    let r = this.rnd() * sum;
    for (let i = 0; i < n; i++) {
      r -= scores[i];
      if (r < 0) return hand[i];
    }
    return hand[bestIdx];
  }

  /** Görülmemiş kart sayıları, yığın değeri ve rakip eller. */
  private prepare(view: PlayerView): void {
    const known = this.known;
    known.set(this.seen);
    for (const c of view.hand) known[c] = 1;
    for (const c of view.pileVisible) known[c] = 1;
    this.unseen.fill(0);
    let unknown = 0;
    for (let c = 0; c < 52; c++) {
      if (known[c] === 0) {
        this.unseen[rankOf(c)]++;
        unknown++;
      }
    }
    this.unknown = unknown;

    // Yığın
    this.pileCount = view.pileCount;
    this.topRank = view.pileTop === null ? 0 : rankOf(view.pileTop);
    let val = (view.pileCount - view.pileVisible.length) * HIDDEN_AVG;
    for (const c of view.pileVisible) val += VALUE[c] + CARD_BONUS;
    this.pileVal = val;
    this.hasMatch = false;
    for (const c of view.hand) if (this.topRank !== 0 && rankOf(c) === this.topRank) this.hasMatch = true;
    // Deste bittiyse elde tutulan Vale boşa gidebilir: son kartlarda Vale cimriliği azalır.
    this.futureFactor = view.deckCount === 0 ? Math.min(1, (view.hand.length - 1) / 3) : 1;

    // Sıradaki rakipler (takım arkadaşından gelen risk yok)
    const seat = view.seat;
    let no = 0;
    for (let off = 1; off < view.seats; off++) {
      const o = (seat + off) % view.seats;
      if (view.teams[o] === view.teams[seat]) continue;
      this.oppHand[no] = view.handCounts[o];
      this.oppW[no] = no === 0 ? 1 : LATER_OPP_WEIGHT;
      no++;
    }
    this.nOpp = no;
  }

  /** Bir kartın beklenen puanı: yakalıyorsa kazanç, bırakıyorsa -beklenen kayıp. */
  private score(c: CardId): number {
    const r = rankOf(c);
    const jack = r === 11;
    const cv = VALUE[c] + CARD_BONUS;

    if (this.pileCount > 0 && (jack || r === this.topRank)) {
      const same = r === this.topRank;
      let gain = this.pileVal + cv;
      if (same && this.pileCount === 1) gain += jack ? 20 : 10; // pişti
      if (jack && !same) {
        // Vale harcama bedeli: yığın ucuzsa büyük
        const base = Math.min(4, Math.max(1.5, 4 - 0.5 * this.pileVal));
        gain -= this.p.jackPatience * base * this.futureFactor;
        if (this.hasMatch) gain -= 1.5; // aynı değerli kart varken Vale harcama
      }
      return gain;
    }

    // Yığına bırakma: sıradaki rakip alırsa kaybımız
    const newVal = this.pileVal + cv;
    const k = this.unseen[r];
    const j = jack ? 0 : this.unseen[11];
    const bonus = this.pileCount === 0 ? (jack ? 20 : 10) : 0;
    const u = this.unknown;
    let loss = 0;
    for (let i = 0; i < this.nOpp; i++) {
      const h = this.oppHand[i];
      let risk = pHold(k, u, h) * (newVal + bonus);
      if (j > 0) risk += pHold(j, u, h) * newVal * JACK_RISK;
      loss += this.oppW[i] * risk;
    }
    let s = -loss;
    if (r >= 2 && r <= 10 && VALUE[c] === 0) s += DUMP_BONUS;
    return s;
  }
}
