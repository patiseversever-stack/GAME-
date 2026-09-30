// DÖNGÜ — oyun yüklenirken tekrar eden, dikişsiz bölüm (varsayılan 4 sn).
// Sayfa masada nefes alır; Türk alfabesi halkası sayfanın etrafında bir tam tur döner; ışık kâğıdın üzerinden geçer.
// Tüm hareketler döngü süresine tam bölünen periyotlarla tanımlıdır: son kare ile ilk kare aynıdır.
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { clampOpts } from '../theme';
import { Backdrop, Grain, Vignette } from '../components/Atmosphere';
import { PagePlane } from '../components/PagePlane';
import { LetterRing } from '../components/LetterRing';
import { LoopStamps } from '../components/LoopStamps';
import { stageFor } from '../lib/stage';
import { TAU } from '../lib/math';

export const Dongu: React.FC = () => {
  const frame = useCurrentFrame();
  const { width: W, height: H, durationInFrames: D } = useVideoConfig();
  const st = stageFor(W, H), u = st.u;
  const t = (((frame % D) + D) % D) / D; // 0..1
  const L = st.loop;
  const pose = {
    ...L,
    cx: L.cx + 10 * u * Math.sin(TAU * t + 0.5),
    cy: L.cy + 6 * u * Math.cos(TAU * t),
    rx: L.rx + 1.3 * Math.sin(TAU * t),
    rz: L.rz + 0.8 * Math.sin(TAU * t + 1.2),
    s: 1 + 0.008 * Math.sin(TAU * t * 2),
  };
  const sheen = interpolate(t, [0.12, 0.6], [-0.5, 1.3], clampOpts);
  const ring = st.ring;
  return (
    <AbsoluteFill>
      <Backdrop desk={1} lamp={1} />
      <LetterRing {...ring} phase={t} layer="back" />
      <PagePlane pose={pose} perspective={st.P} sheen={sheen} />
      <LoopStamps t={t} pose={pose} st={st} u={u} />
      <LetterRing {...ring} phase={t} layer="front" />
      <Vignette strength={0.62} />
      <Grain opacity={0.07} period={D} />
    </AbsoluteFill>
  );
};
