// Allocation-free SimEvent queue. Event objects come from per-type rings (64 each) and are written into a
// double-buffered list: drain() hands out the list filled since the previous drain and starts filling the other.
// CONTRACT for consumers: process (or copy) drained events before the next drain() — objects are recycled.

import type { SimEvent, SurfaceClass } from './types.ts';

type Ev<T extends SimEvent['type']> = Extract<SimEvent, { type: T }>;

const RING = 64;

class Pool<E> {
  private readonly items: E[] = [];
  private i = 0;
  constructor(make: () => E) {
    for (let k = 0; k < RING; k++) this.items.push(make());
  }
  next(): E {
    const e = this.items[this.i];
    this.i = (this.i + 1) % RING;
    return e;
  }
}

export class EventQueue {
  private filling: SimEvent[] = [];
  private handed: SimEvent[] = [];
  /** Hard cap per drain cycle (protects against a consumer that never drains). */
  static readonly MAX = 512;

  private readonly pWings = new Pool<Ev<'wingsOpen'>>(() => ({ type: 'wingsOpen', tick: 0 }));
  private readonly pMult = new Pool<Ev<'multUp'>>(() => ({ type: 'multUp', tick: 0, mult: 0 }));
  private readonly pBreak = new Pool<Ev<'comboBreak'>>(() => ({ type: 'comboBreak', tick: 0 }));
  private readonly pGraze = new Pool<Ev<'graze'>>(() => ({ type: 'graze', tick: 0, points: 0, strength: 0, pos: [0, 0, 0], cls: 'none', side: 1 }));
  private readonly pGate = new Pool<Ev<'gate'>>(() => ({ type: 'gate', tick: 0, index: 0, points: 0, chain: 0 }));
  private readonly pGateMiss = new Pool<Ev<'gateMissed'>>(() => ({ type: 'gateMissed', tick: 0, index: 0 }));
  private readonly pThIn = new Pool<Ev<'thermalEnter'>>(() => ({ type: 'thermalEnter', tick: 0, index: 0 }));
  private readonly pThOut = new Pool<Ev<'thermalExit'>>(() => ({ type: 'thermalExit', tick: 0, index: 0 }));
  private readonly pThread = new Pool<Ev<'balloonThread'>>(() => ({ type: 'balloonThread', tick: 0, a: 0, b: 0, points: 0, mult: 1 }));
  private readonly pBounce = new Pool<Ev<'bounce'>>(() => ({ type: 'bounce', tick: 0, pos: [0, 0, 0], cls: 'none' }));
  private readonly pCrash = new Pool<Ev<'crash'>>(() => ({ type: 'crash', tick: 0, pos: [0, 0, 0], cls: 'none' }));
  private readonly pZone = new Pool<Ev<'enterLandingZone'>>(() => ({ type: 'enterLandingZone', tick: 0 }));
  private readonly pChute = new Pool<Ev<'parachuteOpen'>>(() => ({ type: 'parachuteOpen', tick: 0, heightAGL: 0, auto: false }));
  private readonly pLanded = new Pool<Ev<'landed'>>(() => ({ type: 'landed', tick: 0, distToTarget: 0, soft: false, points: 0 }));
  private readonly pHalf = new Pool<Ev<'halfFlight'>>(() => ({ type: 'halfFlight', tick: 0 }));
  private readonly pWarn = new Pool<Ev<'warning'>>(() => ({ type: 'warning', tick: 0, tau: 0, side: 1, pos: [0, 0, 0] }));

  private push(e: SimEvent): void {
    if (this.filling.length < EventQueue.MAX) this.filling.push(e);
  }

  /** Events since the previous drain (valid until the next drain). */
  drain(): SimEvent[] {
    const out = this.filling;
    this.filling = this.handed;
    this.filling.length = 0;
    this.handed = out;
    return out;
  }

  clear(): void {
    this.filling.length = 0;
    this.handed.length = 0;
  }

  get pending(): number {
    return this.filling.length;
  }

  wingsOpen(tick: number): void {
    const e = this.pWings.next();
    e.tick = tick;
    this.push(e);
  }
  multUp(tick: number, mult: number): void {
    const e = this.pMult.next();
    e.tick = tick;
    e.mult = mult;
    this.push(e);
  }
  comboBreak(tick: number): void {
    const e = this.pBreak.next();
    e.tick = tick;
    this.push(e);
  }
  graze(tick: number, points: number, strength: number, x: number, y: number, z: number, cls: SurfaceClass, side: -1 | 1): void {
    const e = this.pGraze.next();
    e.tick = tick;
    e.points = points;
    e.strength = strength;
    e.pos[0] = x;
    e.pos[1] = y;
    e.pos[2] = z;
    e.cls = cls;
    e.side = side;
    this.push(e);
  }
  gate(tick: number, index: number, points: number, chain: number): void {
    const e = this.pGate.next();
    e.tick = tick;
    e.index = index;
    e.points = points;
    e.chain = chain;
    this.push(e);
  }
  gateMissed(tick: number, index: number): void {
    const e = this.pGateMiss.next();
    e.tick = tick;
    e.index = index;
    this.push(e);
  }
  thermalEnter(tick: number, index: number): void {
    const e = this.pThIn.next();
    e.tick = tick;
    e.index = index;
    this.push(e);
  }
  thermalExit(tick: number, index: number): void {
    const e = this.pThOut.next();
    e.tick = tick;
    e.index = index;
    this.push(e);
  }
  balloonThread(tick: number, a: number, b: number, points: number, mult: number): void {
    const e = this.pThread.next();
    e.tick = tick;
    e.a = a;
    e.b = b;
    e.points = points;
    e.mult = mult;
    this.push(e);
  }
  bounce(tick: number, x: number, y: number, z: number, cls: SurfaceClass): void {
    const e = this.pBounce.next();
    e.tick = tick;
    e.pos[0] = x;
    e.pos[1] = y;
    e.pos[2] = z;
    e.cls = cls;
    this.push(e);
  }
  crash(tick: number, x: number, y: number, z: number, cls: SurfaceClass): void {
    const e = this.pCrash.next();
    e.tick = tick;
    e.pos[0] = x;
    e.pos[1] = y;
    e.pos[2] = z;
    e.cls = cls;
    this.push(e);
  }
  enterLandingZone(tick: number): void {
    const e = this.pZone.next();
    e.tick = tick;
    this.push(e);
  }
  parachuteOpen(tick: number, heightAGL: number, auto: boolean): void {
    const e = this.pChute.next();
    e.tick = tick;
    e.heightAGL = heightAGL;
    e.auto = auto;
    this.push(e);
  }
  landed(tick: number, distToTarget: number, soft: boolean, points: number): void {
    const e = this.pLanded.next();
    e.tick = tick;
    e.distToTarget = distToTarget;
    e.soft = soft;
    e.points = points;
    this.push(e);
  }
  halfFlight(tick: number): void {
    const e = this.pHalf.next();
    e.tick = tick;
    this.push(e);
  }
  warning(tick: number, tau: number, side: -1 | 1, x: number, y: number, z: number): void {
    const e = this.pWarn.next();
    e.tick = tick;
    e.tau = tau;
    e.side = side;
    e.pos[0] = x;
    e.pos[1] = y;
    e.pos[2] = z;
    this.push(e);
  }
}
