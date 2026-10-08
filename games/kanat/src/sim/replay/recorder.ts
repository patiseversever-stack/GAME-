// Live-flight input recorder (owner: replay). PURE, allocation-free per axis command (amortized growth).
//
// Feed it every Command the sim consumes (in the order the sim consumes them); it keeps only the
// commands of its actor and packs them into the compact GhostInput streams that ghostCode encodes.

import type { Command } from '../types.ts';
import { commandProblem } from './ghostCode.ts';
import type { GhostEvent, GhostInput } from './ghostCode.ts';

export class Recorder {
  readonly actorId: number;
  private ticks: Int32Array;
  private xs: Int8Array;
  private ys: Int8Array;
  private n = 0;
  private evs: GhostEvent[] = [];
  private lastTick = -1;
  private lastEventTick = -1;
  private problem: string | null = null;

  constructor(actorId = 0, initialCapacity = 4096) {
    this.actorId = actorId;
    const cap = initialCapacity > 16 ? initialCapacity : 16;
    this.ticks = new Int32Array(cap);
    this.xs = new Int8Array(cap);
    this.ys = new Int8Array(cap);
  }

  /** False once an out-of-contract command was seen; the flight then cannot become a ghost code. */
  get ok(): boolean {
    return this.problem === null;
  }

  get error(): string | null {
    return this.problem;
  }

  get axisCount(): number {
    return this.n;
  }

  get eventCount(): number {
    return this.evs.length;
  }

  /** Tick of the last recorded command (-1 when empty). */
  get lastCommandTick(): number {
    return this.lastTick;
  }

  /** Records one command if it belongs to this recorder's actor. Never throws. */
  push(c: Command): void {
    if (this.problem !== null || c.actorId !== this.actorId) return;
    const p = commandProblem(c);
    if (p !== null) {
      this.problem = p;
      return;
    }
    if (c.tick < this.lastTick) {
      this.problem = `tick ${c.tick} after ${this.lastTick}`;
      return;
    }
    this.lastTick = c.tick;
    // An axis command goes to the stream unless an event was already recorded in this tick
    // (replay emits stream commands before events within a tick, so this keeps the exact order).
    if (c.cmd === 'axis' && this.lastEventTick !== c.tick) {
      if (this.n === this.ticks.length) this.grow();
      this.ticks[this.n] = c.tick;
      this.xs[this.n] = c.args[0];
      this.ys[this.n] = c.args[1];
      this.n++;
    } else {
      this.evs.push({ tick: c.tick, cmd: c.cmd, args: c.args.slice() });
      this.lastEventTick = c.tick;
    }
  }

  pushAll(cmds: readonly Command[]): void {
    for (let i = 0; i < cmds.length; i++) this.push(cmds[i]);
  }

  /** Snapshot (copy) of what has been recorded so far. */
  input(): GhostInput {
    return {
      axisCount: this.n,
      axisTick: this.ticks.slice(0, this.n),
      sx: this.xs.slice(0, this.n),
      sy: this.ys.slice(0, this.n),
      events: this.evs.map((e) => ({ tick: e.tick, cmd: e.cmd, args: e.args.slice() })),
    };
  }

  /** Clears the recording (keeps the allocated capacity) for the next attempt. */
  reset(): void {
    this.n = 0;
    this.evs = [];
    this.lastTick = -1;
    this.lastEventTick = -1;
    this.problem = null;
  }

  private grow(): void {
    const cap = this.ticks.length * 2;
    const t = new Int32Array(cap);
    const x = new Int8Array(cap);
    const y = new Int8Array(cap);
    t.set(this.ticks);
    x.set(this.xs);
    y.set(this.ys);
    this.ticks = t;
    this.xs = x;
    this.ys = y;
  }
}

/** Packs a complete command list (bots, tests, debug replays). Throws RangeError for out-of-contract commands. */
export function recordCommands(cmds: readonly Command[], actorId = 0): GhostInput {
  const r = new Recorder(actorId, cmds.length + 16);
  r.pushAll(cmds);
  if (!r.ok) throw new RangeError(`recordCommands: ${r.error}`);
  return r.input();
}
