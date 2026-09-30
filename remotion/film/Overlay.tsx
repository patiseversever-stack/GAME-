// Kameradan bağımsız katman: üstte mekanik tarih sayacı, altta anlatı satırı (tek tip, tek konum, tek hareket).
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Odometer } from '../components/Odometer';
import { EASE, FONT, clampOpts } from '../theme';
import { BEATS } from './timeline';

const Caption: React.FC<{ text: string; at: readonly [number, number]; t: number }> = ({ text, at, t }) => {
  const { width: W } = useVideoConfig();
  const u = W / 1080;
  if (t < at[0] - 0.05 || t > at[1] + 0.05) return null;
  const words = text.split(' ');
  const out = interpolate(t, [at[1] - 0.35, at[1]], [1, 0], clampOpts);
  return (
    <div style={{ position: 'absolute', left: 60 * u, right: 60 * u, top: 1648 * u, textAlign: 'center', fontFamily: FONT.garamond, fontStyle: 'italic', fontSize: 70 * u, lineHeight: 1.1, color: '#f4ead3', opacity: out, translate: `0px ${(1 - out) * -18 * u}px`, textShadow: `0 ${2 * u}px ${18 * u}px rgba(0,0,0,.9), 0 0 ${3 * u}px rgba(0,0,0,.7)` }}>
      {words.map((w, i) => {
        const k = interpolate(t, [at[0] + i * 0.07, at[0] + i * 0.07 + 0.42], [0, 1], { ...clampOpts, easing: EASE.out });
        return (
          <span key={i} style={{ display: 'inline-block', marginRight: i < words.length - 1 ? 18 * u : 0, opacity: k, translate: `0px ${(1 - k) * 34 * u}px`, filter: `blur(${(1 - k) * 8 * u}px)` }}>{w}</span>
        );
      })}
    </div>
  );
};

export const Overlay: React.FC<{ readonly hideAfter?: number }> = ({ hideAfter = Infinity }) => {
  const frame = useCurrentFrame();
  const { fps, width: W } = useVideoConfig();
  const t = frame / fps;
  const u = W / 1080;
  // sayaç: kök sahnenin çağı; dalış penceresinde bir sonrakine döner
  let i = 0;
  while (i < BEATS.length - 1 && BEATS[i].zoom && t >= BEATS[i].zoom![1]) i++;
  const A = BEATS[i], B = BEATS[i + 1] ?? A;
  const k = A.zoom ? interpolate(t, [A.zoom[0] + 0.1, A.zoom[1] - 0.05], [0, 1], clampOpts) : 0;
  const odoIn = interpolate(t, [0.25, 0.7], [0, 1], { ...clampOpts, easing: EASE.out });
  const odoOut = interpolate(t, [hideAfter, hideAfter + 0.5], [1, 0], { ...clampOpts, easing: EASE.inOut });
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <AbsoluteFill style={{ background: `linear-gradient(180deg, rgba(0,0,0,.42) 0px, rgba(0,0,0,0) ${360 * u}px, rgba(0,0,0,0) ${1380 * u}px, rgba(0,0,0,.5) 100%)` }} />
      <div style={{ position: 'absolute', inset: 0, opacity: odoIn * odoOut, translate: `0px ${(1 - odoIn) * -30 * u + (1 - odoOut) * -40 * u}px` }}>
        <Odometer from={A.era} to={B.era} k={k} />
      </div>
      {BEATS.map(b => <Caption key={b.id} text={b.caption.text} at={b.caption.at} t={t} />)}
    </AbsoluteFill>
  );
};
