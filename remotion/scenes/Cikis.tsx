// ÇIKIŞ — oyun hazır olduğunda oynar (herhangi bir andan kesilerek başlayabilir: ilk karelerdeki ışık süpürmesi kesmeyi örter).
// Harf halkası sayfaya dalar, kamera oyunun ilk "tam sayfa" kadrajına oturur, masa ışığı oyundaki tonuna açılır.
// Son kareler durağandır: oyun bu sayfayı gerçek 3B sayfanın köşelerine eşleyip devralır.
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { EASE, clampOpts } from '../theme';
import { Backdrop, Grain, Vignette } from '../components/Atmosphere';
import { PagePlane } from '../components/PagePlane';
import { LetterRing } from '../components/LetterRing';
import { lerpPose, stageFor } from '../lib/stage';

export const Cikis: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const st = stageFor(W, H);
  const sec = (s: number) => s * fps;
  const move = interpolate(frame, [sec(0.12), sec(1.12)], [0, 1], { ...clampOpts, easing: EASE.inOut });
  const pose = lerpPose(st.loop, st.final, move);
  const collapse = interpolate(frame, [sec(0.04), sec(0.72)], [0, 1], { ...clampOpts, easing: EASE.in });
  const flashX = interpolate(frame, [0, sec(0.26)], [-0.6, 1.25], { ...clampOpts, easing: EASE.out });
  const flashOp = interpolate(frame, [0, sec(0.06), sec(0.2), sec(0.3)], [0.85, 0.95, 0.55, 0], clampOpts);
  const sheen = interpolate(frame, [sec(0.5), sec(1.05)], [-0.5, 1.3], clampOpts);
  const lamp = interpolate(move, [0, 1], [1, 1.25]);
  const vig = interpolate(move, [0, 1], [0.62, 0.42]);
  return (
    <AbsoluteFill>
      <Backdrop desk={1} lamp={lamp} />
      <LetterRing {...st.ring} phase={0} layer="back" collapse={collapse} />
      <PagePlane pose={pose} perspective={st.P} sheen={sheen} />
      <LetterRing {...st.ring} phase={0} layer="front" collapse={collapse} />
      <Vignette strength={vig} />
      <Grain opacity={0.06} />
      {/* kesmeyi örten ışık süpürmesi */}
      <AbsoluteFill style={{ opacity: flashOp, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-30%', bottom: '-30%', width: '62%', left: `${flashX * 100}%`, rotate: '12deg', background: 'linear-gradient(90deg, rgba(255,244,220,0), rgba(255,244,220,.95) 45%, rgba(255,236,200,.95) 55%, rgba(255,244,220,0))', filter: 'blur(12px)' }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
