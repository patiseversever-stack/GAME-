// Sayfanın etrafında dönen Türk alfabesi halkası (dizgi taşları). Arka yarı sayfanın arkasında, ön yarı önünde çizilir.
// phase 0..1 bir tam tur: phase=0 ile phase=1 aynı görüntü → döngü dikişsizdir.
import React from 'react';
import { C, FONT, TR_ALFABE, TR_OZEL } from '../theme';
import { TAU, clamp01, mix } from '../lib/math';

type Props = {
  readonly cx: number;
  readonly cy: number;
  readonly ax: number; readonly ay: number; // cos θ bileşeni
  readonly bx: number; readonly by: number; // sin θ bileşeni (derinlik ekseni)
  readonly phase: number;
  readonly layer: 'back' | 'front';
  readonly size: number;
  readonly collapse?: number; // 0..1 (çıkışta harfler sayfaya dalar)
  readonly opacity?: number;
};

export const LetterRing: React.FC<Props> = ({ cx, cy, ax, ay, bx, by, phase, layer, size, collapse = 0, opacity = 1 }) => {
  const N = TR_ALFABE.length;
  const items = TR_ALFABE.map((ch, i) => {
    const th = TAU * (i / N + phase), d = Math.sin(th);
    return { ch, i, th, d };
  }).filter(o => (layer === 'front' ? o.d >= 0 : o.d < 0)).sort((a, b) => a.d - b.d);
  return (
    <>
      {items.map(({ ch, i, th, d }) => {
        const k = clamp01(collapse * 1.5 - (i / N) * 0.5);
        const x = mix(cx + ax * Math.cos(th) + bx * d, cx, k), y = mix(cy + ay * Math.cos(th) + by * d, cy, k);
        const depth = (d + 1) / 2, sc = mix(0.58, 1.1, depth) * (1 - k * 0.9);
        const op = mix(0.28, 1, depth) * opacity * (1 - k);
        const tw = size * 0.84, special = TR_OZEL.has(ch);
        return (
          <div key={ch} style={{ position: 'absolute', left: x - tw / 2, top: y - size / 2, width: tw, height: size, scale: String(sc), opacity: op, borderRadius: size * 0.08, display: 'grid', placeItems: 'center',
            background: special ? `linear-gradient(${C.amber}, ${C.amber2})` : `linear-gradient(#f7efdb, #e2d4b6)`,
            boxShadow: `0 ${size * 0.06}px 0 rgba(70,48,24,.9), 0 ${size * 0.16}px ${size * 0.3}px rgba(0,0,0,.5), inset 0 ${size * 0.03}px 0 rgba(255,255,255,.7)`,
            fontFamily: FONT.display, fontWeight: 700, fontSize: size * 0.6, lineHeight: 1, color: C.ink }}>
            {ch}
          </div>
        );
      })}
    </>
  );
};
