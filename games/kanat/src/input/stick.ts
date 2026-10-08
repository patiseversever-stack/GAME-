// "Drag anywhere" relative stick with a floating anchor (§2.2). The anchor math is the shared
// src/sim/inputQuant.ts `updateAnchor` (identical for bots and replays); this class only adds the
// pointer bookkeeping the input layer needs (pointer id, finger position, touch-down time).

import { updateAnchor } from './gesture.ts';

export class RelativeStick {
  active = false;
  pointerId = -1;
  fingerX = 0;
  fingerY = 0;
  radius = 45;
  /** ms timestamp of touch-down (hold detection). */
  downAt = 0;
  private readonly anchor = new Float64Array(2);
  private readonly v = new Float64Array(2);

  get anchorX(): number {
    return this.anchor[0];
  }

  get anchorY(): number {
    return this.anchor[1];
  }

  /** Unit-disk vector, screen space (+y down). */
  get vx(): number {
    return this.v[0];
  }

  get vy(): number {
    return this.v[1];
  }

  begin(pointerId: number, x: number, y: number, radius: number, atMs = 0): void {
    this.active = true;
    this.pointerId = pointerId;
    this.anchor[0] = x;
    this.anchor[1] = y;
    this.fingerX = x;
    this.fingerY = y;
    this.radius = Math.max(8, radius);
    this.v[0] = 0;
    this.v[1] = 0;
    this.downAt = atMs;
  }

  move(x: number, y: number): void {
    if (!this.active) return;
    this.fingerX = x;
    this.fingerY = y;
    updateAnchor(this.anchor, x, y, this.radius, this.v);
  }

  end(): void {
    this.active = false;
    this.pointerId = -1;
    this.v[0] = 0;
    this.v[1] = 0;
  }
}
