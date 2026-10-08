// Network seam (§4.3). Only the LocalAdapter exists: no sockets, servers or accounts.
// Players and bots both send their commands through a NetAdapter, so a server adapter can later
// replace LocalAdapter without touching modes (KANAT ghosts: replay; SÜRÜ.io: server-authoritative 30 Hz).

import type { Command } from '../sim/types.ts';

export interface NetAdapter<TCmd = Command, TSnap = unknown> {
  /** Submit a local command (player input or bot decision). */
  send(cmd: TCmd): void;
  /** Commands accepted for simulation (local echo now; server-confirmed later). */
  onCommand(fn: (cmd: TCmd) => void): () => void;
  /** Authoritative snapshots (server adapter only; LocalAdapter publishes the local sim's). */
  onSnapshot(fn: (snap: TSnap) => void): () => void;
  /** Shared clock in sim ticks (local: the loop's tick counter). */
  now(): number;
}

/**
 * Loopback adapter. Commands are delivered synchronously to listeners and buffered per tick so a
 * fixed-step mode can drain exactly the commands for the tick it is about to simulate.
 */
export class LocalAdapter<TCmd extends { tick: number } = Command, TSnap = unknown> implements NetAdapter<TCmd, TSnap> {
  private readonly cmdListeners = new Set<(c: TCmd) => void>();
  private readonly snapListeners = new Set<(s: TSnap) => void>();
  private queue: TCmd[] = [];
  private tickSource: () => number;

  constructor(tickSource: () => number = () => 0) {
    this.tickSource = tickSource;
  }

  setTickSource(fn: () => number): void {
    this.tickSource = fn;
  }

  send(cmd: TCmd): void {
    this.queue.push(cmd);
    for (const fn of this.cmdListeners) fn(cmd);
  }

  onCommand(fn: (cmd: TCmd) => void): () => void {
    this.cmdListeners.add(fn);
    return () => this.cmdListeners.delete(fn);
  }

  onSnapshot(fn: (snap: TSnap) => void): () => void {
    this.snapListeners.add(fn);
    return () => this.snapListeners.delete(fn);
  }

  /** Local sim publishes its snapshot (keeps render/UI code identical to the future online path). */
  publishSnapshot(snap: TSnap): void {
    for (const fn of this.snapListeners) fn(snap);
  }

  now(): number {
    return this.tickSource();
  }

  /**
   * Move every queued command with `tick <= upToTick` into `out` (in send order) and remove them.
   * Late commands (tick already simulated) are applied on the next tick — same as a server would.
   */
  drain(upToTick: number, out: TCmd[]): number {
    let n = 0;
    let w = 0;
    for (let i = 0; i < this.queue.length; i++) {
      const c = this.queue[i];
      if (c.tick <= upToTick) {
        out.push(c);
        n++;
      } else {
        this.queue[w++] = c;
      }
    }
    this.queue.length = w;
    return n;
  }

  get pending(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue = [];
  }
}
