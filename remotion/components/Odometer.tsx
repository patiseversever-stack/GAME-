// Mekanik tarih sayacı: dört rakam çarkı yukarı doğru döner, "M.Ö." plakası gerekiyorsa belirir.
// Filmin tamamında üstte durur ve yolculuğun omurgasıdır (M.Ö. 3000 → 2026).
import React from 'react';
import { interpolate, useVideoConfig } from 'remotion';
import { C, EASE, FONT, clampOpts } from '../theme';

export type Era = { year: number; bc: boolean; label: string };

type Props = { readonly from: Era; readonly to: Era; readonly k: number; readonly opacity?: number };

const digitsOf = (y: number) => String(y).padStart(4, ' ').split('');

const Wheel: React.FC<{ a: string; b: string; k: number; h: number; w: number; extra: number }> = ({ a, b, k, h, w, extra }) => {
  const da = a === ' ' ? 10 : +a, db = b === ' ' ? 10 : +b;
  // 0-9 ve "boş" (10) 11 konumlu bir şerit; her zaman yukarı döner (+extra tam tur)
  const delta = ((db - da + 11) % 11) + extra * 11;
  const v = da + delta * EASE.inOut(k);
  const cells = Array.from({ length: 11 * 4 }, (_, i) => i % 11);
  return (
    <div style={{ width: w, height: h, overflow: 'hidden', position: 'relative', background: 'linear-gradient(#0b0a09, #1d1a16 45%, #0b0a09)', borderRadius: w * 0.08, boxShadow: `inset 0 ${h * 0.12}px ${h * 0.14}px rgba(0,0,0,.75), inset 0 -${h * 0.12}px ${h * 0.14}px rgba(0,0,0,.75), 0 0 0 1px rgba(212,165,74,.35)` }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', translate: `0px ${-(v % 11) * h}px` }}>
        {cells.map((d, i) => (
          <div key={i} style={{ height: h, display: 'grid', placeItems: 'center', fontFamily: FONT.type, fontWeight: 700, fontSize: h * 0.66, color: C.paper }}>{d === 10 ? '' : d}</div>
        ))}
      </div>
    </div>
  );
};

export const Odometer: React.FC<Props> = ({ from, to, k, opacity = 1 }) => {
  const { width: W } = useVideoConfig();
  const u = W / 1080, h = 78 * u, w = 58 * u;
  const a = digitsOf(from.year), b = digitsOf(to.year);
  const bcOp = interpolate(k, [0, 1], [from.bc ? 1 : 0, to.bc ? 1 : 0], clampOpts);
  const labOut = interpolate(k, [0, 0.45], [1, 0], clampOpts), labIn = interpolate(k, [0.55, 1], [0, 1], clampOpts);
  return (
    <div style={{ position: 'absolute', left: 0, width: W, top: 96 * u, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 * u, opacity }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 * u, padding: `${10 * u}px ${14 * u}px`, background: 'linear-gradient(#2a241c, #15120e)', borderRadius: 10 * u, boxShadow: `0 ${12 * u}px ${30 * u}px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,230,180,.18), 0 0 0 1px rgba(212,165,74,.45)` }}>
        <div style={{ width: 96 * u * bcOp, overflow: 'hidden', opacity: bcOp, fontFamily: FONT.type, fontWeight: 700, fontSize: 38 * u, color: C.amber, whiteSpace: 'nowrap', textAlign: 'center' }}>M.Ö.</div>
        {a.map((d, i) => <Wheel key={i} a={d} b={b[i]} k={k} h={h} w={w} extra={i === 0 ? 1 : 0} />)}
      </div>
      <div style={{ position: 'relative', height: 40 * u, width: W }}>
        <div style={{ position: 'absolute', inset: 0, textAlign: 'center', fontFamily: FONT.roman, fontWeight: 700, fontSize: 30 * u, letterSpacing: '0.32em', color: C.paper, opacity: labOut, translate: `0px ${-(1 - labOut) * 14 * u}px`, textShadow: '0 2px 12px rgba(0,0,0,.8)' }}>{from.label}</div>
        <div style={{ position: 'absolute', inset: 0, textAlign: 'center', fontFamily: FONT.roman, fontWeight: 700, fontSize: 30 * u, letterSpacing: '0.32em', color: C.paper, opacity: labIn, translate: `0px ${(1 - labIn) * 14 * u}px`, textShadow: '0 2px 12px rgba(0,0,0,.8)' }}>{to.label}</div>
      </div>
    </div>
  );
};
