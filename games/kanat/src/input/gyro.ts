// Optional gyro steering (§2.2): Off / Roll / Full. 3° deadzone, 28° = full deflection, 8 Hz one-pole
// low-pass, neutral calibrated at "Atla". iOS needs DeviceOrientationEvent.requestPermission() from a
// user gesture (call requestGyroPermission() inside the settings toggle / jump button handler).

export type GyroMode = 'off' | 'roll' | 'full';

export const GYRO_TUNING = { deadzoneDeg: 3, fullDeg: 28, cutoffHz: 8 } as const;

export type GyroPermission = 'granted' | 'denied' | 'unsupported';

interface OrientationEventCtor {
  requestPermission?: () => Promise<'granted' | 'denied' | 'default'>;
}

/** Ask for motion access (iOS 13+). Must run inside a user-gesture handler. */
export async function requestGyroPermission(win: unknown = globalThis): Promise<GyroPermission> {
  const ctor = (win as { DeviceOrientationEvent?: OrientationEventCtor }).DeviceOrientationEvent;
  if (!ctor) return 'unsupported';
  if (typeof ctor.requestPermission !== 'function') return 'granted'; // Android / desktop: no prompt
  try {
    const r = await ctor.requestPermission();
    return r === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}

function shape(deg: number): number {
  const a = Math.abs(deg);
  if (a <= GYRO_TUNING.deadzoneDeg) return 0;
  const v = Math.min(1, (a - GYRO_TUNING.deadzoneDeg) / (GYRO_TUNING.fullDeg - GYRO_TUNING.deadzoneDeg));
  return deg < 0 ? -v : v;
}

export class GyroInput {
  mode: GyroMode = 'off';
  /** Filtered device angles (deg) in screen space: roll = right-down tilt, pitch = top-toward-player. */
  rollDeg = 0;
  pitchDeg = 0;
  neutralRoll = 0;
  neutralPitch = 0;
  /** Shaped output in [-1,1]. */
  roll = 0;
  pitch = 0;
  hasData = false;
  private lastT = -1;
  private listening = false;
  private readonly onEvt = (e: unknown) => {
    const o = e as { beta: number | null; gamma: number | null; timeStamp?: number };
    if (o.beta === null || o.gamma === null || o.beta === undefined || o.gamma === undefined) return;
    this.feed(o.beta, o.gamma, o.timeStamp ?? 0, screenAngle());
  };

  attach(win: { addEventListener(t: string, f: (e: unknown) => void): void } | undefined = globalThis as never): void {
    if (this.listening || !win) return;
    this.listening = true;
    win.addEventListener('deviceorientation', this.onEvt);
  }

  detach(win: { removeEventListener(t: string, f: (e: unknown) => void): void } | undefined = globalThis as never): void {
    if (!this.listening || !win) return;
    this.listening = false;
    win.removeEventListener('deviceorientation', this.onEvt);
  }

  /**
   * One orientation sample. beta/gamma per DeviceOrientationEvent (deg); screenAngleDeg = 0/90/180/270.
   */
  feed(beta: number, gamma: number, tMs: number, screenAngleDeg = 0): void {
    let r: number;
    let p: number;
    switch (((screenAngleDeg % 360) + 360) % 360) {
      case 90:
        r = beta;
        p = -gamma;
        break;
      case 180:
        r = -gamma;
        p = -beta;
        break;
      case 270:
        r = -beta;
        p = gamma;
        break;
      default:
        r = gamma;
        p = beta;
    }
    if (!this.hasData || this.lastT < 0) {
      this.rollDeg = r;
      this.pitchDeg = p;
      this.hasData = true;
    } else {
      const dt = Math.max(0, Math.min(0.25, (tMs - this.lastT) / 1000));
      const a = 1 - Math.exp(-2 * Math.PI * GYRO_TUNING.cutoffHz * dt);
      this.rollDeg += (r - this.rollDeg) * a;
      this.pitchDeg += (p - this.pitchDeg) * a;
    }
    this.lastT = tMs;
    this.roll = shape(this.rollDeg - this.neutralRoll);
    this.pitch = shape(this.pitchDeg - this.neutralPitch);
  }

  /** Neutral = current attitude (called on "Atla"). */
  calibrate(): void {
    this.neutralRoll = this.rollDeg;
    this.neutralPitch = this.pitchDeg;
    this.roll = 0;
    this.pitch = 0;
  }
}

function screenAngle(): number {
  const s = (globalThis as { screen?: { orientation?: { angle?: number } } }).screen;
  const a = s?.orientation?.angle;
  if (typeof a === 'number') return a;
  const w = (globalThis as { orientation?: number }).orientation;
  return typeof w === 'number' ? w : 0;
}
