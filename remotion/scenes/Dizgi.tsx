// SAHNE 02 — DİZGİ
// Kamera oyunun GERÇEK bulmaca ızgarasının üzerinde süzülür (3B eğik düzlem). Hücreler çapraz bir dalgayla döner,
// ipucu kutularında gerçek ipuçları, fotoğraflı soru bloğu belirir. PORTRE yatay, PARŞÖMEN dikey basılır;
// ortak "P" amber parlar ve ekrandaki etiketle "BİR HARF · İKİ CEVAP" vurgulanır.
import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, EASE, FONT, SPRING, clampOpts } from '../theme';
import { Backdrop, Grain, Vignette } from '../components/Atmosphere';
import { StampLetter } from '../components/StampLetter';
import { PUZZLE, WORDS, byAnswer, wordCells } from '../lib/puzzle';
import { projectPlane } from '../lib/project';

const Arrow: React.FC<{ x: number; y: number; dir: 'a' | 'd'; size: number; color: string }> = ({ x, y, dir, size, color }) => (
  <svg width={size} height={size} viewBox="0 0 10 10" style={{ position: 'absolute', left: x - size / 2, top: y - size / 2, rotate: dir === 'a' ? '0deg' : '90deg', overflow: 'visible' }}>
    <path d="M1 5H8.2M5.6 2.4L8.4 5L5.6 7.6" fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Dizgi: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width: W, height: H, durationInFrames: D } = useVideoConfig();
  const land = W >= H, u = Math.min(W, H) / 1080;
  const sec = (s: number) => s * fps;
  const S = (land ? 124 : 118) * u;
  const R = land ? 10 : 14, CC = land ? 17 : 11;
  const inRegion = (r: number, c: number) => r < R && c < CC;
  const cx = W / 2, cy = H / 2;

  // Kamera yolu (hücre birimi): P'den başla → PORTRE boyunca → PARŞÖMEN aşağı → geri çekil
  const kt = [0, sec(0.95), sec(1.45), sec(D / fps)];
  const ease = { ...clampOpts, easing: EASE.inOut };
  const fx = interpolate(frame, kt, land ? [3.4, 7.2, 4.6, 7.4] : [3.6, 6.4, 4.6, 5.0], ease) * S;
  const fy = interpolate(frame, kt, land ? [1.7, 1.5, 4.6, 4.4] : [1.8, 1.6, 5.0, 5.4], ease) * S;
  const rx = interpolate(frame, kt, [42, 35, 30, 24], ease);
  const rz = interpolate(frame, kt, [-13, -9, -6, -3], ease);
  const sc = interpolate(frame, kt, land ? [1.55, 1.42, 1.28, 1.0] : [1.5, 1.36, 1.24, 0.98], ease);
  const P = 2100 * u;
  const exit = interpolate(frame, [D - sec(0.3), D], [0, 1], { ...clampOpts, easing: EASE.in });
  const cam = { cx, cy, fx, fy, rx: rx + exit * 18, rz, s: sc * (1 - exit * 0.12), P };

  const flipAt = (r: number, c: number) => sec(0.02 * (r + 0.72 * c));
  const flip = (r: number, c: number) => spring({ frame: frame - flipAt(r, c), fps, config: { damping: 15, stiffness: 150, mass: 0.7 } });
  const flipStyle = (r: number, c: number): React.CSSProperties => {
    const f = flip(r, c);
    return { transform: `perspective(${S * 7}px) rotateX(${interpolate(f, [0, 1], [-96, 0])}deg)`, transformOrigin: '50% 0%', opacity: interpolate(f, [0, 0.25], [0, 1], clampOpts), backfaceVisibility: 'hidden' };
  };

  // Hangi hücreler ipucu/fotoğraf kaplamasında?
  const covered = new Set<string>();
  PUZZLE.zones.forEach(z => { for (let i = 0; i < z.h; i++) for (let j = 0; j < z.w; j++) covered.add(`${z.r + i},${z.c + j}`); });
  PUZZLE.photos.forEach(p => { for (let i = 0; i < p.h; i++) for (let j = 0; j < p.w; j++) covered.add(`${p.r + i},${p.c + j}`); });

  const portre = byAnswer('PORTRE'), parsomen = byAnswer('PARŞÖMEN');
  const lettersA = wordCells(portre).map((l, i) => ({ ...l, at: sec(0.6) + i * sec(0.075) }));
  const lettersD = wordCells(parsomen).slice(1).map((l, i) => ({ ...l, at: sec(1.04) + i * sec(0.052) }));
  const glowP = spring({ frame: frame - sec(1.0), fps, config: SPRING.soft, durationInFrames: sec(0.4) });

  // Etiket: P hücresinin ekrandaki yeri (3B izdüşüm) → düz etiket + bağlantı çizgisi
  const pScreen = projectPlane((portre.c + 0.5) * S, (portre.r + 0.5) * S, cam);
  const callK = spring({ frame: frame - sec(1.12), fps, config: SPRING.soft, durationInFrames: sec(0.45) });
  const labelX = pScreen.x + (land ? 0.2 * W : 0.18 * W), labelY = pScreen.y + (land ? 0.2 * H : 0.1 * H);
  const lx = interpolate(callK, [0, 1], [pScreen.x, labelX]), ly = interpolate(callK, [0, 1], [pScreen.y, labelY]);

  return (
    <AbsoluteFill style={{ opacity: 1 - interpolate(exit, [0.4, 1], [0, 1], clampOpts) }}>
      <Backdrop lamp={0.9} />
      <AbsoluteFill style={{ perspective: P, perspectiveOrigin: `${cx}px ${cy}px` }}>
        <div style={{ position: 'absolute', left: cx - fx, top: cy - fy, width: CC * S, height: R * S, transformOrigin: `${fx}px ${fy}px`, transformStyle: 'flat', transform: `rotateX(${cam.rx}deg) rotateZ(${rz}deg) scale(${cam.s})` }}>
          {/* cevap hücreleri */}
          {PUZZLE.cells.filter(c => inRegion(c.r, c.c)).map(c => (
            <div key={`c${c.r},${c.c}`} style={{ position: 'absolute', left: c.c * S, top: c.r * S, width: S, height: S, background: '#f3eedf', border: `${1.6 * u}px solid #6b796a`, ...flipStyle(c.r, c.c) }} />
          ))}
          {/* ipucu bölgeleri (gerçek ipucu metinleri) */}
          {PUZZLE.zones.filter(z => inRegion(z.r, z.c)).map(z => {
            const ids = z.ids.map(id => WORDS.get(id)!);
            return (
              <div key={`z${z.r},${z.c}`} style={{ position: 'absolute', left: z.c * S, top: z.r * S, width: z.w * S, height: z.h * S, background: z.primary ? '#c6d3c3' : '#e4e6d7', border: `${1.6 * u}px solid #5d6f5e`, display: 'flex', flexDirection: 'column', ...flipStyle(z.r, z.c) }}>
                {ids.map(w => (
                  <div key={w.id} style={{ flex: 1, position: 'relative', padding: `${S * 0.1}px ${S * 0.07}px ${S * 0.06}px`, borderTop: ids[0] !== w ? `${1.4 * u}px solid #5d6f5e` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                    <span style={{ position: 'absolute', left: S * 0.05, top: S * 0.04, fontFamily: FONT.mono, fontWeight: 600, fontSize: S * 0.085, color: '#3c5b47' }}>{String(w.num).padStart(2, '0')}</span>
                    <span style={{ fontFamily: FONT.text, fontWeight: 700, fontSize: S * (z.w > 1 ? 0.15 : 0.118), lineHeight: 1.12, color: C.ink, fontStyle: z.primary ? 'normal' : 'italic' }}>{z.primary ? w.clue : w.hint.split(' ').slice(0, 7).join(' ') + '…'}</span>
                  </div>
                ))}
              </div>
            );
          })}
          {/* fotoğraflı sorular (oyundaki gerçek fotoğraflar) */}
          {PUZZLE.photos.filter(p => inRegion(p.r, p.c)).map(p => {
            const w = WORDS.get(p.word)!, cap = p.id === 'portrait' ? 'Bir yüzün anlatısı' : p.id === 'compass' ? 'Kuzeyi ararken' : 'Kıyıdaki hafıza';
            return (
              <div key={p.id} style={{ position: 'absolute', left: p.c * S, top: p.r * S, width: p.w * S, height: p.h * S, overflow: 'hidden', border: `${2 * u}px solid #344634`, background: '#223', ...flipStyle(p.r, p.c) }}>
                <Img src={staticFile(`img/${p.id}.jpg`)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '38%', background: 'linear-gradient(rgba(21,33,26,0), rgba(21,33,26,.92))' }} />
                <div style={{ position: 'absolute', left: S * 0.14, bottom: S * 0.42, fontFamily: FONT.mono, fontWeight: 600, fontSize: S * 0.1, letterSpacing: '0.08em', color: '#e4d9bb' }}>{String(w.num).padStart(2, '0')}  /  FOTOĞRAFLI SORU</div>
                <div style={{ position: 'absolute', left: S * 0.14, bottom: S * 0.14, fontFamily: FONT.display, fontStyle: 'italic', fontWeight: 700, fontSize: S * 0.24, color: '#fff8e5' }}>{cap}</div>
              </div>
            );
          })}
          {/* oklar */}
          {PUZZLE.words.filter(w => inRegion(w.clueCell[0], w.clueCell[1])).map(w => {
            const [r0, c0] = w.clueCell, onPhoto = PUZZLE.photos.some(p => r0 >= p.r && r0 < p.r + p.h && c0 >= p.c && c0 < p.c + p.w);
            const x = w.dir === 'a' ? (c0 + 1) * S - S * 0.14 : (c0 + 0.5) * S, y = w.dir === 'a' ? (r0 + 0.5) * S : (r0 + 1) * S - S * 0.14;
            const f = flip(r0, c0);
            return <div key={`a${w.id}`} style={{ opacity: f }}><Arrow x={x} y={y} dir={w.dir} size={S * 0.22} color={onPhoto ? '#fff8e5' : '#2e4032'} /></div>;
          })}
          {/* basılan harfler */}
          {lettersA.map(l => <StampLetter key={`a${l.r},${l.c}`} ch={l.ch} x={l.c * S} y={l.r * S} size={S} at={l.at} glow={l.c === portre.c ? glowP : 0} />)}
          {lettersD.map(l => <StampLetter key={`d${l.r},${l.c}`} ch={l.ch} x={l.c * S} y={l.r * S} size={S} at={l.at} />)}
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(7,13,12,.78) 0%, rgba(7,13,12,.25) 28%, rgba(7,13,12,0) 50%)', pointerEvents: 'none' }} />
      {/* Ekran uzayı etiketi: BİR HARF · İKİ CEVAP */}
      <svg width={W} height={H} style={{ position: 'absolute', inset: 0, opacity: callK * (1 - exit) }}>
        <line x1={pScreen.x} y1={pScreen.y} x2={lx} y2={ly} stroke={C.amber} strokeWidth={2.4 * u} />
        <circle cx={pScreen.x} cy={pScreen.y} r={9 * u * callK} fill="none" stroke={C.amber} strokeWidth={2.4 * u} />
        <circle cx={pScreen.x} cy={pScreen.y} r={3.5 * u} fill={C.amber} />
      </svg>
      <div style={{ position: 'absolute', left: lx, top: ly - 26 * u, opacity: callK * (1 - exit), translate: `${(1 - callK) * -20}px 0px`, display: 'flex', alignItems: 'center', gap: 12 * u, padding: `${10 * u}px ${16 * u}px`, background: 'rgba(10,17,15,.86)', border: `${1.5 * u}px solid rgba(240,194,122,.7)`, borderRadius: 6 * u, fontFamily: FONT.mono, fontWeight: 600, fontSize: 21 * u, letterSpacing: '0.2em', color: C.cream, whiteSpace: 'nowrap' }}>
        <span style={{ width: 10 * u, height: 10 * u, background: C.amber, display: 'inline-block' }} />
        BİR HARF · İKİ CEVAP
      </div>
      <Vignette strength={0.72} />
      <Grain opacity={0.08} />
    </AbsoluteFill>
  );
};
