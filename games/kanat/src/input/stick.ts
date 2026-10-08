// "Drag anywhere" relative stick with a floating anchor (§2.2).
// The touch-down point becomes the anchor; v = (finger − anchor) / R. When |v| > 1 the anchor slides
// after the finger so the thumb never hits "the end of the road".

export class RelativeStick {
  active = false;
  pointerId = -1;
  anchorX = 0;
  anchorY = 0;
  fingerX = 0;
  fingerY = 0;
  radius = 45;
  /** Unit-disk vector, screen space (+y down). */
  vx = 0;
  vy = 0;
  /** ms timestamp of touch-down (hold detection). */
  downAt = 0;

  begin(pointerId: number, x: number, y: number, radius: number, atMs = 0): void {
    this.active = true;
    this.pointerId = pointerId;
    this.anchorX = x;
    this.anchorY = y;
    this.fingerX = x;
    this.fingerY = y;
    this.radius = Math.max(8, radius);
    this.vx = 0;
    this.vy = 0;
    this.downAt = atMs;
  }

  move(x: number, y: number): void {
    if (!this.active) return;
    this.fingerX = x;
    this.fingerY = y;
    let vx = (x - this.anchorX) / this.radius;
    let vy = (y - this.anchorY) / this.radius;
    const m = Math.sqrt(vx * vx + vy * vy);
    if (m > 1) {
      vx /= m;
      vy /= m;
      // floating anchor: keep the finger exactly one radius away
      this.anchorX = x - vx * this.radius;
      this.anchorY = y - vy * this.radius;
    }
    this.vx = vx;
    this.vy = vy;
  }

  end(): void {
    this.active = false;
    this.pointerId = -1;
    this.vx = 0;
    this.vy = 0;
  }
}
