// SAHNE 2 — PARŞÖMEN (Bergama, M.Ö. 2. yüzyıl)
// Mum ışığında parşömen; satırlar çizilir, lapis mavisi zeminde altın varaklı tezhip "P" belirir,
// kırmızı sarmaşıklar kendini çizer, ortaçağ el yazısı akar, "PARŞÖMEN" kırmızı (rubrika) basılır.
// "P" harfinin iç boşluğu (kontr) bir sonraki sahnenin kapısıdır.
import React from 'react';
import { AbsoluteFill, Img, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { evolvePath } from '@remotion/paths';
import { C, EASE, FONT, clampOpts } from '../theme';

// P harfi (300x400 yerel kutu): gövde + serifler + çanak, iç boşluk evenodd ile oyulur
const P_PATH = 'M40 44 H10 V20 H200 C272 20 304 74 304 128 C304 190 262 240 190 240 H110 V356 H140 V380 H10 V356 H40 Z M150 60 V196 H186 C232 196 258 166 258 128 C258 90 232 60 186 60 Z';
const PS = 0.95, PX = 168, PY = 590; // yerleşim
export const PARSOMEN_PORTAL = { cx: PX + 204 * PS, cy: PY + 128 * PS, r: 44 };

const VINES = [
  'M300 150 C360 150 390 100 370 60 C352 24 300 36 312 76 C320 102 350 98 352 80',
  'M140 380 C140 430 90 450 60 430 C28 410 40 360 80 368 C104 372 104 400 88 404',
  'M300 250 C350 300 330 370 280 380 C240 388 230 340 262 332',
  'M20 120 C-30 160 -40 240 0 300 C30 344 80 330 70 290',
];
const LEAVES: Array<[number, number, number]> = [[352, 80, 0.7], [88, 404, 0.85], [262, 332, 1.0], [70, 290, 1.1], [372, 60, 0.9], [-36, 220, 1.15]];

// sahte ortaçağ el yazısı satırı: dalgalı kalem izi (tohumlu)
function scriptLine(x: number, y: number, w: number, seed: string) {
  let d = `M${x} ${y}`, cx = x;
  while (cx < x + w) {
    const step = 14 + random(`${seed}-s-${cx}`) * 22, up = 10 + random(`${seed}-u-${cx}`) * 18;
    d += ` q${step / 2} ${-up} ${step} 0`;
    if (random(`${seed}-g-${cx}`) > 0.82) { d += ` m10 0`; cx += 10; }
    cx += step;
  }
  return d;
}

export const Parsomen: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const t = frame / fps;
  const sec = (s: number) => s * fps;
  const ramp = (a: number, b: number, e = EASE.inOut) => interpolate(t, [a, b], [0, 1], { ...clampOpts, easing: e });

  const push = interpolate(t, [0.6, 2.3], [1, 1.07], { ...clampOpts, easing: EASE.inOut });
  const frameK = ramp(0.12, 0.55);
  const lapis = ramp(0.3, 0.7);
  const goldK = ramp(0.42, 0.95);
  const shimmer = interpolate(t, [0.9, 1.6], [-0.4, 1.4], clampOpts);
  const flick = 0.9 + 0.1 * Math.sin(t * 9) * Math.sin(t * 3.7);

  const lineYs = Array.from({ length: 21 }, (_, i) => 560 + i * 56);
  const heading = 'PARŞÖMEN'.split('');
  const fx = PX - 60, fy = PY - 40, fw = 420, fh = 460; // tezhip çerçevesi

  return (
    <AbsoluteFill style={{ background: '#2a1b0e' }}>
      <AbsoluteFill style={{ scale: String(push), transformOrigin: `${PARSOMEN_PORTAL.cx}px ${PARSOMEN_PORTAL.cy}px` }}>
        <Img src={staticFile('tex/parsomen.jpg')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <AbsoluteFill style={{ background: `radial-gradient(ellipse 80% 60% at 30% 30%, rgba(255,190,100,${0.3 * flick}), rgba(255,190,100,0) 60%), linear-gradient(170deg, rgba(0,0,0,0) 50%, rgba(40,20,5,.45))` }} />
        {/* çizgiler (kâtibin cetveli) */}
        {lineYs.map((y, i) => <div key={y} style={{ position: 'absolute', left: 96, top: y, width: 888, height: 2, background: '#7a5530', opacity: 0.28, scale: `${ramp(0.02 + i * 0.02, 0.4 + i * 0.02)} 1`, transformOrigin: 'left' }} />)}
        {/* el yazısı satırları */}
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
          {lineYs.slice(0, 7).map((y, i) => {
            const d = scriptLine(560, y + 40, 400, `a${i}`), p = ramp(0.7 + i * 0.1, 1.2 + i * 0.1, EASE.soft), ev = evolvePath(p, d);
            return <path key={`a${i}`} d={d} fill="none" stroke="#3a2513" strokeWidth={4} strokeLinecap="round" strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} opacity={0.85} />;
          })}
          {lineYs.slice(8, 17).map((y, i) => {
            const d = scriptLine(110, y + 40, 860, `b${i}`), p = ramp(1.0 + i * 0.08, 1.6 + i * 0.08, EASE.soft), ev = evolvePath(p, d);
            return <path key={`b${i}`} d={d} fill="none" stroke="#3a2513" strokeWidth={4} strokeLinecap="round" strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} opacity={0.8} />;
          })}
        </svg>
        {/* tezhip: lapis zemin + altın çerçeve */}
        <div style={{ position: 'absolute', left: fx, top: fy, width: fw, height: fh, opacity: lapis, background: `radial-gradient(circle, rgba(212,165,74,.55) 1.6px, rgba(0,0,0,0) 2.4px) 0 0/28px 28px, linear-gradient(160deg, #36559a, ${C.lapis} 55%, #1d2f5c)`, boxShadow: 'inset 0 0 40px rgba(0,0,0,.45)' }} />
        <svg width={W} height={H} style={{ position: 'absolute', inset: 0 }}>
          {[0, 12].map(o => {
            const d = `M${fx - o} ${fy - o} H${fx + fw + o} V${fy + fh + o} H${fx - o} Z`, ev = evolvePath(frameK, d);
            return <path key={o} d={d} fill="none" stroke={o ? C.goldDeep : C.gold} strokeWidth={o ? 3 : 6} strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} />;
          })}
        </svg>
        {/* altın varak P */}
        <div style={{ position: 'absolute', left: PX, top: PY, width: 300 * PS, height: 400 * PS, overflow: 'visible' }}>
          <div style={{ position: 'absolute', inset: 0, clipPath: `path(evenodd, '${P_PATH.replace(/-?\d+(\.\d+)?/g, n => String(+(+n * PS).toFixed(1)))}')`, background: `linear-gradient(115deg, rgba(255,255,255,0) ${shimmer * 100 - 12}%, rgba(255,250,220,.95) ${shimmer * 100}%, rgba(255,255,255,0) ${shimmer * 100 + 12}%), linear-gradient(150deg, ${C.goldDeep}, #f3d488 32%, #b8862f 52%, #ffecb8 68%, #936522)`, maskImage: `linear-gradient(180deg, #000 ${goldK * 100}%, transparent ${goldK * 100 + 8}%)`, WebkitMaskImage: `linear-gradient(180deg, #000 ${goldK * 100}%, transparent ${goldK * 100 + 8}%)` }} />
          <svg width={300 * PS} height={400 * PS} viewBox="0 0 300 400" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
            {(() => { const ev = evolvePath(ramp(0.45, 1.05), P_PATH); return <path d={P_PATH} fill="none" stroke="#1a0f06" strokeWidth={4} fillRule="evenodd" strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} />; })()}
            {VINES.map((d, i) => { const ev = evolvePath(ramp(0.6 + i * 0.12, 1.3 + i * 0.12, EASE.soft), d); return <path key={i} d={d} fill="none" stroke={C.press} strokeWidth={6} strokeLinecap="round" strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} />; })}
            {LEAVES.map(([x, y, at], i) => { const k = spring({ frame: frame - sec(at), fps, config: { damping: 11, stiffness: 180 } }); return <ellipse key={i} cx={x} cy={y} rx={13 * k} ry={7 * k} fill={i % 2 ? C.gold : '#3f6b3a'} stroke="#1a0f06" strokeWidth={1.5} transform={`rotate(${i * 40} ${x} ${y})`} />; })}
          </svg>
        </div>
        {/* başlık (rubrika) */}
        <div style={{ position: 'absolute', left: 0, width: W, top: 1560, display: 'flex', justifyContent: 'center', gap: 6, fontFamily: FONT.roman, fontWeight: 900, fontSize: 118, color: C.press, textShadow: '0 1px 0 rgba(255,240,210,.25)' }}>
          {heading.map((ch, i) => {
            const k = spring({ frame: frame - sec(1.2 + i * 0.06), fps, config: { damping: 12, stiffness: 170 } });
            return <span key={i} style={{ display: 'inline-block', opacity: Math.min(1, k * 1.5), translate: `0px ${(1 - k) * -60}px`, scale: String(1 + (1 - k) * 0.6) }}>{ch}</span>;
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
