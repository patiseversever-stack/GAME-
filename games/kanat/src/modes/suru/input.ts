// SÜRÜ.io touch mapping (§2.6 "Kontroller"): one thumb = relative stick (anchor where the touch starts,
// floating anchor beyond the radius, dead zone 0.10) steering the leader, finger down = "Sıkı Dizi",
// release = "Geniş Kanat" (leader flies straight). Optional "İki Başparmak": left half steers, right half
// holds Tight (mirrored for left-handed players). Keyboard for desktop: WASD/arrows + Space.

export interface StickState {
  /** screen-space direction (x right, y up), unit or 0 inside the dead zone */
  dirX: number;
  dirY: number;
  tight: boolean;
  /** stick anchor in CSS px (for the breath arc), valid while `touching` */
  anchorX: number;
  anchorY: number;
  touching: boolean;
}

const DEADZONE = 0.1;

export class SuruInput {
  readonly state: StickState = { dirX: 0, dirY: 0, tight: false, anchorX: 0, anchorY: 0, touching: false };
  twoThumbs: boolean;
  leftHanded: boolean;
  private readonly el: HTMLElement;
  private steerId = -1;
  private tightId = -1;
  private ax = 0;
  private ay = 0;
  private readonly keys = new Set<string>();
  private readonly onDown: (e: PointerEvent) => void;
  private readonly onMove: (e: PointerEvent) => void;
  private readonly onUp: (e: PointerEvent) => void;
  private readonly onKey: (e: KeyboardEvent) => void;
  /** any input at all (FTUE / idle detection) */
  lastInputAt = 0;
  enabled = true;

  constructor(el: HTMLElement, opts: { twoThumbs?: boolean; leftHanded?: boolean } = {}) {
    this.el = el;
    this.twoThumbs = opts.twoThumbs ?? false;
    this.leftHanded = opts.leftHanded ?? false;
    this.onDown = (e) => this.down(e);
    this.onMove = (e) => this.move(e);
    this.onUp = (e) => this.up(e);
    this.onKey = (e) => {
      const k = e.key.toLowerCase();
      if (e.type === 'keydown') this.keys.add(k);
      else this.keys.delete(k);
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
      this.lastInputAt = performance.now();
    };
    el.addEventListener('pointerdown', this.onDown);
    window.addEventListener('pointermove', this.onMove, { passive: true });
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onUp);
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onKey);
  }

  private radius(): number {
    const r = this.el.getBoundingClientRect();
    return 0.11 * Math.min(r.width || 390, r.height || 844);
  }

  private isSteerSide(x: number): boolean {
    if (!this.twoThumbs) return true;
    const r = this.el.getBoundingClientRect();
    const left = x - r.left < r.width / 2;
    return this.leftHanded ? !left : left;
  }

  private down(e: PointerEvent): void {
    if (!this.enabled) return;
    this.lastInputAt = performance.now();
    if (this.isSteerSide(e.clientX)) {
      if (this.steerId !== -1) return;
      this.steerId = e.pointerId;
      this.ax = e.clientX;
      this.ay = e.clientY;
      this.state.anchorX = e.clientX;
      this.state.anchorY = e.clientY;
      this.state.touching = true;
      this.state.dirX = 0;
      this.state.dirY = 0;
      if (!this.twoThumbs) this.state.tight = true;
    } else {
      this.tightId = e.pointerId;
      this.state.tight = true;
    }
    try {
      this.el.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic events (tests) cannot be captured */
    }
  }

  private move(e: PointerEvent): void {
    if (e.pointerId !== this.steerId) return;
    this.lastInputAt = performance.now();
    const R = this.radius();
    let vx = (e.clientX - this.ax) / R;
    let vy = (e.clientY - this.ay) / R;
    const l = Math.hypot(vx, vy);
    if (l > 1) {
      // floating anchor: the thumb never reaches the "end of the road"
      this.ax = e.clientX - (vx / l) * R;
      this.ay = e.clientY - (vy / l) * R;
      vx /= l;
      vy /= l;
    }
    this.state.anchorX = this.ax;
    this.state.anchorY = this.ay;
    const m = Math.hypot(vx, vy);
    if (m < DEADZONE) {
      this.state.dirX = 0;
      this.state.dirY = 0;
    } else {
      this.state.dirX = vx / m;
      this.state.dirY = -vy / m;
    }
  }

  private up(e: PointerEvent): void {
    if (e.pointerId === this.steerId) {
      this.steerId = -1;
      this.state.touching = false;
      this.state.dirX = 0;
      this.state.dirY = 0;
      if (!this.twoThumbs) this.state.tight = false;
    }
    if (e.pointerId === this.tightId) {
      this.tightId = -1;
      this.state.tight = false;
    }
  }

  /** merge keyboard into the stick (desktop dev) */
  poll(): StickState {
    if (this.keys.size > 0 && this.steerId === -1) {
      let x = 0;
      let y = 0;
      if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
      if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;
      if (this.keys.has('w') || this.keys.has('arrowup')) y += 1;
      if (this.keys.has('s') || this.keys.has('arrowdown')) y -= 1;
      const l = Math.hypot(x, y);
      this.state.dirX = l > 0 ? x / l : 0;
      this.state.dirY = l > 0 ? y / l : 0;
      this.state.tight = this.keys.has(' ');
    } else if (this.keys.size === 0 && this.steerId === -1 && this.tightId === -1) {
      this.state.tight = false;
    }
    return this.state;
  }

  dispose(): void {
    this.el.removeEventListener('pointerdown', this.onDown);
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('pointercancel', this.onUp);
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('keyup', this.onKey);
  }
}
