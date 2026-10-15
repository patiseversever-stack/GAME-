// Masadaki kartların görsel düzeni: deste, yığın, eller, toplanan kartlar ve pişti sırası.
// Kural motorundan gelen olayları animasyona çevirir; mantık içermez.
import * as THREE from 'three';
import {BACK_INDEX} from '../render/cardAtlas';
import {CardSystem, flatQuat, type Pose, type Slot} from '../render/cards';
import type {CardId} from '../core/types';
import {CARD, TABLE, type Layout} from './layout';
import {ease, lerp, clamp} from '../fx/anim';
import type {HandInput, ThrowInfo} from '../input/hand';
import type {Stage} from '../render/stage';

export interface Fx {
  deal(): void;
  land(impact: number): void;
  flip(): void;
  throwWhoosh(speed: number): void;
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

export class TableView {
  deck: Slot[] = [];
  pile: Slot[] = [];
  hands: Slot[][] = [];
  stacks: Slot[][] = [];
  pistiRows: Slot[][] = [];
  private bySlot = new Map<Slot, CardId>();

  constructor(private stage: Stage, private cards: CardSystem, public layout: Layout, private hand: HandInput, private fx: Fx) {}

  remaining(s: Slot): number {
    return this.cards.remaining(s);
  }

  cardOf(s: Slot): CardId {
    return this.bySlot.get(s) ?? -1;
  }

  private pose(pos: THREE.Vector3, yaw: number, faceUp: boolean, scale = 1): Pose {
    return {pos, quat: flatQuat(yaw, faceUp), scale};
  }

  deckPose(i: number): Pose {
    const L = this.layout;
    const p = L.deck.clone();
    p.y = TABLE.y + CARD.t * (i + 0.5);
    p.x += Math.sin(i * 12.9898) * 0.0012;
    p.z += Math.cos(i * 78.233) * 0.0012;
    return this.pose(p, L.deckYaw + Math.sin(i * 3.7) * 0.012, false);
  }

  /** Yeni el: 52 yuva kapalı olarak destede. */
  reset(seats: number): void {
    this.deck = this.cards.slots.slice();
    this.pile = [];
    this.hands = Array.from({length: seats}, () => []);
    this.stacks = Array.from({length: seats}, () => []);
    this.pistiRows = Array.from({length: seats}, () => []);
    this.bySlot.clear();
    this.hand.slots = [];
    this.cards.stopAll();
    this.deck.forEach((s, i) => {
      const p = this.deckPose(i);
      this.cards.setCell(s, BACK_INDEX);
      this.cards.setGlow(s, 0);
      s.shadow = i === this.deck.length - 1 ? 0.3 : 0;
      this.cards.setPose(s, p.pos, p.quat);
    });
  }

  private topShadow(list: Slot[], base = 0.28): void {
    list.forEach((s, i) => (s.shadow = i === list.length - 1 ? base : 0));
  }

  /** Görsel karıştırma: deste ikiye ayrılır, iç içe geçer, toplanır. */
  async shuffle(): Promise<void> {
    const n = this.deck.length, half = n >> 1, L = this.layout;
    const side = new THREE.Vector3(Math.cos(L.deckYaw), 0, -Math.sin(L.deckYaw)).multiplyScalar(0.085);
    const ps: Promise<void>[] = [];
    this.deck.forEach((s, i) => {
      const p = this.deckPose(i % half);
      p.pos.add(i < half ? side.clone().negate() : side);
      p.quat.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), i < half ? 0.12 : -0.12));
      ps.push(this.cards.fly(s, p, {dur: 0.22, arc: 0.01}));
    });
    await Promise.all(ps);
    const order: Slot[] = [];
    for (let k = 0; k < half; k++) order.push(this.deck[k], this.deck[k + half]);
    if (n % 2) order.push(this.deck[n - 1]);
    this.deck = order;
    await Promise.all(order.map((s, i) => this.stage.time.wait(i * 0.008).then(() => this.cards.fly(s, this.deckPose(i), {dur: 0.2, arc: 0.012}))));
    this.topShadow(this.deck, 0.3);
  }

  private pilePose(i: number, faceUp: boolean, jitter = 1): Pose {
    const p = this.layout.pile.clone();
    p.x += rnd(-0.014, 0.014) * jitter;
    p.z += rnd(-0.014, 0.014) * jitter;
    p.y = TABLE.y + CARD.t * (i + 0.5);
    return this.pose(p, rnd(-0.38, 0.38) * jitter, faceUp);
  }

  private reveal(s: Slot, c: CardId): void {
    this.bySlot.set(s, c);
    this.cards.setCell(s, c);
  }

  async dealTable(cards: CardId[], faceUp: boolean[]): Promise<void> {
    for (let k = 0; k < cards.length; k++) {
      const s = this.deck.pop()!;
      this.bySlot.set(s, cards[k]);
      if (faceUp[k]) this.cards.setCell(s, cards[k]);
      this.pile.push(s);
      this.fx.deal();
      const p = this.pilePose(this.pile.length - 1, faceUp[k], faceUp[k] ? 0.6 : 1.4);
      const fl = this.cards.fly(s, p, {dur: 0.34, arc: 0.07, onLand: () => this.fx.land(0.3)});
      if (k === cards.length - 1) await fl;
      else await this.stage.time.wait(0.12);
    }
    this.topShadow(this.deck, 0.3);
    this.topShadow(this.pile);
  }

  oppHandPose(seat: number, i: number, n: number): Pose {
    const S = this.layout.seats[seat];
    const k = i - (n - 1) / 2;
    const right = new THREE.Vector3(Math.cos(S.yaw), 0, -Math.sin(S.yaw));
    const p = S.hand.clone().addScaledVector(right, k * this.layout.oppSpread);
    p.y = TABLE.y + CARD.t * (i + 0.5);
    return this.pose(p, S.yaw + k * 0.015, false, this.layout.oppScale);
  }

  async dealHands(deals: {seat: number; card: CardId}[]): Promise<void> {
    const counts = new Map<number, number>();
    for (const d of deals) counts.set(d.seat, (counts.get(d.seat) ?? 0) + 1);
    const flights: Promise<void>[] = [];
    for (const d of deals) {
      const s = this.deck.pop()!;
      this.bySlot.set(s, d.card);
      const list = this.hands[d.seat];
      list.push(s);
      const n = counts.get(d.seat)!;
      let to: Pose;
      if (d.seat === 0) {
        this.cards.setCell(s, d.card);
        to = this.hand.restPose(list.length - 1, n);
      } else to = this.oppHandPose(d.seat, list.length - 1, n);
      this.fx.deal();
      flights.push(this.cards.fly(s, to, {dur: 0.3, arc: d.seat === 0 ? 0.1 : 0.06, ease: ease.outCubic}));
      await this.stage.time.wait(0.085);
    }
    await Promise.all(flights);
    this.topShadow(this.deck, 0.3);
    for (let seat = 1; seat < this.hands.length; seat++) this.hands[seat].forEach(s => (s.shadow = 0.22));
    this.hand.slots = this.hands[0];
    this.hand.layout(false);
  }

  /** Rakip düşünürken elindeki kartlardan biri kalkıp iner (kararsızlık hissi). */
  async botThink(seat: number, dur: number): Promise<void> {
    const list = this.hands[seat];
    const t0 = performance.now();
    let k = 0;
    while (list.length && (performance.now() - t0) / 1000 < dur - 0.3) {
      const s = list[Math.floor(Math.random() * list.length)];
      const i = list.indexOf(s);
      const base = this.oppHandPose(seat, i, list.length);
      const up = {pos: base.pos.clone().add(new THREE.Vector3(0, 0.03, 0.025)), quat: base.quat, scale: base.scale};
      await this.cards.fly(s, up, {dur: 0.16, ease: ease.outCubic});
      await this.stage.time.wait(0.12 + Math.random() * 0.25);
      if (!list.includes(s)) break;
      await this.cards.fly(s, this.oppHandPose(seat, list.indexOf(s), list.length), {dur: 0.16});
      if (++k > 2) break;
      await this.stage.time.wait(0.08);
    }
    const left = dur - (performance.now() - t0) / 1000;
    if (left > 0) await this.stage.time.wait(left);
  }

  /** Kartın yığına inişi. İnsan için kart zaten elde/parmakta; bot için elinden kalkar. */
  playToPile(seat: number, card: CardId, thr?: ThrowInfo): {slot: Slot; landed: Promise<void>} {
    let s: Slot;
    if (seat === 0 && thr) {
      s = thr.slot;
      this.hands[0] = this.hands[0].filter(x => x !== s);
    } else {
      const list = this.hands[seat];
      const idx = Math.floor(Math.random() * list.length);
      s = list.splice(idx, 1)[0];
      list.forEach((x, i) => this.cards.fly(x, this.oppHandPose(seat, i, list.length), {dur: 0.25}));
    }
    this.reveal(s, card);
    this.pile.forEach(x => (x.shadow = 0));
    this.pile.push(s);
    const to = this.pilePose(this.pile.length - 1, true);
    s.shadow = 0.28;
    let landed: Promise<void>;
    if (thr) {
      const power = thr.power;
      to.pos.x += thr.aimX;
      const spin = clamp(thr.vel.x * 2.2, -3, 3) + rnd(-0.5, 0.5);
      this.fx.throwWhoosh(power);
      landed = this.cards.fly(s, to, {
        dur: lerp(0.5, 0.3, power), arc: lerp(0.05, 0.12, power), spin, slide: 0.015 + 0.03 * power, bounce: 0.004,
        ease: ease.outQuad, onLand: () => this.fx.land(0.45 + 0.55 * power),
      });
    } else {
      this.fx.flip();
      landed = this.cards.fly(s, to, {dur: 0.46, arc: 0.13, spin: rnd(-1.2, 1.2), slide: 0.02, bounce: 0.004, ease: ease.outQuad, onLand: () => this.fx.land(0.6)});
    }
    return {slot: s, landed};
  }

  private stackPose(seat: number, i: number): Pose {
    const S = this.layout.seats[seat];
    const p = S.stack.clone();
    p.x += Math.sin(i * 5.1) * 0.003;
    p.z += Math.cos(i * 3.3) * 0.003;
    p.y = TABLE.y + CARD.t * (i + 0.5);
    return this.pose(p, S.yaw + 0.15 + Math.sin(i * 1.7) * 0.05, false);
  }

  private pistiPose(seat: number, i: number): Pose {
    const S = this.layout.seats[seat];
    // pişti kartları yığının içe doğru yanında, açık ve yan yatık sıralanır
    const p = S.stack.clone().addScaledVector(S.pistiDir, 0.2 + i * 0.045);
    p.y = TABLE.y + CARD.t * (i + 0.5);
    return this.pose(p, S.yaw + Math.PI / 2 + Math.sin(i * 2.1) * 0.06, true, 0.78);
  }

  /** Yığını topla. pistiCard verilirse o kart açık olarak pişti sırasına gider. */
  async collect(seat: number, pistiCard: CardId | null): Promise<void> {
    const list = this.pile;
    this.pile = [];
    const stack = this.stacks[seat];
    const flights: Promise<void>[] = [];
    let k = 0;
    for (const s of list.slice().reverse()) {
      const isPisti = pistiCard !== null && this.bySlot.get(s) === pistiCard;
      let to: Pose;
      if (isPisti) {
        const row = this.pistiRows[seat];
        row.push(s);
        to = this.pistiPose(seat, row.length - 1);
        s.shadow = 0.25;
      } else {
        stack.push(s);
        to = this.stackPose(seat, stack.length - 1);
      }
      flights.push(this.stage.time.wait(k * 0.028).then(() => this.cards.fly(s, to, {dur: 0.34, arc: 0.06, ease: ease.inOutCubic})));
      k++;
    }
    await Promise.all(flights);
    this.topShadow(stack, 0.3);
  }

  topScreen(list: 'deck', out: {x: number; y: number}): void {
    const s = this[list][this[list].length - 1];
    if (s) this.stage.project(tmp.copy(s.pos).setY(s.pos.y + 0.01), out);
  }
}
const tmp = new THREE.Vector3();
