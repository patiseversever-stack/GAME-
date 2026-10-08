// Ghost playback: expands GhostInput back into the exact Command sequence the sim consumed (owner: replay). PURE.

import type { Command } from '../types.ts';
import type { GhostInput } from './ghostCode.ts';

/**
 * Full expansion. Within one tick, axis-stream commands come first (stream order), then events
 * (list order) — the same order Recorder captured them in.
 */
export function toCommands(input: GhostInput, actorId = 0): Command[] {
  const out: Command[] = [];
  const n = input.axisCount;
  const ev = input.events;
  let i = 0;
  let e = 0;
  while (i < n || e < ev.length) {
    if (i < n && (e >= ev.length || input.axisTick[i] <= ev[e].tick)) {
      out.push({ tick: input.axisTick[i], actorId, cmd: 'axis', args: [input.sx[i], input.sy[i]] });
      i++;
    } else {
      const x = ev[e++];
      out.push({ tick: x.tick, actorId, cmd: x.cmd, args: x.args.slice() });
    }
  }
  return out;
}

/**
 * Tick-by-tick feeder for a ghost FlightSim running next to the player. Allocation-free after
 * construction: axis commands reuse pooled objects (the sim must copy values, not keep references),
 * events are pre-built once.
 */
export class ReplayCursor {
  readonly actorId: number;
  private readonly input: GhostInput;
  private readonly eventCmds: Command[];
  private readonly pool: Command[] = [];
  private i = 0;
  private e = 0;

  constructor(input: GhostInput, actorId: number) {
    this.input = input;
    this.actorId = actorId;
    this.eventCmds = input.events.map((x) => ({ tick: x.tick, actorId, cmd: x.cmd, args: x.args.slice() }));
    this.pool.push({ tick: 0, actorId, cmd: 'axis', args: [0, 0] });
  }

  /** True once every recorded command has been emitted. */
  get done(): boolean {
    return this.i >= this.input.axisCount && this.e >= this.eventCmds.length;
  }

  /**
   * Appends the commands recorded for `tick` to `out` and returns how many were appended.
   * Call with increasing ticks; commands for skipped (earlier) ticks are dropped.
   */
  commandsAt(tick: number, out: Command[]): number {
    const inp = this.input;
    let count = 0;
    let used = 0;
    while (this.i < inp.axisCount && inp.axisTick[this.i] < tick) this.i++;
    while (this.e < this.eventCmds.length && this.eventCmds[this.e].tick < tick) this.e++;
    while (this.i < inp.axisCount && inp.axisTick[this.i] === tick) {
      if (used === this.pool.length) this.pool.push({ tick: 0, actorId: this.actorId, cmd: 'axis', args: [0, 0] });
      const c = this.pool[used++];
      c.tick = tick;
      c.args[0] = inp.sx[this.i];
      c.args[1] = inp.sy[this.i];
      out.push(c);
      this.i++;
      count++;
    }
    while (this.e < this.eventCmds.length && this.eventCmds[this.e].tick === tick) {
      out.push(this.eventCmds[this.e++]);
      count++;
    }
    return count;
  }

  reset(): void {
    this.i = 0;
    this.e = 0;
  }
}
