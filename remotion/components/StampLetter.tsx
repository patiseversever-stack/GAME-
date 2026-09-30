// Matbaa baskısı hissiyle hücreye düşen harf: büyükten sekerek oturur, mürekkep halkası yayılır.
import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT, SPRING, clampOpts } from '../theme';

type Props = {
  readonly ch: string;
  readonly x: number; // hücre sol üst
  readonly y: number;
  readonly size: number; // hücre boyu
  readonly at: number; // basılma karesi
  readonly color?: string;
  readonly glow?: number; // 0..1 amber parıltı
  readonly font?: string;
};

export const StampLetter: React.FC<Props> = ({ ch, x, y, size, at, color = C.ink, glow = 0, font = FONT.display }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame - at;
  if (t < 0) return null;
  const s = spring({ frame: t, fps, config: SPRING.pop });
  const scale = interpolate(s, [0, 1], [2.4, 1]);
  const rot = interpolate(s, [0, 1], [-14, 0]);
  const op = interpolate(t, [0, 2], [0, 1], clampOpts);
  const ring = interpolate(t, [1, 12], [0.3, 1.9], clampOpts), ringOp = interpolate(t, [1, 12], [0.55, 0], clampOpts);
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: size, height: size }}>
      {glow > 0 ? <div style={{ position: 'absolute', inset: -size * 0.6, borderRadius: '50%', background: `radial-gradient(circle, rgba(240,194,122,${0.55 * glow}) 0%, rgba(240,194,122,0) 62%)` }} /> : null}
      <div style={{ position: 'absolute', inset: size * 0.12, borderRadius: '50%', border: `${Math.max(1.5, size * 0.03)}px solid ${C.ink}`, scale: String(ring), opacity: ringOp }} />
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontFamily: font, fontWeight: 700, fontSize: size * 0.66, lineHeight: 1, color, scale: String(scale), rotate: `${rot}deg`, opacity: op, textShadow: `0 0 ${size * 0.02}px rgba(24,46,37,.6)` }}>{ch}</div>
    </div>
  );
};
