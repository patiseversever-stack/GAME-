// SAHNE 01 — MÜREKKEP
// Karanlıkta amber bir kalem ucu → çizgi fırlar → gazete başlığının çift çizgisi açılır →
// "Gece Postası" harfleri matbaa baskısı gibi sekerek düşer → alt satır daktiloyla yazılır. Kamera sonda başlığa dalar.
import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, EASE, FONT, SPRING, clampOpts } from '../theme';
import { Backdrop, Grain, Vignette } from '../components/Atmosphere';

const RegMark: React.FC<{ x: number; y: number; r: number; k: number; rot: number }> = ({ x, y, r, k, rot }) => (
  <svg width={r * 2.8} height={r * 2.8} viewBox="-1.4 -1.4 2.8 2.8" style={{ position: 'absolute', left: x - r * 1.4, top: y - r * 1.4, opacity: 0.55 * k, rotate: `${rot}deg`, scale: String(0.6 + 0.4 * k), overflow: 'visible' }}>
    <circle r="0.62" fill="none" stroke={C.cream} strokeWidth="0.06" strokeDasharray={`${3.9 * k} 4`} />
    <path d="M-1.2 0H1.2M0 -1.2V1.2" stroke={C.cream} strokeWidth="0.05" />
    <circle r="0.18" fill={C.amber} opacity={k} />
  </svg>
);

export const Murekkep: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width: W, height: H, durationInFrames: D } = useVideoConfig();
  const land = W >= H, u = Math.min(W, H) / 1080;
  const sec = (s: number) => s * fps;
  const cx = W / 2, cy = H / 2 - (land ? 30 : 80) * u;

  // Kamera: yavaş itiş, sonda başlığa dalış (sonraki sahneye geçiş)
  const exitK = interpolate(frame, [D - sec(0.34), D], [0, 1], { ...clampOpts, easing: EASE.in });
  const camScale = interpolate(frame, [0, D], [1, 1.06]) * (1 + exitK * 1.6);
  const camOpacity = 1 - interpolate(exitK, [0.55, 1], [0, 1], clampOpts);

  // Kalem ucu → çizgi
  const dot = spring({ frame, fps, config: { damping: 13, stiffness: 220 } });
  const lineW = interpolate(frame, [sec(0.08), sec(0.42)], [0, (land ? 1420 : 940) * u], { ...clampOpts, easing: EASE.whip });
  const fsTitle = (land ? 232 : 156) * u;
  const open = spring({ frame: frame - sec(0.3), fps, config: SPRING.soft, durationInFrames: sec(0.45) });
  const gap = open * fsTitle * 0.66;

  const title = 'Gece Postası'.split('');
  const tag = 'BİR SAYFA · BİR DÜNYA';
  const tagN = Math.floor(interpolate(frame, [sec(0.72), sec(1.05)], [0, tag.length], clampOpts));
  const cursorOn = Math.floor(frame / (fps * 0.12)) % 2 === 0;

  const regK = spring({ frame: frame - sec(0.12), fps, config: SPRING.soft, durationInFrames: sec(0.6) });
  const guidesK = interpolate(frame, [sec(0.05), sec(0.7)], [0, 1], { ...clampOpts, easing: EASE.out });
  const safeX = W * (land ? 0.1 : 0.09), safeY = H * (land ? 0.16 : 0.2);
  const cols = land ? 12 : 6;

  return (
    <AbsoluteFill>
      <Backdrop lamp={0.7} />
      <AbsoluteFill style={{ scale: String(camScale), opacity: camOpacity, transformOrigin: `${cx}px ${cy}px` }}>
        {/* sayfa düzeni sütun kılavuzları */}
        {Array.from({ length: cols + 1 }, (_, i) => (
          <div key={i} style={{ position: 'absolute', left: safeX + ((W - 2 * safeX) * i) / cols, top: safeY, width: 1, height: H - 2 * safeY, background: C.cream, opacity: 0.07, scale: `1 ${guidesK}`, transformOrigin: 'top' }} />
        ))}
        <RegMark x={safeX} y={safeY} r={22 * u} k={regK} rot={(1 - regK) * -120} />
        <RegMark x={W - safeX} y={safeY} r={22 * u} k={regK} rot={(1 - regK) * 120} />
        <RegMark x={safeX} y={H - safeY} r={22 * u} k={regK} rot={(1 - regK) * 90} />
        <RegMark x={W - safeX} y={H - safeY} r={22 * u} k={regK} rot={(1 - regK) * -90} />

        {/* kalem ucu */}
        <div style={{ position: 'absolute', left: cx - 9 * u, top: cy - 9 * u, width: 18 * u, height: 18 * u, borderRadius: '50%', background: C.amber, boxShadow: `0 0 ${40 * u}px ${C.amber}`, scale: String(dot * (1 - interpolate(frame, [sec(0.3), sec(0.45)], [0, 1], clampOpts))) }} />
        {/* çift çizgi (masthead) */}
        <div style={{ position: 'absolute', left: cx - lineW / 2, top: cy - gap - 6 * u, width: lineW, height: 7 * u, background: C.cream, boxShadow: `0 0 ${18 * u}px rgba(240,194,122,.35)` }} />
        <div style={{ position: 'absolute', left: cx - lineW / 2, top: cy + gap, width: lineW, height: 3 * u, background: C.cream, opacity: open }} />
        <div style={{ position: 'absolute', left: cx - lineW / 2, top: cy + gap + 11 * u, width: lineW, height: 7 * u, background: C.cream, opacity: open }} />

        {/* başlık harfleri */}
        <div style={{ position: 'absolute', left: 0, width: W, top: cy - fsTitle * 0.62, display: 'flex', justifyContent: 'center', fontFamily: FONT.display, fontWeight: 900, fontSize: fsTitle, lineHeight: 1, color: C.cream, letterSpacing: '-0.01em' }}>
          {title.map((ch, i) => {
            const at = sec(0.36) + i * sec(0.042);
            const s = spring({ frame: frame - at, fps, config: SPRING.pop });
            const t = frame - at;
            const ring = interpolate(t, [2, 14], [0.2, 1.7], clampOpts), ringOp = interpolate(t, [2, 14], [0.6, 0], clampOpts);
            return (
              <span key={i} style={{ position: 'relative', display: 'inline-block', whiteSpace: 'pre', opacity: interpolate(t, [0, 2], [0, 1], clampOpts), translate: `0px ${interpolate(s, [0, 1], [-fsTitle * 0.9, 0])}px`, rotate: `${interpolate(s, [0, 1], [-16 + i * 3, 0])}deg`, scale: String(interpolate(s, [0, 1], [1.5, 1])) }}>
                {ch}
                {ch !== ' ' ? <span style={{ position: 'absolute', left: '50%', top: '96%', width: fsTitle * 0.5, height: fsTitle * 0.12, marginLeft: -fsTitle * 0.25, borderRadius: '50%', border: `${2 * u}px solid ${C.amber}`, opacity: ringOp, scale: String(ring) }} /> : null}
              </span>
            );
          })}
        </div>

        {/* alt satır: daktilo */}
        <div style={{ position: 'absolute', left: 0, width: W, top: cy + gap + 52 * u, textAlign: 'center', fontFamily: FONT.mono, fontWeight: 600, fontSize: (land ? 30 : 26) * u, letterSpacing: '0.42em', color: C.amber, whiteSpace: 'pre' }}>
          {tag.slice(0, tagN)}
          <span style={{ opacity: tagN > 0 && cursorOn ? 1 : 0, color: C.cream }}>▍</span>
        </div>
        <div style={{ position: 'absolute', left: cx + lineW / 2 - 520 * u, width: 520 * u, top: cy - gap - 44 * u, textAlign: 'right', fontFamily: FONT.mono, fontWeight: 500, fontSize: 16 * u, letterSpacing: '0.22em', color: C.cream, opacity: 0.6 * open }}>
          29 EYLÜL 2026 · KÜLTÜR EKİ · 03
        </div>
      </AbsoluteFill>
      <Vignette strength={0.7} />
      <Grain opacity={0.08} />
    </AbsoluteFill>
  );
};
