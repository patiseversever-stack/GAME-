// Arka plan katmanları: gece mürekkebi zemini, oyunun kendi ahşap masası, lamba ışığı, film greni, vinyet.
import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from 'remotion';
import { C } from '../theme';
import { hash } from '../lib/math';

const NOISE = `url("data:image/svg+xml,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.92' numOctaves='2' seed='9' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>")}")`;

// Gece zemini (koyu yeşil-siyah) + isteğe bağlı masa. desk: 0..1, lamp: lamba ışığı şiddeti.
export const Backdrop: React.FC<{ desk?: number; lamp?: number; lampX?: number; lampY?: number }> = ({ desk = 0, lamp = 1, lampX = 50, lampY = 46 }) => {
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 80% 75% at 50% 45%, ${C.night3} 0%, ${C.night2} 48%, ${C.night} 100%)` }} />
      {desk > 0 ? (
        <AbsoluteFill style={{ opacity: desk }}>
          <Img src={staticFile('img/desk.jpg')} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(.55) saturate(1.1) contrast(1.08)' }} />
          <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(12,8,6,.35), rgba(12,8,6,0) 30%, rgba(12,8,6,0) 70%, rgba(12,8,6,.4))' }} />
        </AbsoluteFill>
      ) : null}
      <AbsoluteFill style={{ opacity: lamp, background: `radial-gradient(ellipse 55% 60% at ${lampX}% ${lampY}%, rgba(255,211,150,.2), rgba(255,211,150,.06) 45%, rgba(255,211,150,0) 72%)` }} />
    </AbsoluteFill>
  );
};

// Baskı/film greni. Varsayılan: sabit doku (ince baskı dokusu; video sıkıştırmasında neredeyse bedava).
// animated verilirse her karede kayar (period ile döngüde dikişsiz).
export const Grain: React.FC<{ opacity?: number; period?: number; animated?: boolean }> = ({ opacity = 0.07, period, animated = false }) => {
  const frame = useCurrentFrame();
  const f = !animated ? 0 : period ? ((frame % period) + period) % period : frame;
  const x = Math.floor(hash(f, 11) * 256), y = Math.floor(hash(f, 23) * 256);
  return <AbsoluteFill style={{ backgroundImage: NOISE, backgroundSize: '256px 256px', backgroundPosition: `${x}px ${y}px`, opacity, mixBlendMode: 'overlay', pointerEvents: 'none' }} />;
};

export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.6 }) => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse 88% 82% at 50% 50%, rgba(0,0,0,0) 52%, rgba(0,0,0,${strength}) 100%)`, pointerEvents: 'none' }} />
);
