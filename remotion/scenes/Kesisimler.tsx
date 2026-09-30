// SAHNE 03 — KESİŞİMLER
// Bulmaca kareleri Truchet karolarına dönüşür: her karede iki çeyrek yay; karolar merkezden dışa dalga halinde çizilir,
// sonra dalgalar halinde 90° dönerek yolları yeniden kurar ("Kesişimlerde yeni bir yol açılır" — oyunun alt satırı).
// Üstte kinetik tipografi; sonda karolar merkeze çöker ve bir sonraki sahnede sayfa doğar.
import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { evolvePath } from '@remotion/paths';
import { C, EASE, FONT, clampOpts } from '../theme';
import { Backdrop, Grain, Vignette } from '../components/Atmosphere';
import { hash } from '../lib/math';

const Line: React.FC<{ text: string; at: number; size: number; italic?: boolean; color: string; outAt: number }> = ({ text, at, size, italic, color, outAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inK = spring({ frame: frame - at, fps, config: { damping: 200 }, durationInFrames: Math.round(fps * 0.5) });
  const outK = interpolate(frame, [outAt, outAt + fps * 0.25], [0, 1], { ...clampOpts, easing: EASE.in });
  return (
    <div style={{ overflow: 'hidden', paddingBottom: size * 0.08 }}>
      <div style={{ fontFamily: FONT.display, fontWeight: italic ? 700 : 900, fontStyle: italic ? 'italic' : 'normal', fontSize: size, lineHeight: 1.02, color, whiteSpace: 'nowrap', translate: `0px ${interpolate(inK, [0, 1], [110, 0]) - outK * 110}%`, textShadow: '0 6px 30px rgba(0,0,0,.55)' }}>{text}</div>
    </div>
  );
};

export const Kesisimler: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width: W, height: H, durationInFrames: D } = useVideoConfig();
  const land = W >= H, u = Math.min(W, H) / 1080;
  const sec = (s: number) => s * fps;
  const T = (land ? 128 : 120) * u;
  const cols = Math.ceil(W / T) + 2, rows = Math.ceil(H / T) + 2;
  const ox = (W - cols * T) / 2, oy = (H - rows * T) / 2;
  const ccx = (cols - 1) / 2, ccy = (rows - 1) / 2;
  const maxD = Math.hypot(ccx, ccy);

  // kamera: hafif dönüş + yakınlaşma
  const camRot = interpolate(frame, [0, D], [-5, 3], { easing: EASE.inOut });
  const camScale = interpolate(frame, [0, D], [1.14, 1.0], { easing: EASE.out });
  const collapseAt = D - sec(0.36);

  const r = T / 2, sw = T * 0.15;
  const arcA = `M ${r} 0 A ${r} ${r} 0 0 1 0 ${r}`; // sol üst köşe merkezli
  const arcB = `M ${T} ${r} A ${r} ${r} 0 0 0 ${r} ${T}`; // sağ alt köşe merkezli
  const len = (Math.PI * r) / 2;

  const tiles = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const d = Math.hypot(i - ccx, j - ccy) / maxD; // 0 merkez … 1 kenar
    const drawK = spring({ frame: frame - sec(0.02 + d * 0.42), fps, config: { damping: 200 }, durationInFrames: sec(0.42) });
    const o = hash(i, j, 3) < 0.5 ? 0 : 90;
    const turn1 = spring({ frame: frame - sec(0.55 + d * 0.3), fps, config: { damping: 12, stiffness: 140, mass: 0.7 } });
    const turn2 = spring({ frame: frame - sec(0.85 + (1 - d) * 0.28), fps, config: { damping: 12, stiffness: 140, mass: 0.7 } });
    const flipOdd = hash(i, j, 7) < 0.55 ? 1 : 0, flipOdd2 = hash(i, j, 11) < 0.45 ? 1 : 0;
    const rot = o + 90 * turn1 * flipOdd - 90 * turn2 * flipOdd2;
    const col = hash(i, j, 5) < 0.14 ? C.amber : C.cream;
    const cK = interpolate(frame, [collapseAt + sec(0.22 * (1 - d)), collapseAt + sec(0.22 * (1 - d)) + sec(0.18)], [0, 1], { ...clampOpts, easing: EASE.in });
    const ev = evolvePath(drawK, arcA), ev2 = evolvePath(drawK, arcB);
    tiles.push(
      <svg key={`${i},${j}`} width={T} height={T} viewBox={`0 0 ${T} ${T}`} style={{ position: 'absolute', left: ox + i * T, top: oy + j * T, overflow: 'visible', rotate: `${rot}deg`, scale: String(1 - cK), opacity: 1 - cK * 0.8, translate: `${(ccx - i) * T * cK * 0.8}px ${(ccy - j) * T * cK * 0.8}px` }}>
        <path d={arcA} fill="none" stroke={col} strokeWidth={sw} strokeLinecap="round" strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} />
        <path d={arcB} fill="none" stroke={col} strokeWidth={sw} strokeLinecap="round" strokeDasharray={ev2.strokeDasharray} strokeDashoffset={ev2.strokeDashoffset} />
      </svg>,
    );
  }
  void len;

  const fs = (land ? 132 : 104) * u;
  const outAt = D - sec(0.45);
  return (
    <AbsoluteFill>
      <Backdrop lamp={0.6} />
      <AbsoluteFill style={{ rotate: `${camRot}deg`, scale: String(camScale) }}>{tiles}</AbsoluteFill>
      {/* okunurluk için sol yarıda koyu perde */}
      <AbsoluteFill style={{ background: land ? 'linear-gradient(90deg, rgba(7,13,12,.86) 0%, rgba(7,13,12,.62) 38%, rgba(7,13,12,0) 66%)' : 'linear-gradient(180deg, rgba(7,13,12,0) 30%, rgba(7,13,12,.78) 50%, rgba(7,13,12,.78) 70%, rgba(7,13,12,0) 88%)', opacity: interpolate(frame, [sec(0.2), sec(0.45), outAt, outAt + sec(0.3)], [0, 1, 1, 0], clampOpts) }} />
      <div style={{ position: 'absolute', left: land ? W * 0.08 : W * 0.08, top: land ? H * 0.24 : H * 0.36 }}>
        <div style={{ fontFamily: FONT.mono, fontWeight: 600, fontSize: 20 * u, letterSpacing: '0.34em', color: C.amber, marginBottom: 18 * u, opacity: interpolate(frame, [sec(0.3), sec(0.5), outAt, outAt + sec(0.2)], [0, 1, 1, 0], clampOpts) }}>03 — KESİŞİMLER</div>
        <Line text="Kesişimlerde" at={sec(0.34)} size={fs} italic color={C.cream} outAt={outAt} />
        <Line text="yeni bir yol" at={sec(0.46)} size={fs} color={C.cream} outAt={outAt + 2} />
        <Line text="açılır." at={sec(0.58)} size={fs} italic color={C.amber} outAt={outAt + 4} />
      </div>
      <Vignette strength={0.75} />
      <Grain opacity={0.08} />
    </AbsoluteFill>
  );
};
