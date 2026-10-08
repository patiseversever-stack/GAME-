// SÜRÜ.io colour-blind readability (BRIEF §9.G-28): owner colours under protanopia / deuteranopia / tritanopia
// (Machado 2009) — any two flocks closer than ΔE2000 15 must differ in leader marker shape or aura pattern.
import { describe, expect, it } from 'vitest';
import { CVD_KINDS, deltaE, deltaE2000 } from '../../src/modes/suru/render/colorVision.ts';
import { ownerStyle, PLAYER_GOLD, RIVAL_COLORS } from '../../src/modes/suru/render/palette.ts';

describe('SÜRÜ owner colours (9.G-28)', () => {
  it('CIEDE2000 matches the Sharma reference pair', () => {
    expect(deltaE2000([50, 2.6772, -79.7751], [50, 0, -82.7485])).toBeCloseTo(2.0425, 3);
  });

  it('every flock pair is separable by colour (ΔE ≥ 15) or by marker shape / aura pattern, in all CVD types', () => {
    let minDE = Infinity;
    let lowPairs = 0;
    for (const kind of CVD_KINDS) {
      for (let a = 1; a <= 16; a++) {
        for (let b = a + 1; b <= 16; b++) {
          const sa = ownerStyle(a);
          const sb = ownerStyle(b);
          const d = sa.color === sb.color ? 0 : deltaE(sa.color, sb.color, kind);
          if (sa.color !== sb.color) minDE = Math.min(minDE, d);
          if (d < 15) {
            lowPairs++;
            const secondary = sa.mark !== sb.mark || sa.pattern !== sb.pattern || a === 1 || b === 1;
            expect(secondary, `${kind}: flocks ${a}/${b} ΔE ${d.toFixed(1)}`).toBe(true);
          }
        }
      }
    }
    expect(minDE).toBeGreaterThan(7);
    expect(lowPairs).toBeGreaterThan(0);
  });

  it('player gold is unique; #E69F00 (closest to gold) is the last rival colour', () => {
    expect(PLAYER_GOLD).toBe('#FFC23D');
    expect(RIVAL_COLORS[RIVAL_COLORS.length - 1]).toBe('#E69F00');
    for (let f = 2; f <= 16; f++) expect(ownerStyle(f).color).not.toBe(PLAYER_GOLD);
    // rivals that repeat a colour get a different aura pattern
    for (let a = 2; a <= 16; a++) for (let b = a + 1; b <= 16; b++) if (ownerStyle(a).color === ownerStyle(b).color) expect(ownerStyle(a).pattern).not.toBe(ownerStyle(b).pattern);
  });
});
