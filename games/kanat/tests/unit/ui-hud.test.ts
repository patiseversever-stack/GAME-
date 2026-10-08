import { describe, expect, it } from 'vitest';
import { altFrac, proxAngle } from '../../src/ui/hud/FlightHud.ts';
import { proxColor, PROX_COLORS, PROX_COLORS_CB } from '../../src/ui/theme.ts';

describe('HUD mappings', () => {
  it('proximity distance maps onto the 180° arc at the tier boundaries', () => {
    expect(proxAngle(Infinity)).toBe(180);
    expect(proxAngle(45)).toBe(180);
    expect(proxAngle(30)).toBe(180);
    expect(proxAngle(15)).toBeCloseTo(135);
    expect(proxAngle(7)).toBeCloseTo(90);
    expect(proxAngle(3)).toBeCloseTo(45);
    expect(proxAngle(0)).toBe(0);
    // monotonic: closer → further right on the arc
    let prev = 181;
    for (let d = 30; d >= 0; d -= 0.5) {
      const a = proxAngle(d);
      expect(a).toBeLessThanOrEqual(prev);
      prev = a;
    }
  });

  it('altitude bar is clamped and monotonic', () => {
    expect(altFrac(-5)).toBe(0);
    expect(altFrac(0)).toBe(0);
    expect(altFrac(600)).toBe(1);
    expect(altFrac(5000)).toBe(1);
    expect(altFrac(150)).toBeCloseTo(0.5);
    expect(altFrac(90)).toBeGreaterThan(altFrac(60));
  });

  it('proximity colours (brief §3.5) and Okabe-Ito variants', () => {
    expect([PROX_COLORS[1], PROX_COLORS[2], PROX_COLORS[3], PROX_COLORS[5]]).toEqual(['#4CC38A', '#F2C744', '#F28C28', '#E5484D']);
    expect([PROX_COLORS_CB[1], PROX_COLORS_CB[2], PROX_COLORS_CB[3], PROX_COLORS_CB[5]]).toEqual(['#56B4E9', '#F0E442', '#E69F00', '#D55E00']);
    expect(proxColor(3, true)).toBe('#E69F00');
  });
});
