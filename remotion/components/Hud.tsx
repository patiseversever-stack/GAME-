// Gösterim videosu HUD'u: köşe çerçeveleri, baskı künyesi, sahne adı, zaman kodu, koordinat ve ilerleme çizgisi.
// mode='intro' zaman kodu akar; mode='loop' dikişsiz tarayıcı çubuğu; hepsi yalnızca kareden türetilir.
import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, EASE, FONT, clampOpts } from '../theme';
import { TAU, timecode } from '../lib/math';

type Props = {
  readonly sahne: string; // ör. "01 — MÜREKKEP"
  readonly mode: 'intro' | 'loop' | 'outro';
  readonly startFrame?: number; // intro için zaman kodu başlangıcı
  readonly progress?: number; // 0..1
  readonly loopT?: number; // 0..1 (döngü evresi)
  readonly opacity?: number;
  readonly enter?: number; // 0..1 çerçeve giriş animasyonu
};

const Corner: React.FC<{ x: number; y: number; sx: number; sy: number; len: number; k: number }> = ({ x, y, sx, sy, len, k }) => (
  <div style={{ position: 'absolute', left: x, top: y, width: 0, height: 0 }}>
    <div style={{ position: 'absolute', left: sx < 0 ? -len * k : 0, top: -1, width: len * k, height: 2, background: C.cream, opacity: 0.75 }} />
    <div style={{ position: 'absolute', top: sy < 0 ? -len * k : 0, left: -1, height: len * k, width: 2, background: C.cream, opacity: 0.75 }} />
  </div>
);

export const Hud: React.FC<Props> = ({ sahne, mode, startFrame = 0, progress = 0, loopT = 0, opacity = 1, enter = 1 }) => {
  const frame = useCurrentFrame();
  const { width: W, height: H, fps } = useVideoConfig();
  const u = Math.min(W, H) / 1080;
  const m = 46 * u, len = 36 * u, fs = 15 * u;
  const txt: React.CSSProperties = { position: 'absolute', fontFamily: FONT.mono, fontWeight: 500, fontSize: fs, letterSpacing: '0.18em', color: C.cream, whiteSpace: 'nowrap', opacity: 0.78 };
  const reveal = (s: string, k: number) => s.slice(0, Math.round(s.length * k));
  const e = EASE.out(Math.max(0, Math.min(1, enter)));
  const barW = 200 * u;
  const blink = mode === 'loop' ? 0.45 + 0.55 * (0.5 + 0.5 * Math.cos(loopT * TAU * 4)) : 1;
  return (
    <AbsoluteFill style={{ opacity, pointerEvents: 'none' }}>
      <Corner x={m} y={m} sx={1} sy={1} len={len} k={e} />
      <Corner x={W - m} y={m} sx={-1} sy={1} len={len} k={e} />
      <Corner x={m} y={H - m} sx={1} sy={-1} len={len} k={e} />
      <Corner x={W - m} y={H - m} sx={-1} sy={-1} len={len} k={e} />
      <div style={{ ...txt, left: m + 18 * u, top: m + 12 * u }}>
        <span style={{ color: C.amber, fontWeight: 600 }}>{reveal('GECE POSTASI', e)}</span>
        <span style={{ opacity: 0.55 }}>{reveal('  —  KÜLTÜR EKİ · 03', e)}</span>
      </div>
      <div style={{ ...txt, right: m + 18 * u, top: m + 12 * u, textAlign: 'right' }}>{reveal(sahne, e)}</div>
      <div style={{ ...txt, left: m + 18 * u, bottom: m + 10 * u }}>
        {mode === 'loop' ? (
          <span><span style={{ color: C.amber, opacity: blink }}>●</span>{'  BASKI HAZIRLANIYOR'}</span>
        ) : (
          <span>{timecode(Math.max(0, frame + startFrame), fps)}<span style={{ opacity: 0.5 }}>{`   ${fps} KARE/SN`}</span></span>
        )}
      </div>
      <div style={{ ...txt, right: m + 18 * u, bottom: m + 10 * u + 12 * u, textAlign: 'right' }}>{reveal('41.0082° K   28.9784° D', e)}</div>
      <div style={{ position: 'absolute', right: m + 18 * u, bottom: m + 8 * u, width: barW, height: 2 * u, background: 'rgba(246,239,220,.18)' }}>
        {mode === 'loop' ? (
          <div style={{ position: 'absolute', top: 0, height: '100%', width: barW * 0.22, left: interpolate(loopT, [0, 1], [-barW * 0.22, barW]), background: C.amber, opacity: 0.9 }} />
        ) : (
          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: barW * interpolate(progress, [0, 1], [0, 1], clampOpts), background: C.amber }} />
        )}
      </div>
    </AbsoluteFill>
  );
};
