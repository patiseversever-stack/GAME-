// SAHNE 04 — SAYFA
// Yollar toplanır; oyunun GERÇEK sayfası (gerçek ipuçları, gerçek fotoğraflar) karanlıktan döne döne gelip
// oyunun kendi ahşap masasına iner. "Bir sayfa. / Bir dünya." başlığı görünür ve kaybolur; sahne döngü pozunda biter.
import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, EASE, FONT, SPRING, clampOpts } from '../theme';
import { Backdrop, Grain, Vignette } from '../components/Atmosphere';
import { PagePlane } from '../components/PagePlane';
import { lerpPose, stageFor } from '../lib/stage';

export const Sayfa: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width: W, height: H, durationInFrames: D } = useVideoConfig();
  const st = stageFor(W, H), u = st.u;
  const sec = (s: number) => s * fps;

  const k = spring({ frame: frame - sec(0.06), fps, config: SPRING.land, durationInFrames: sec(1.15) });
  const start = { cx: W * 0.5, cy: H * 0.42, w: st.loop.w * 0.42, rx: 72, ry: -38, rz: 28, s: 1 };
  const pose = lerpPose(start, st.loop, k);
  const desk = interpolate(frame, [sec(0.02), sec(0.7)], [0, 1], { ...clampOpts, easing: EASE.inOut });
  const pageOp = interpolate(frame, [0, sec(0.12)], [0, 1], clampOpts);

  const t1 = spring({ frame: frame - sec(0.42), fps, config: { damping: 200 }, durationInFrames: sec(0.45) });
  const t2 = spring({ frame: frame - sec(0.56), fps, config: { damping: 200 }, durationInFrames: sec(0.45) });
  const tOut = interpolate(frame, [D - sec(0.42), D - sec(0.14)], [0, 1], { ...clampOpts, easing: EASE.in });
  const fs = (st.land ? 118 : 104) * u;
  const scrim = Math.min(t1, 1 - tOut);

  return (
    <AbsoluteFill>
      <Backdrop desk={desk} lamp={0.4 + 0.6 * desk} />
      <PagePlane pose={pose} perspective={st.P} shadow={k} opacity={pageOp} light={1} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 60% 42% at 50% 50%, rgba(7,13,12,.72), rgba(7,13,12,0) 75%)', opacity: scrim * 0.95 }} />
      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 * u }}>
        <div style={{ overflow: 'hidden' }}>
          <div style={{ fontFamily: FONT.display, fontWeight: 900, fontSize: fs, lineHeight: 1.05, color: C.cream, translate: `0px ${interpolate(t1, [0, 1], [105, 0]) - tOut * 105}%`, textShadow: '0 8px 40px rgba(0,0,0,.6)' }}>Bir sayfa.</div>
        </div>
        <div style={{ overflow: 'hidden' }}>
          <div style={{ fontFamily: FONT.display, fontStyle: 'italic', fontWeight: 700, fontSize: fs, lineHeight: 1.05, color: C.amber, translate: `0px ${interpolate(t2, [0, 1], [105, 0]) - tOut * 105}%`, textShadow: '0 8px 40px rgba(0,0,0,.6)' }}>Bir dünya.</div>
        </div>
      </AbsoluteFill>
      <Vignette strength={0.62} />
      <Grain opacity={0.07} />
    </AbsoluteFill>
  );
};
