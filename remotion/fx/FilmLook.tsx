// Eski film görünümü: çerçeve kayması (gate weave), ışık titremesi, hareketli gren, toz zerreleri, çizikler,
// yanık kenarlı vinyet. Rastgelelik kareden türetilir (deterministik); period verilirse döngüde dikişsiz tekrar eder.
import React from 'react';
import { AbsoluteFill, random, useCurrentFrame, useVideoConfig } from 'remotion';

const GRAIN = `url("data:image/svg+xml,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='1.15' numOctaves='2' seed='4' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(#g)'/></svg>")}")`;

type Props = { readonly children: React.ReactNode; readonly period?: number; readonly strength?: number; readonly startFrame?: number };

export const FilmLook: React.FC<Props> = ({ children, period, strength = 1, startFrame = 0 }) => {
  const raw = useCurrentFrame() + startFrame;
  const { width: W, height: H } = useVideoConfig();
  const f = period ? ((raw % period) + period) % period : raw;
  const u = W / 1080;
  const r = (k: string) => random(`${k}-${f}`);
  // gate weave: çok küçük titreşim
  const wx = (r('wx') - 0.5) * 2.2 * u * strength, wy = (r('wy') - 0.5) * 3 * u * strength;
  // ışık titremesi (projektör lambası)
  const flick = 0.035 + 0.05 * r('fl') * strength;
  // toz zerreleri
  const dust = Array.from({ length: 5 }, (_, i) => {
    if (r(`dp${i}`) > 0.33) return null;
    const x = r(`dx${i}`) * W, y = r(`dy${i}`) * H, s = (2 + r(`ds${i}`) * 7) * u, light = r(`dl${i}`) > 0.6;
    const hair = r(`dh${i}`) > 0.85;
    return hair ? (
      <svg key={i} width={60 * u} height={60 * u} viewBox="0 0 60 60" style={{ position: 'absolute', left: x, top: y, opacity: 0.55 }}>
        <path d={`M5 ${30 + r(`h1${i}`) * 20} C 20 ${r(`h2${i}`) * 60}, 40 ${r(`h3${i}`) * 60}, 55 ${10 + r(`h4${i}`) * 30}`} stroke={light ? '#fff6e0' : '#120d08'} strokeWidth={1.2} fill="none" />
      </svg>
    ) : (
      <div key={i} style={{ position: 'absolute', left: x, top: y, width: s, height: s * (0.6 + r(`da${i}`) * 0.8), borderRadius: '50%', background: light ? 'rgba(255,246,224,.7)' : 'rgba(18,13,8,.75)', filter: `blur(${s * 0.15}px)` }} />
    );
  });
  // dikey çizik (arada bir, birkaç kare)
  const scratchOn = r('sc') < 0.07;
  const sx = r('sx') * W;
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: '#050505' }}>
      <AbsoluteFill style={{ translate: `${wx}px ${wy}px` }}>{children}</AbsoluteFill>
      <AbsoluteFill style={{ background: '#000', opacity: flick, pointerEvents: 'none' }} />
      <AbsoluteFill style={{ backgroundImage: GRAIN, backgroundSize: `${320 * u}px ${320 * u}px`, backgroundPosition: `${Math.floor(r('gx') * 320)}px ${Math.floor(r('gy') * 320)}px`, opacity: 0.16 * strength, mixBlendMode: 'overlay', pointerEvents: 'none' }} />
      {dust}
      {scratchOn ? <div style={{ position: 'absolute', left: sx, top: 0, width: 1.4 * u, height: H, background: 'linear-gradient(transparent, rgba(255,248,230,.55) 20%, rgba(255,248,230,.35) 70%, transparent)' }} /> : null}
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 78% 62% at 50% 50%, rgba(0,0,0,0) 55%, rgba(10,6,2,.55) 88%, rgba(5,3,1,.82) 100%)', pointerEvents: 'none' }} />
    </AbsoluteFill>
  );
};
