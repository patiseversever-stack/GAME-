// SEKANS 1 — AÇILIŞ (dikey 1080x1920, 60 kare/sn, 5 sn)
// "Şehir uyurken, harfler uyanır." Karanlıkta tek pencere yanar: perdesinin önünde bir G. Kamera geri çekildikçe
// bu pencerenin bir gazete kulesinin cephesinde olduğu, cephenin de bir bulmaca olduğu anlaşılır: şehrin ışıkları
// birer birer sönerken bulmacanın kareleri yanar ve GECE POSTASI yazar. Son kare bir afiş gibi durur.
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AbsoluteFill, Easing, continueRender, delayRender, interpolate, random, useCurrentFrame, useVideoConfig } from 'remotion';
import { fontsReady } from '../../fonts';
import { FONT, clampOpts } from '../../theme';
import { T } from './scene';
import { makeBufs, renderFrame } from './render';

const CREAM = '#f3ead6', AMBER = '#f2b256';
const OUT = Easing.bezier(0.16, 1, 0.3, 1);

const Line: React.FC<{ text: React.ReactNode; t: number; at: number; size: number }> = ({ text, t, at, size }) => {
  const k = interpolate(t, [at, at + 0.9], [0, 1], { ...clampOpts, easing: OUT });
  return (
    <div style={{ overflow: 'hidden', paddingBottom: size * 0.18, marginBottom: -size * 0.12 }}>
      <div style={{
        fontFamily: FONT.didone, fontWeight: 700, fontStyle: 'italic', fontSize: size, lineHeight: 1.05, color: CREAM, whiteSpace: 'nowrap',
        letterSpacing: `${interpolate(k, [0, 1], [0.05, -0.005])}em`, translate: `0px ${(1 - k) * 130}%`, filter: `blur(${(1 - k) * 5}px)`, opacity: k > 0 ? 1 : 0,
        textShadow: '0 4px 28px rgba(0,0,0,.85)',
      }}>{text}</div>
    </div>
  );
};

const GRAIN = `url("data:image/svg+xml,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='5' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(#g)'/></svg>")}")`;

export const Acilis: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const t = frame / fps;
  const ref = useRef<HTMLCanvasElement>(null);
  const bufs = useMemo(() => makeBufs(), []);
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender('Açılış fontları'));
  useEffect(() => {
    fontsReady.then(() => document.fonts.ready).then(() => { setReady(true); continueRender(handle); });
  }, [handle]);
  useLayoutEffect(() => {
    if (!ready) return;
    const ctx = ref.current?.getContext('2d');
    if (ctx) renderFrame(ctx, t, bufs);
  }, [t, bufs, ready]);
  return (
    <AbsoluteFill style={{ background: '#03050a' }}>
      <canvas ref={ref} width={W} height={H} style={{ position: 'absolute', inset: 0, width: W, height: H }} />
      <div style={{ position: 'absolute', left: 0, width: W, top: 1616, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Line t={t} at={T.tag[0]} size={74} text="Şehir uyurken," />
        <Line t={t} at={T.tag[1]} size={74} text={<>harfler <span style={{ color: AMBER }}>uyanır.</span></>} />
      </div>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 90% 72% at 50% 46%, rgba(0,0,0,0) 55%, rgba(0,0,0,.42) 88%, rgba(0,0,0,.7) 100%)' }} />
      <AbsoluteFill style={{ backgroundImage: GRAIN, backgroundSize: '300px 300px', backgroundPosition: `${Math.floor(random(`gx${frame}`) * 300)}px ${Math.floor(random(`gy${frame}`) * 300)}px`, opacity: 0.07, mixBlendMode: 'overlay' }} />
    </AbsoluteFill>
  );
};
