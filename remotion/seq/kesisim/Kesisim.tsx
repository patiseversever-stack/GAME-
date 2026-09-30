// SEKANS 1 — KESİŞİM (dikey 1080x1920, 60 kare/sn, ~9,7 sn)
// Karanlıkta tek bir ışık tutuşur ve kıvrımlı karo yollarında koşmaya başlar; kamera alçaktan onu kovalar.
// Alan dalga hâlinde kendini çizer; kamera yükselip kahramanın etrafında 180° döner ve ışık nehrini ufka doğru
// gösterir. Karolar dalgayla döner (kesişim), yeni yollarda onlarca ışık yanar; başlık gelir, kamera ışığa dalar.
import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { AbsoluteFill, Easing, interpolate, random, useCurrentFrame, useVideoConfig } from 'remotion';
import { FONT, clampOpts } from '../../theme';
import { T } from './field';
import { makeBufs, renderFrame } from './render';

const CREAM = '#f3ead6', AMBER = '#f2b256';
const OUT = Easing.bezier(0.16, 1, 0.3, 1), IN = Easing.bezier(0.55, 0, 0.9, 0.4);

// tek satır: maskeden yukarı kayar, harf aralığı daralarak oturur, bulanıklık açılır; çıkış daha hızlı
const Line: React.FC<{ text: string; t: number; at: number; out: number; size: number; italic?: boolean; color: string; glow?: boolean }> = ({ text, t, at, out, size, italic, color, glow }) => {
  const k = interpolate(t, [at, at + 0.75], [0, 1], { ...clampOpts, easing: OUT });
  const x = interpolate(t, [out, out + 0.32], [0, 1], { ...clampOpts, easing: IN });
  const g = glow ? interpolate(t, [at + 0.35, at + 0.8, at + 1.8], [0, 1, 0.55], clampOpts) : 0;
  return (
    <div style={{ overflow: 'hidden', paddingBottom: size * 0.16, marginBottom: -size * 0.1 }}>
      <div style={{
        fontFamily: FONT.didone, fontWeight: italic ? 700 : 900, fontStyle: italic ? 'italic' : 'normal', fontSize: size, lineHeight: 1.04,
        color, whiteSpace: 'nowrap', letterSpacing: `${interpolate(k, [0, 1], [0.06, -0.012])}em`,
        translate: `0px ${(1 - k) * 105 - x * 110}%`, filter: `blur(${(1 - k) * 6}px)`,
        textShadow: `0 8px 40px rgba(0,0,0,.65)${g > 0 ? `, 0 0 ${28 + 20 * g}px rgba(242,178,86,${0.55 * g})` : ''}`,
      }}>{text}</div>
    </div>
  );
};

const Title: React.FC<{ t: number }> = ({ t }) => {
  const at = T.title, out = T.titleOut;
  const scrim = interpolate(t, [at - 0.3, at + 0.5, out, out + 0.45], [0, 1, 1, 0], clampOpts);
  const eyebrowK = interpolate(t, [at, at + 0.6], [0, 1], { ...clampOpts, easing: OUT });
  const eyebrowOut = interpolate(t, [out, out + 0.25], [1, 0], clampOpts);
  return (
    <>
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(5,6,7,0) 17%, rgba(5,6,7,.62) 27%, rgba(5,6,7,.55) 52%, rgba(5,6,7,0) 64%)', opacity: scrim }} />
      <div style={{ position: 'absolute', left: 86, top: 548 }}>
        <div style={{ fontFamily: FONT.type, fontWeight: 700, fontSize: 30, letterSpacing: '0.4em', color: AMBER, marginBottom: 26, opacity: eyebrowK * eyebrowOut, clipPath: `inset(0 ${(1 - eyebrowK) * 100}% 0 0)` }}>01 — KESİŞİMLER</div>
        <Line text="Kesişimlerde" t={t} at={at + 0.12} out={out} size={142} italic color={CREAM} />
        <Line text="yeni bir yol" t={t} at={at + 0.27} out={out + 0.04} size={142} color={CREAM} />
        <Line text="açılır." t={t} at={at + 0.42} out={out + 0.08} size={158} italic color={AMBER} glow />
      </div>
    </>
  );
};

const GRAIN = `url("data:image/svg+xml,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='0.95' numOctaves='2' seed='3' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(#g)'/></svg>")}")`;

// son rötuş: vinyet, ince gren, finaldeki ışık patlaması ve karartma
const Finish: React.FC<{ t: number; frame: number }> = ({ t, frame }) => {
  const flash = interpolate(t, [T.flash - 0.05, T.flash + 0.02, T.flash + 0.12], [0, 1, 0.85], clampOpts);
  const black = interpolate(t, [T.flash + 0.1, T.end], [0, 1], clampOpts);
  const openBlack = interpolate(t, [0, 0.12], [1, 0], clampOpts);
  return (
    <>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 88% 70% at 50% 50%, rgba(0,0,0,0) 52%, rgba(0,0,0,.5) 86%, rgba(0,0,0,.78) 100%)' }} />
      <AbsoluteFill style={{ backgroundImage: GRAIN, backgroundSize: '300px 300px', backgroundPosition: `${Math.floor(random(`gx${frame}`) * 300)}px ${Math.floor(random(`gy${frame}`) * 300)}px`, opacity: 0.075, mixBlendMode: 'overlay' }} />
      <AbsoluteFill style={{ background: 'radial-gradient(circle at 50% 55%, #ffffff, #fff1d8 40%, #ffcf8f)', opacity: flash * (1 - black) }} />
      <AbsoluteFill style={{ background: '#000', opacity: Math.max(black, openBlack) }} />
    </>
  );
};

export const Kesisim: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const t = frame / fps;
  const ref = useRef<HTMLCanvasElement>(null);
  const bufs = useMemo(() => makeBufs(W, H), [W, H]);
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (ctx) renderFrame(ctx, t, bufs, W, H, fps);
  }, [t, bufs, W, H, fps]);
  return (
    <AbsoluteFill style={{ background: '#050607' }}>
      <canvas ref={ref} width={W} height={H} style={{ position: 'absolute', inset: 0, width: W, height: H }} />
      <Title t={t} />
      <Finish t={t} frame={frame} />
    </AbsoluteFill>
  );
};
