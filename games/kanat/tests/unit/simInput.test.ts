// Gesture math (inputQuant): dead zone, expo, inversion, floating anchor, 6-bit quantization without −0.
import { describe, expect, it } from 'vitest';
import { expoCurve, quantizeAxis, quantizeSingleAxis, quantizeStick, RelativeStick, shapeStick, stickRadius, updateAnchor } from '../../src/sim/inputQuant.ts';

describe('inputQuant', () => {
  it('never emits −0', () => {
    for (let v = -0.05; v <= 0.05; v += 0.0007) {
      const q = quantizeAxis(v);
      expect(Object.is(q, -0)).toBe(false);
    }
    expect(Object.is(quantizeAxis(-0), -0)).toBe(false);
    expect(Object.is(quantizeAxis(-0.01), -0)).toBe(false);
    const out = [9, 9];
    for (let i = 0; i < 2000; i++) {
      const a = (i / 2000) * Math.PI * 2;
      const m = (i % 37) / 300; // inside / around the dead zone
      quantizeStick(Math.cos(a) * m, Math.sin(a) * m, {}, out);
      expect(Object.is(out[0], -0)).toBe(false);
      expect(Object.is(out[1], -0)).toBe(false);
      expect(Object.is(quantizeSingleAxis(-m, 0.35, 1), -0)).toBe(false);
    }
  });
  it('quantizes to ints in [−31, 31]', () => {
    expect(quantizeAxis(1)).toBe(31);
    expect(quantizeAxis(-1)).toBe(-31);
    expect(quantizeAxis(5)).toBe(31);
    expect(quantizeAxis(-5)).toBe(-31);
    expect(quantizeAxis(NaN)).toBe(0);
    expect(quantizeAxis(0.5)).toBe(16);
  });
  it('radial dead zone 0.08 with rescale from 0 (no jump)', () => {
    const o = [0, 0];
    shapeStick(0.07, 0, {}, o);
    expect(o[0]).toBe(0);
    shapeStick(0.081, 0, { expoRoll: 0 }, o);
    expect(o[0]).toBeGreaterThan(0);
    expect(o[0]).toBeLessThan(0.002);
    shapeStick(1, 0, { expoRoll: 0 }, o);
    expect(o[0]).toBeCloseTo(1, 12);
  });
  it('expo curve e|x|³ + (1−e)|x|, roll 0.35 / pitch 0.50', () => {
    expect(expoCurve(0.5, 0.35)).toBeCloseTo(0.35 * 0.125 + 0.65 * 0.5, 12);
    expect(expoCurve(-0.5, 0.5)).toBeCloseTo(-(0.5 * 0.125 + 0.25), 12);
    expect(expoCurve(1, 0.5)).toBe(1);
    const o = [0, 0];
    // full deflection maps to ±1 on each axis
    shapeStick(0, -1, {}, o);
    expect(o[1]).toBeCloseTo(1, 12); // natural: drag up = nose up
    shapeStick(0, -1, { controlDir: 'pilot' }, o);
    expect(o[1]).toBeCloseTo(-1, 12);
    shapeStick(0, -1, { sensitivity: 0.6 }, o);
    expect(o[1]).toBeCloseTo(0.6, 12);
  });
  it('floating anchor follows the finger beyond R = 0.11 × short edge', () => {
    const R = stickRadius(390);
    expect(R).toBeCloseTo(42.9, 6);
    const anchor = [100, 100];
    const v = [0, 0];
    updateAnchor(anchor, 100 + R * 0.5, 100, R, v);
    expect(v[0]).toBeCloseTo(0.5, 12);
    expect(anchor[0]).toBe(100);
    updateAnchor(anchor, 100 + R * 3, 100, R, v);
    expect(v[0]).toBeCloseTo(1, 12);
    expect(anchor[0]).toBeCloseTo(100 + R * 2, 9);
    // coming back moves the stick immediately (no dead travel)
    updateAnchor(anchor, 100 + R * 2.5, 100, R, v);
    expect(v[0]).toBeCloseTo(0.5, 9);
  });
  it('RelativeStick end-to-end', () => {
    const s = new RelativeStick(390);
    const out = [0, 0];
    s.read(out);
    expect(out).toEqual([0, 0]);
    s.begin(200, 400);
    s.move(200 + 100, 400 - 100);
    s.read(out);
    expect(out[0]).toBeGreaterThan(15);
    expect(out[1]).toBeGreaterThan(10); // drag up-right → right roll + nose up
    s.end();
    s.read(out);
    expect(out).toEqual([0, 0]);
  });
});
