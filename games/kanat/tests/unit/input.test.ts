import { afterEach, describe, expect, it } from 'vitest';
import { defaultGestureMath, effectiveExpo, setGestureMath, shapeStick, STICK_TUNING } from '../../src/input/gesture.ts';
import { GyroInput } from '../../src/input/gyro.ts';
import { InputManager } from '../../src/input/InputManager.ts';
import { RelativeStick } from '../../src/input/stick.ts';
import type { Command } from '../../src/sim/types.ts';

afterEach(() => setGestureMath(null));

const W = 390;
const H = 844;
const R = STICK_TUNING.radiusFrac * W; // 42.9 px

function mgr(cfg: Partial<Parameters<InputManager['configure']>[0]> = {}, scheme: 'flight' | 'canopy' | 'suru' = 'flight') {
  const m = new InputManager();
  m.setViewport(W, H);
  m.configure(cfg);
  m.setScheme(scheme);
  return m;
}

/** Run ticks and collect a copy of every command. */
function run(m: InputManager, from: number, n: number): Command[] {
  const out: Command[] = [];
  const all: Command[] = [];
  for (let t = from; t < from + n; t++) {
    out.length = 0;
    m.sample(t, out);
    for (const c of out) all.push({ ...c, args: [...c.args] });
  }
  return all;
}

describe('gesture math', () => {
  it('radial deadzone rescales from 0 (no jump) and saturates at the unit circle', () => {
    const o = new Float64Array(2);
    defaultGestureMath.radialDeadzone(0.079, 0, 0.08, o);
    expect([o[0], o[1]]).toEqual([0, 0]);
    defaultGestureMath.radialDeadzone(0.0801, 0, 0.08, o);
    expect(o[0]).toBeGreaterThan(0);
    expect(o[0]).toBeLessThan(0.001);
    defaultGestureMath.radialDeadzone(3, 4, 0.08, o);
    expect(Math.hypot(o[0], o[1])).toBeCloseTo(1, 9);
  });

  it('expo curve endpoints and shape (§2.2)', () => {
    const e = defaultGestureMath.expo;
    expect(e(1, 0.35)).toBeCloseTo(1, 12);
    expect(e(-1, 0.5)).toBeCloseTo(-1, 12);
    expect(e(0.5, 0.5)).toBeCloseTo(0.5 * 0.125 + 0.5 * 0.5, 12);
    expect(e(0.2, 0.5)).toBeLessThan(0.2); // finer around zero
    expect(effectiveExpo(0.35, 0)).toBe(0.35);
    expect(effectiveExpo(0.35, 0.7)).toBeCloseTo(0.35 + 0.7 * 0.65, 12);
  });

  it('quantize to [-31, 31], never -0', () => {
    const q = defaultGestureMath.quantizeAxis;
    expect(q(1)).toBe(31);
    expect(q(-2)).toBe(-31);
    expect(Object.is(q(-0.001), -0)).toBe(false);
    expect(Object.is(q(-0.01), 0)).toBe(true);
    expect(defaultGestureMath.quantizeFlare(-1)).toBe(0);
    expect(defaultGestureMath.quantizeFlare(0.5)).toBe(16);
  });

  it('shared sim math can be swapped in', () => {
    setGestureMath({ quantizeAxis: () => 7 });
    const m = mgr();
    m.pointerDown(1, 100, 400);
    m.pointerMove(1, 140, 400);
    const cmds = run(m, 0, 1);
    expect(cmds[0].args).toEqual([7, 7]);
  });
});

describe('relative stick (floating anchor)', () => {
  it('v = (finger − anchor)/R; beyond R the anchor follows', () => {
    const s = new RelativeStick();
    s.begin(1, 100, 100, 40);
    s.move(120, 100);
    expect([s.vx, s.vy]).toEqual([0.5, 0]);
    s.move(200, 100); // 100 px right: anchor slides to 160
    expect(s.vx).toBeCloseTo(1, 12);
    expect(s.anchorX).toBeCloseTo(160, 9);
    s.move(150, 100); // reversing reacts immediately (no dead travel)
    expect(s.vx).toBeCloseTo(-0.25, 9);
    s.end();
    expect([s.active, s.vx, s.vy]).toEqual([false, 0, 0]);
  });
});

describe('InputManager — flight', () => {
  it('axis commands on the 30 Hz grid (every 2nd tick), always emitted', () => {
    const m = mgr();
    const cmds = run(m, 0, 10);
    expect(cmds.map((c) => c.tick)).toEqual([0, 2, 4, 6, 8]);
    expect(cmds.every((c) => c.cmd === 'axis' && c.args[0] === 0 && c.args[1] === 0)).toBe(true);
  });

  it('natural: drag up = nose up (+sy); pilot inverts; right = +sx', () => {
    const m = mgr();
    m.pointerDown(1, 200, 500);
    m.pointerMove(1, 200 + R, 500 - R * 0.6);
    const [c] = run(m, 0, 1);
    expect(c.args[0]).toBeGreaterThan(20);
    expect(c.args[1]).toBeGreaterThan(5);
    m.configure({ controlDir: 'pilot' });
    const [p] = run(m, 2, 1);
    expect(p.args[1]).toBe(-c.args[1]);
  });

  it('deadzone 0.08, expo and sensitivity shape the output', () => {
    const m = mgr();
    m.pointerDown(1, 200, 500);
    m.pointerMove(1, 200 + 0.07 * R, 500);
    expect(run(m, 0, 1)[0].args).toEqual([0, 0]);
    m.pointerMove(1, 200 + 0.5 * R, 500);
    const mid = run(m, 2, 1)[0].args[0];
    const lin = Math.round(((0.5 - 0.08) / 0.92) * 31);
    expect(mid).toBeLessThan(lin); // expo softens the middle
    m.configure({ sensitivity: 1.5 });
    expect(run(m, 4, 1)[0].args[0]).toBeGreaterThan(mid);
    m.configure({ sensitivity: 0.6 });
    m.pointerMove(1, 200 + 3 * R, 500); // full deflection is capped by sensitivity < 1
    expect(run(m, 6, 1)[0].args[0]).toBeLessThan(31);
  });

  it('axis first, then events within a tick (replay recorder order)', () => {
    const m = mgr();
    m.queueAction('parachute');
    const out: Command[] = [];
    m.sample(4, out);
    expect(out.map((c) => c.cmd)).toEqual(['axis', 'parachute']);
    out.length = 0;
    m.queueAction('parachute');
    m.sample(5, out); // off-grid tick: only the event
    expect(out.map((c) => c.cmd)).toEqual(['parachute']);
  });

  it('two-thumb mode only in landscape: left = roll, right = pitch', () => {
    const m = mgr({ twoThumbs: true });
    expect(m.visual.twoThumb).toBe(false); // portrait
    m.setViewport(H, W);
    expect(m.visual.twoThumb).toBe(true);
    const r = STICK_TUNING.radiusFrac * W;
    m.pointerDown(1, 100, 200);
    m.pointerMove(1, 100 + r, 200 - r); // left thumb: only x counts
    m.pointerDown(2, 700, 200);
    m.pointerMove(2, 700 + r, 200 - r); // right thumb: only y counts
    const [c] = run(m, 0, 1);
    expect(c.args[0]).toBeGreaterThan(0);
    expect(c.args[1]).toBeGreaterThan(0);
    m.pointerUp(2);
    expect(run(m, 2, 1)[0].args[1]).toBe(0);
    expect(run(m, 4, 1)[0].args[0]).toBeGreaterThan(0);
  });

  it('commands are recycled from a 64-slot pool (no per-tick allocation)', () => {
    const m = mgr();
    const out: Command[] = [];
    m.sample(0, out);
    const first = out[0];
    for (let t = 2; t <= 128; t += 2) {
      out.length = 0;
      m.sample(t, out);
    }
    expect(out[0]).toBe(first);
  });

  it('keyboard fallback ramps arrows/WASD; Space opens the parachute', () => {
    const m = mgr();
    m.keyDown('ArrowRight');
    const xs = run(m, 0, 20).filter((c) => c.cmd === 'axis').map((c) => c.args[0]);
    expect(xs[0]).toBeGreaterThan(0);
    expect(xs[0]).toBeLessThan(31); // ramps in, no step
    expect(xs[xs.length - 1]).toBe(31);
    for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeGreaterThanOrEqual(xs[i - 1]);
    m.keyUp('ArrowRight');
    m.keyDown('KeyW');
    const ys = run(m, 20, 20).map((c) => c.args[1]);
    expect(ys[ys.length - 1]).toBe(31); // W = nose up (natural)
    m.keyUp('KeyW');
    m.keyDown('Space');
    const cmds = run(m, 20, 2);
    expect(cmds.some((c) => c.cmd === 'parachute')).toBe(true);
    let backs = 0;
    const m2 = new InputManager({ onBack: () => backs++ });
    m2.keyDown('Escape');
    expect(backs).toBe(1);
  });

  it('menu scheme emits nothing and ignores touches', () => {
    const m = mgr();
    m.setScheme('menu');
    expect(m.pointerDown(1, 10, 10)).toBe(false);
    expect(run(m, 0, 10)).toEqual([]);
  });
});

describe('InputManager — canopy', () => {
  it('horizontal drag = turn, drag down = flare (events only on change)', () => {
    const m = mgr({}, 'canopy');
    m.pointerDown(1, 200, 400);
    m.pointerMove(1, 200 + R, 400);
    let cmds = run(m, 0, 1);
    expect(cmds[0].cmd).toBe('axis');
    expect(cmds[0].args[0]).toBe(31);
    expect(cmds[0].args[1]).toBe(0);
    expect(cmds[1]).toMatchObject({ cmd: 'flare', args: [0] });
    m.pointerMove(1, 200, 400 + R);
    cmds = run(m, 2, 4);
    const flares = cmds.filter((c) => c.cmd === 'flare');
    expect(flares).toHaveLength(1);
    expect(flares[0].args[0]).toBe(31);
    expect(m.visual.flare).toBe(1);
  });
});

describe('InputManager — SÜRÜ.io', () => {
  it('finger down = tight [1], release = [0]; deadzone 0.10, no expo, screen-up = +y', () => {
    const m = mgr({ controlDir: 'pilot', sensitivity: 0.6 }, 'suru');
    m.setSimHz(30);
    let cmds = run(m, 0, 2);
    expect(cmds.map((c) => `${c.tick}:${c.cmd}:${c.args}`)).toEqual(['0:axis:0,0', '0:tight:0', '1:axis:0,0']);
    m.pointerDown(1, 200, 400);
    m.pointerMove(1, 200, 400 - 0.09 * R);
    cmds = run(m, 2, 1);
    expect(cmds.map((c) => c.cmd)).toEqual(['axis', 'tight']);
    expect(cmds[0].args).toEqual([0, 0]); // inside 0.10
    expect(cmds[1].args).toEqual([1]);
    expect(m.visual.holding).toBe(true);
    m.pointerMove(1, 200, 400 - R);
    cmds = run(m, 3, 1);
    expect(cmds[0].args).toEqual([0, 31]); // pilot/sensitivity do not apply to steering
    m.pointerMove(1, 200, 400 - 0.55 * R);
    expect(run(m, 4, 1)[0].args[1]).toBe(Math.round(((0.55 - 0.1) / 0.9) * 31)); // linear (no expo)
    m.pointerUp(1);
    cmds = run(m, 5, 1);
    expect(cmds.map((c) => `${c.cmd}:${c.args}`)).toEqual(['axis:0,0', 'tight:0']);
  });

  it('two-thumb: left steers, right hold = tight', () => {
    const m = mgr({ twoThumbs: true }, 'suru');
    m.setSimHz(30);
    m.setViewport(H, W);
    m.pointerDown(1, 100, 200);
    let cmds = run(m, 0, 1);
    expect(cmds.find((c) => c.cmd === 'tight')?.args).toEqual([0]);
    m.pointerDown(2, 700, 200);
    cmds = run(m, 1, 1);
    expect(cmds.find((c) => c.cmd === 'tight')?.args).toEqual([1]);
  });
});

describe('gyro', () => {
  it('3° deadzone, 28° full deflection, neutral calibrated at jump, 8 Hz low-pass', () => {
    const g = new GyroInput();
    g.mode = 'roll';
    g.feed(10, 5, 0); // beta (pitch) 10°, gamma (roll) 5°
    g.calibrate();
    expect(g.roll).toBe(0);
    g.feed(10, 7.5, 16); // +2.5° → inside deadzone after filtering
    expect(g.roll).toBe(0);
    for (let t = 32; t < 2000; t += 16) g.feed(10, 5 + 28, t); // +28° held
    expect(g.roll).toBeCloseTo(1, 3);
    // one-pole response: after one 16 ms step only part of a jump passes
    const h = new GyroInput();
    h.feed(0, 0, 0);
    h.feed(0, 20, 16);
    const a = 1 - Math.exp(-2 * Math.PI * 8 * 0.016);
    expect(h.rollDeg).toBeCloseTo(20 * a, 6);
  });

  it('landscape screen angle remaps axes', () => {
    const g = new GyroInput();
    g.feed(15, 0, 0, 90);
    expect(g.rollDeg).toBe(15);
    expect(g.pitchDeg).toBe(-0);
  });

  it('roll mode steers sx from the device, pitch stays on touch', () => {
    const m = mgr({ gyro: 'roll' });
    m.gyro.feed(0, 0, 0);
    m.calibrateGyro();
    for (let t = 16; t < 1500; t += 16) m.gyro.feed(0, 40, t);
    m.pointerDown(1, 200, 500);
    m.pointerMove(1, 200 - R, 500 - R); // touch says left + up
    const [c] = run(m, 0, 1);
    expect(c.args[0]).toBe(31); // gyro wins the roll axis
    expect(c.args[1]).toBeGreaterThan(0);
  });

  it('shapeStick honours the expo parameters per axis', () => {
    const o = new Float64Array(2);
    shapeStick(0.6, -0.6, { deadzone: 0, expoX: 0, expoY: 1, sensitivity: 1, invertY: false }, o);
    expect(o[0]).toBeCloseTo(0.6, 12);
    expect(o[1]).toBeCloseTo(0.216, 12);
  });
});
