// Oyunun GERÇEK bulmaca sayfası (PaperPainter çıktısı) 3B düzlemde: eğim, gölge, lamba düşüşü, ışık süpürmesi.
import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';

export type Pose = { cx: number; cy: number; w: number; rx: number; ry: number; rz: number; s: number };

type Props = {
  readonly pose: Pose;
  readonly perspective: number;
  readonly shadow?: number; // 0..1
  readonly sheen?: number | null; // -0.5..1.5 ışık bandının konumu
  readonly light?: number; // lamba ışığı yoğunluğu
  readonly opacity?: number;
  readonly children?: React.ReactNode;
};

export const PAGE_RATIO = 1160 / 1800;

export const PagePlane: React.FC<Props> = ({ pose, perspective, shadow = 1, sheen = null, light = 1, opacity = 1, children }) => {
  const { cx, cy, w, rx, ry, rz, s } = pose;
  const h = w * PAGE_RATIO;
  return (
    <AbsoluteFill style={{ perspective, perspectiveOrigin: `${cx}px ${cy}px`, opacity }}>
      <div style={{ position: 'absolute', left: cx - w / 2, top: cy - h / 2, width: w, height: h, transformStyle: 'preserve-3d', transform: `rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${s})` }}>
        <div style={{ position: 'absolute', inset: 0, transform: `translate3d(${w * 0.014}px, ${h * 0.045}px, -3px)`, background: 'rgba(0,0,0,.66)', filter: `blur(${w * 0.024}px)`, opacity: shadow, borderRadius: w * 0.01 }} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: w * 0.003, overflow: 'hidden', boxShadow: `0 ${h * 0.006}px ${h * 0.01}px rgba(0,0,0,.35)` }}>
          <Img src={staticFile('img/sayfa-gercek.jpg')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(112deg, rgba(255,248,230,${0.16 * light}) 0%, rgba(255,248,230,0) 40%, rgba(40,24,10,${0.18 * light}) 100%)` }} />
          {sheen !== null ? (
            <div style={{ position: 'absolute', top: '-20%', bottom: '-20%', width: '34%', left: `${sheen * 100}%`, rotate: '14deg', background: 'linear-gradient(90deg, rgba(255,250,235,0), rgba(255,250,235,.26) 50%, rgba(255,250,235,0))' }} />
          ) : null}
          {children}
        </div>
      </div>
    </AbsoluteFill>
  );
};
