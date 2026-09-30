// SAHNE 1 — PAPİRÜS (M.Ö. 3000 · Mısır)
// Karanlıkta amber bir kıvılcım yanar → soğuyup mürekkep damlasına döner → düşer ve sıçrar → ıslak leke papirüsü açar.
// Damla, fırça darbeleriyle boyanan Horus Gözü'nün göz bebeği olur; çevresinde renkli hiyeroglif şeritleri ve friz
// bantları belirir. Göz bebeği (koyu) bir sonraki sahnenin kapısıdır.
import React from 'react';
import { AbsoluteFill, Img, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { evolvePath } from '@remotion/paths';
import { noise2D } from '@remotion/noise';
import { C, EASE, clampOpts } from '../theme';
import { brushOutline, brushProfile, pointOn, sampleBrush } from '../fx/brush';

const INK = '#15100a', BLUE = '#1f5e93', RED = '#a8321f', GREEN = '#3d7a4c', OCHRE = '#c9922f', WHITE = '#f3ead6';

// Göz: 400x260 yerel kutu, ES ölçeğinde; göz bebeği ekranda (540, 900)
const ES = 2.1;
const PUPIL = { x: 196, y: 118, r: 44 };
const EO = { x: 540 - PUPIL.x * ES, y: 900 - PUPIL.y * ES };
const HIT = { x: 540, y: 900 };
export const PAPIRUS_PORTAL = { cx: HIT.x, cy: HIT.y, r: 84, feather: 170 };

type Stroke = { d: string; w: number; at: number; dur: number; fill?: string; prof: [number, number, number] };
const EYE: Stroke[] = [
  { d: 'M40 128 C100 62 250 50 344 108', w: 14, at: 0.82, dur: 0.3, prof: [0.12, 0.25, 0.3] }, // üst kapak
  { d: 'M40 128 C110 176 250 170 344 108', w: 9, at: 0.94, dur: 0.28, prof: [0.12, 0.3, 0.3] }, // alt kapak
  { d: 'M334 106 L402 100', w: 13, at: 1.1, dur: 0.14, prof: [0.1, 0.45, 0.22] }, // sürme çizgisi
  { d: 'M46 60 C130 12 272 8 392 48', w: 22, at: 1.02, dur: 0.34, fill: BLUE, prof: [0.08, 0.12, 0.45] }, // kaş
  { d: 'M120 160 C116 192 108 222 98 258', w: 14, at: 1.22, dur: 0.2, prof: [0.15, 0.2, 0.35] }, // gözyaşı çizgisi
  { d: 'M206 160 C218 202 240 232 272 244 C306 256 330 238 324 214 C318 194 296 194 292 210', w: 12, at: 1.28, dur: 0.38, prof: [0.1, 0.22, 0.3] }, // sarmal
];
const EYE_WHITE = 'M40 128 C100 62 250 50 344 108 C250 170 110 176 40 128 Z';

// Boyalı hiyeroglifler (100x100): renkli dolgu + siyah kontur
type Glyph = { fill?: string; color?: string; lines: string[]; lineColor?: string; lineW?: number };
const circ = (x: number, y: number, r: number) => `M${x - r} ${y} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0`;
const GL: Record<string, Glyph> = {
  tuy: { fill: 'M52 6 C72 22 74 62 56 94 L46 94 C50 62 44 30 52 6 Z', color: GREEN, lines: ['M52 6 C72 22 74 62 56 94', 'M52 6 C44 30 50 62 46 94', 'M51 20 L50 97'] },
  baykus: { fill: 'M30 92 C24 62 28 30 46 20 C62 14 74 28 72 52 L80 92 Z', color: OCHRE, lines: ['M30 92 C24 62 28 30 46 20 C62 14 74 28 72 52 L80 92 Z', circ(44, 40, 4), circ(60, 38, 4), 'M38 92 L34 99 M70 92 L74 99'] },
  saz: { fill: 'M50 96 C42 70 40 36 50 6 C60 36 58 70 50 96 Z', color: GREEN, lines: ['M50 96 C42 70 40 36 50 6 C60 36 58 70 50 96 Z', 'M50 88 L50 16'] },
  su: { lines: ['M8 30 L20 20 L32 30 L44 20 L56 30 L68 20 L80 30 L92 20', 'M8 52 L20 42 L32 52 L44 42 L56 52 L68 42 L80 52 L92 42', 'M8 74 L20 64 L32 74 L44 64 L56 74 L68 64 L80 74 L92 64'], lineColor: BLUE, lineW: 6 },
  agiz: { fill: 'M10 50 Q50 26 90 50 Q50 74 10 50 Z', color: RED, lines: ['M10 50 Q50 26 90 50 Q50 74 10 50 Z'] },
  ankh: { lines: ['M50 46 C28 42 30 8 50 8 C70 8 72 42 50 46 Z', 'M18 54 L82 54', 'M50 46 L50 96'], lineColor: BLUE, lineW: 8 },
  ekmek: { fill: 'M14 74 A36 30 0 0 1 86 74 Z', color: OCHRE, lines: ['M14 74 A36 30 0 0 1 86 74 Z'] },
  yilan: { lines: ['M8 72 C22 56 38 78 54 62 C70 46 80 58 92 50', 'M84 52 L80 40 M88 50 L89 38'], lineColor: OCHRE, lineW: 7 },
  kus: { fill: 'M14 78 C24 52 44 36 66 38 C80 40 88 48 92 58 L80 58 C76 70 60 80 40 80 Z', color: OCHRE, lines: ['M14 78 C24 52 44 36 66 38 C80 40 88 48 92 58 L80 58', 'M66 38 C62 26 70 18 80 22', 'M40 80 L36 97 M58 78 L62 97', 'M14 78 C30 82 44 82 60 76'] },
  el: { fill: 'M8 60 L66 60 C82 60 90 52 88 44 L58 44 L52 36 L49 46 L8 48 Z', color: RED, lines: ['M8 60 L66 60 C82 60 90 52 88 44 L58 44 L52 36 L49 46 L8 48'] },
  sepet: { fill: 'M12 42 L88 42 C86 72 66 88 50 88 C34 88 14 72 12 42 Z', color: BLUE, lines: ['M12 42 L88 42 C86 72 66 88 50 88 C34 88 14 72 12 42 Z', 'M24 56 L76 56 M32 70 L68 70'] },
  gunes: { fill: circ(50, 50, 28), color: RED, lines: [circ(50, 50, 28), circ(50, 50, 4)] },
};
const ROW_TOP = ['tuy', 'baykus', 'saz', 'su', 'agiz', 'ankh'];
const ROW_BOT = ['ekmek', 'yilan', 'kus', 'el', 'sepet', 'gunes'];
const GS = 124;

const ramp = (t: number, a: number, b: number, e = EASE.inOut) => interpolate(t, [a, b], [0, 1], { ...clampOpts, easing: e });

const blobPath = (cx: number, cy: number, R: number, t: number) => {
  const n = 96, pts: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + 0.09 * noise2D('blob', Math.cos(a) * 1.2 + t * 0.4, Math.sin(a) * 1.2) + 0.05 * noise2D('fingers', Math.cos(a) * 6, Math.sin(a) * 6 + t * 0.5);
    pts.push([cx + Math.cos(a) * R * k, cy + Math.sin(a) * R * k]);
  }
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d + ' Z';
};

// fırça darbesi: uçlarda incelen dolu şekil; ıslak mürekkep parıltısı söner
const Brush: React.FC<{ s: Stroke; t: number }> = ({ s, t }) => {
  const p = ramp(t, s.at, s.at + s.dur, EASE.soft);
  if (p <= 0) return null;
  const bs = sampleBrush(s.d, 72), prof = (x: number) => brushProfile(x, ...s.prof);
  const wet = interpolate(t, [s.at + s.dur * 0.6, s.at + s.dur + 0.6], [1, 0], clampOpts);
  const outer = brushOutline(bs, s.w + (s.fill ? 9 : 0), p, prof);
  const inner = s.fill ? brushOutline(bs, s.w, p, prof) : null;
  const sheen = brushOutline(bs, s.w * 0.22, p, prof);
  return (
    <g>
      <path d={outer.d} fill={INK} />
      {outer.tip ? <circle cx={outer.tip.x} cy={outer.tip.y} r={outer.tip.r} fill={INK} /> : null}
      {inner ? <path d={inner.d} fill={s.fill} /> : null}
      <path d={sheen.d} fill="#fff4dc" opacity={0.3 * wet} transform="translate(-1.6 -1.6)" />
    </g>
  );
};

const PaintedGlyph: React.FC<{ g: Glyph; x: number; y: number; at: number; t: number }> = ({ g, x, y, at, t }) => {
  const pop = ramp(t, at, at + 0.2, EASE.out);
  if (pop <= 0) return null;
  const wash = ramp(t, at + 0.16, at + 0.46, EASE.out);
  return (
    <svg width={GS} height={GS} viewBox="0 0 100 100" style={{ position: 'absolute', left: x - GS / 2, top: y - GS / 2, overflow: 'visible', filter: 'url(#pp-rough)', mixBlendMode: 'multiply', scale: String(0.9 + 0.1 * pop) }}>
      {g.fill ? <path d={g.fill} fill={g.color} opacity={0.9 * wash} style={{ filter: `blur(${(1 - wash) * 4}px)` }} /> : null}
      {g.lines.map((d, j) => {
        const p = ramp(t, at + j * 0.05, at + j * 0.05 + 0.22, EASE.soft), ev = evolvePath(p, d);
        return (
          <g key={j}>
            {g.lineColor ? <path d={d} fill="none" stroke={INK} strokeWidth={(g.lineW ?? 4) + 4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} /> : null}
            <path d={d} fill="none" stroke={g.lineColor ?? INK} strokeWidth={g.lineW ?? 4.2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} />
          </g>
        );
      })}
    </svg>
  );
};

// Mısır friz bandı: renkli bloklar ortadan dışa doğru belirir
const Frieze: React.FC<{ y: number; at: number; t: number }> = ({ y, at, t }) => {
  const cols = [BLUE, RED, GREEN, OCHRE], n = 25, bw = 40, x0 = 540 - (n * bw) / 2;
  const rule = ramp(t, at, at + 0.5, EASE.out);
  return (
    <div style={{ position: 'absolute', left: 0, top: y, width: 1080, height: 40, mixBlendMode: 'multiply' }}>
      <div style={{ position: 'absolute', left: x0, top: 0, width: n * bw, height: 4, background: INK, scale: `${rule} 1` }} />
      <div style={{ position: 'absolute', left: x0, top: 34, width: n * bw, height: 4, background: INK, scale: `${rule} 1` }} />
      {Array.from({ length: n }, (_, i) => {
        const k = spring({ frame: (t - at - Math.abs(i - 12) * 0.022) * 30, fps: 30, config: { damping: 12, stiffness: 220, mass: 0.5 } });
        return <div key={i} style={{ position: 'absolute', left: x0 + i * bw + 3, top: 8, width: bw - 6, height: 22, background: cols[i % 4], opacity: 0.88 * Math.min(1, k * 1.4), scale: `1 ${k}`, borderRadius: 2 }} />;
      })}
    </div>
  );
};

// Ön planda odak dışı papirüs bitkisi: sap + şemsiye biçimli püskül
const PapyrusPlant: React.FC<{ x: number; base: number; h: number; lean: number; blur: number; op: number; t: number; seed: string }> = ({ x, base, h, lean, blur, op, t, seed }) => {
  const sway = lean + 1.6 * Math.sin(t * 1.1 + random(seed) * 6) + 0.8 * noise2D(seed, t * 0.6, 0);
  const rays = Array.from({ length: 30 }, (_, i) => {
    const a = (-160 + (i / 29) * 140 + (random(`${seed}-a${i}`) - 0.5) * 8) * (Math.PI / 180), L = 110 + random(`${seed}-l${i}`) * 70;
    const ex = Math.cos(a) * L, ey = Math.sin(a) * L;
    return `M0 0 Q${ex * 0.5} ${ey * 0.62 - 10} ${ex} ${ey + 14}`;
  }).join(' ');
  return (
    <svg width={400} height={h + 200} viewBox={`-200 ${-h - 200} 400 ${h + 200}`} style={{ position: 'absolute', left: x - 200, top: base - h - 200, overflow: 'visible', rotate: `${sway}deg`, transformOrigin: '50% 100%', filter: `blur(${blur}px)`, opacity: op }}>
      <path d={`M0 0 C6 ${-h * 0.4} -4 ${-h * 0.7} 0 ${-h}`} stroke="#120c06" strokeWidth={9} fill="none" />
      <g transform={`translate(0 ${-h})`}><path d={rays} stroke="#120c06" strokeWidth={3.2} fill="none" /></g>
    </svg>
  );
};

export const Papirus: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const t = frame / fps;
  const impact = 0.55;

  // --- kıvılcım → damla ---
  const ember = spring({ frame: frame + 8, fps, config: { damping: 12, stiffness: 150 } });
  const fall = interpolate(t, [0.3, impact], [0, 1], { ...clampOpts, easing: EASE.in });
  const EY0 = 430;
  const dropY = interpolate(fall, [0, 1], [EY0, HIT.y]);
  const cool = interpolate(t, [0.26, 0.42], [0, 1], clampOpts);
  const stretch = 1 + fall * 1.8;
  const rays = interpolate(t, [0, 0.1, 0.34], [0.55, 1, 0], clampOpts);

  // --- mürekkep lekesiyle açılış ---
  const R = interpolate(t, [impact, 1.55], [0, 1450], { ...clampOpts, easing: EASE.inOut });
  const blob = blobPath(HIT.x, HIT.y, R, t);
  const ring = interpolate(t, [impact, impact + 0.5], [0, 1], clampOpts);
  const flash = interpolate(t, [impact, impact + 0.04, impact + 0.3], [0, 1, 0], clampOpts);

  // --- kamera: eğik ve yakın başlar, papirüs masaya yatar gibi düzleşir ---
  const settle = ramp(t, impact, 1.9, EASE.out);
  const cam = `perspective(2400px) rotateX(${(1 - settle) * 16}deg) rotate(${(1 - settle) * -3.5}deg) scale(${1 + (1 - settle) * 0.16})`;

  // --- göz ---
  let pen: { x: number; y: number } | null = null;
  EYE.forEach(s => {
    const p = ramp(t, s.at, s.at + s.dur, EASE.soft);
    if (p > 0 && p < 1) {
      const pt = pointOn(sampleBrush(s.d, 72), p);
      pen = { x: EO.x + pt.x * ES, y: EO.y + pt.y * ES };
    }
  });
  const white = ramp(t, 1.1, 1.5, EASE.out);
  const glint = ramp(t, 1.9, 2.3, EASE.out);
  const glintPulse = 0.75 + 0.25 * Math.sin(t * 7);

  // ışıkta süzülen toz (bokeh)
  const motes = Array.from({ length: 18 }, (_, i) => {
    const x0 = random(`mx${i}`) * W, y0 = random(`my${i}`) * H, s = 6 + random(`ms${i}`) * 24;
    const x = x0 + Math.sin(t * 0.7 + i) * 30, y = y0 - t * (24 + random(`mv${i}`) * 40);
    return <div key={i} style={{ position: 'absolute', left: x, top: ((y % H) + H) % H, width: s, height: s, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,222,160,.6), rgba(255,222,160,0) 70%)', opacity: 0.55 * settle }} />;
  });

  return (
    <AbsoluteFill style={{ background: C.night }}>
      <svg width={0} height={0} style={{ position: 'absolute' }}>
        <defs>
          <filter id="pp-rough" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves={2} seed={7} />
            <feDisplacementMap in="SourceGraphic" scale={3.2} />
          </filter>
        </defs>
      </svg>
      {/* açılışta sıcak pus */}
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% ${(EY0 / H) * 100}%, rgba(240,170,80,${0.16 * (1 - cool)}), rgba(0,0,0,0) 45%)` }} />
      <AbsoluteFill style={{ clipPath: `path('${blob}')` }}>
        <AbsoluteFill style={{ transform: cam, transformOrigin: `${HIT.x}px ${HIT.y}px` }}>
          <Img src={staticFile('tex/papirus.jpg')} style={{ position: 'absolute', left: -60, top: -60, width: W + 120, height: H + 120, objectFit: 'cover' }} />
          <AbsoluteFill style={{ background: 'radial-gradient(ellipse 90% 60% at 28% 22%, rgba(255,200,120,.38), rgba(255,200,120,0) 62%), linear-gradient(165deg, rgba(0,0,0,0) 40%, rgba(40,20,4,.45))' }} />
          <Frieze y={292} at={1.0} t={t} />
          <Frieze y={1468} at={1.12} t={t} />
          {ROW_TOP.map((k, i) => <PaintedGlyph key={`t${i}`} g={GL[k]} x={540 + (i - 2.5) * 165} y={462} at={1.12 + i * 0.07} t={t} />)}
          {ROW_BOT.map((k, i) => <PaintedGlyph key={`b${i}`} g={GL[k]} x={540 + (i - 2.5) * 165} y={1348} at={1.3 + i * 0.07} t={t} />)}
          {/* Horus Gözü */}
          <svg width={400 * ES} height={260 * ES} viewBox="0 0 400 260" style={{ position: 'absolute', left: EO.x, top: EO.y, overflow: 'visible', filter: 'url(#pp-rough)' }}>
            <path d={EYE_WHITE} fill={WHITE} opacity={0.62 * white} />
            {EYE.map((s, i) => <Brush key={i} s={s} t={t} />)}
          </svg>
          {/* göz bebeği = düşen damla (kapı) */}
          {t >= impact ? (
            <div style={{ position: 'absolute', left: HIT.x - PUPIL.r * ES, top: HIT.y - PUPIL.r * ES, width: PUPIL.r * ES * 2, height: PUPIL.r * ES * 2, borderRadius: '50%', background: `radial-gradient(circle at 50% 50%, #000 58%, ${INK} 100%)`, boxShadow: '0 0 0 3px rgba(20,14,8,.7)', scale: String(interpolate(t, [impact, impact + 0.18], [0.35, 1], { ...clampOpts, easing: EASE.out })) }}>
              <div style={{ position: 'absolute', left: '22%', top: '16%', width: '30%', height: '18%', borderRadius: '50%', background: 'rgba(255,244,220,.55)', filter: 'blur(3px)', rotate: '-28deg', opacity: 0.5 + 0.3 * glint }} />
              <div style={{ position: 'absolute', left: '30%', top: '20%', width: 10, height: 10, borderRadius: '50%', background: '#fff8e8', boxShadow: `0 0 ${18 * glintPulse}px ${6 * glintPulse}px rgba(255,236,190,.8)`, opacity: glint }} />
            </div>
          ) : null}
          {/* kamış kalem */}
          {pen ? (
            <div style={{ position: 'absolute', left: (pen as { x: number; y: number }).x, top: (pen as { x: number; y: number }).y, width: 0, height: 0 }}>
              <div style={{ position: 'absolute', left: -7, top: -360, width: 15, height: 360, borderRadius: 7, background: 'linear-gradient(90deg, #5d4a2c, #c7a86c 45%, #4f3f25)', rotate: '24deg', transformOrigin: '50% 100%', boxShadow: '16px 22px 26px rgba(0,0,0,.45)' }} />
              <div style={{ position: 'absolute', left: -6, top: -6, width: 12, height: 12, borderRadius: '50%', background: INK }} />
            </div>
          ) : null}
          {/* güneş huzmeleri */}
          {[0, 1, 2].map(i => (
            <div key={i} style={{ position: 'absolute', left: -400 + i * 380 + t * 40, top: -300, width: 170 + i * 60, height: 2600, rotate: '-24deg', background: 'linear-gradient(90deg, rgba(255,226,170,0), rgba(255,226,170,.5), rgba(255,226,170,0))', opacity: (0.16 + 0.06 * Math.sin(t * 1.3 + i * 2)) * settle, mixBlendMode: 'screen' }} />
          ))}
          {motes}
        </AbsoluteFill>
      </AbsoluteFill>
      {/* ön plan papirüs bitkileri (odak dışı, derinlik) */}
      <PapyrusPlant x={70} base={H + 60} h={880} lean={-7} blur={10} op={0.92 * settle} t={t} seed="pa" />
      <PapyrusPlant x={1010} base={H + 80} h={1040} lean={8} blur={13} op={0.9 * settle} t={t} seed="pb" />
      <PapyrusPlant x={880} base={H + 120} h={620} lean={3} blur={20} op={0.7 * settle} t={t} seed="pc" />
      {/* ıslak mürekkep kenarı */}
      {R > 0 && R < 1440 ? <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}><path d={blob} fill="none" stroke="#0a0705" strokeWidth={36} opacity={0.82} style={{ filter: 'blur(7px)' }} /></svg> : null}
      {/* çarpma parlaması ve sıçrama */}
      {flash > 0 ? <div style={{ position: 'absolute', left: HIT.x - 500, top: HIT.y - 500, width: 1000, height: 1000, borderRadius: '50%', background: `radial-gradient(circle, rgba(255,214,150,${0.55 * flash}), rgba(255,214,150,0) 60%)` }} /> : null}
      {t >= impact && ring < 1 ? (
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
          <ellipse cx={HIT.x} cy={HIT.y} rx={80 + ring * 560} ry={(80 + ring * 560) * 0.82} fill="none" stroke={C.amberHot} strokeWidth={9 * (1 - ring)} opacity={(1 - ring) * 0.85} />
          {Array.from({ length: 22 }, (_, i) => {
            const a = (i / 22) * Math.PI * 2 + 0.2, v = 560 + (i % 5) * 150, tt = t - impact;
            const x = HIT.x + Math.cos(a) * v * tt, y = HIT.y + Math.sin(a) * v * tt - 420 * tt + 1500 * tt * tt;
            return <circle key={i} cx={x} cy={y} r={Math.max(0, 14 - tt * 24)} fill="#0c0906" stroke="rgba(255,210,150,.3)" strokeWidth={1.5} />;
          })}
        </svg>
      ) : null}
      {/* kıvılcım ve düşen damla */}
      {t < impact ? (
        <>
          <div style={{ position: 'absolute', left: HIT.x - 340, top: dropY - 340, width: 680, height: 680, borderRadius: '50%', background: `radial-gradient(circle, rgba(255,190,100,${0.55 * (1 - cool)}), rgba(255,190,100,0) 60%)` }} />
          {[0, 30, 60, 90, 120, 150].map(a => <div key={a} style={{ position: 'absolute', left: HIT.x - 460, top: dropY - 2, width: 920, height: a % 60 === 0 ? 4 : 2, background: 'linear-gradient(90deg, rgba(255,210,140,0), rgba(255,226,170,.95), rgba(255,210,140,0))', rotate: `${a + t * 70}deg`, opacity: rays * (a % 60 === 0 ? 1 : 0.6) }} />)}
          <div style={{ position: 'absolute', left: HIT.x - 24, top: dropY - 24, width: 48, height: 48, borderRadius: '50% 50% 50% 50% / 62% 62% 38% 38%', scale: `${ember / Math.sqrt(stretch)} ${ember * stretch}`, background: cool > 0.5 ? 'radial-gradient(circle at 38% 32%, #4a3c2c, #0b0806 70%)' : `radial-gradient(circle, #fff6dc, ${C.amber} 55%, rgba(240,180,90,0) 74%)`, boxShadow: `0 0 ${100 * (1 - cool) + 20}px ${34 * (1 - cool)}px rgba(240,180,90,.6)` }} />
          {Array.from({ length: 14 }, (_, i) => {
            const a = -Math.PI / 2 + (random(`sa${i}`) - 0.5) * 2.4, v = 110 + random(`sv${i}`) * 260, tt = t + 0.12;
            return <div key={i} style={{ position: 'absolute', left: HIT.x + Math.cos(a) * v * tt, top: EY0 + Math.sin(a) * v * tt + 320 * tt * tt, width: 5, height: 5, borderRadius: '50%', background: C.amberHot, opacity: Math.max(0, 1 - tt * 2), boxShadow: '0 0 10px rgba(255,200,120,.9)' }} />;
          })}
        </>
      ) : null}
    </AbsoluteFill>
  );
};
