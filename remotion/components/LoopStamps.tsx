// Döngüde oyun hissi: halkanın önünden kopan dizgi taşları kavis çizerek sayfadaki GERÇEK "LİMA" hücrelerine uçar
// ve basılır. Döngünün son diliminde mürekkep solar; son kare ilk kareyle aynı kalır (dikişsiz).
import React from 'react';
import { interpolate } from 'remotion';
import { C, EASE, FONT, clampOpts } from '../theme';
import { byAnswer, wordCells } from '../lib/puzzle';
import { projectPlane } from '../lib/project';
import type { Pose } from './PagePlane';
import { PAGE_RATIO } from './PagePlane';
import type { Stage } from '../lib/stage';
import { mix } from '../lib/math';

const WORD = wordCells(byAnswer('LİMA'));
const SLOTS = [0.08, 0.3, 0.52, 0.74]; // döngü içindeki kalkış anları (0..1)
const FLY = 0.12, FADE_START = 0.9;

export const LoopStamps: React.FC<{ t: number; pose: Pose; st: Stage; u: number }> = ({ t, pose, st, u }) => {
  const w = pose.w, h = w * PAGE_RATIO, k = w / 1800;
  const cam = { cx: pose.cx, cy: pose.cy, fx: w / 2, fy: h / 2, rx: pose.rx, rz: pose.rz, s: pose.s, P: st.P };
  const cellPx = 72 * k * pose.s;
  const fade = 1 - interpolate(t, [FADE_START, 0.985], [0, 1], clampOpts);
  const ring = st.ring;
  return (
    <>
      {WORD.map((l, i) => {
        const t0 = SLOTS[i];
        if (t < t0) return null;
        const p = interpolate(t, [t0, t0 + FLY], [0, 1], { ...clampOpts, easing: EASE.inOut });
        const target = projectPlane((36 + (l.c + 0.5) * 72) * k, (106 + (l.r + 0.5) * 72) * k, cam);
        const from = { x: ring.cx + ring.ax * Math.cos(Math.PI / 2), y: ring.cy + ring.ay * Math.cos(Math.PI / 2) + ring.by };
        const x = mix(from.x, target.x, p), y = mix(from.y, target.y, p) - Math.sin(Math.PI * p) * 220 * u;
        const size = mix(ring.size, cellPx * 1.05, p);
        const landed = t >= t0 + FLY;
        const since = t - (t0 + FLY);
        const stamp = landed ? interpolate(since, [0, 0.04], [1.35, 1], { ...clampOpts, easing: EASE.out }) : 1;
        const ringK = landed ? interpolate(since, [0, 0.06], [0.4, 2.2], clampOpts) : 0, ringOp = landed ? interpolate(since, [0, 0.06], [0.7, 0], clampOpts) : 0;
        const glow = landed ? interpolate(since, [0, 0.03, 0.12], [0, 1, 0.25], clampOpts) : 0;
        return (
          <div key={i} style={{ position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size, opacity: fade }}>
            <div style={{ position: 'absolute', inset: -size * 0.7, borderRadius: '50%', background: `radial-gradient(circle, rgba(240,194,122,${0.6 * glow}), rgba(240,194,122,0) 65%)` }} />
            <div style={{ position: 'absolute', inset: size * 0.1, borderRadius: '50%', border: `${2 * u}px solid ${C.amber}`, scale: String(ringK), opacity: ringOp }} />
            <div style={{ position: 'absolute', inset: 0, borderRadius: size * 0.1, display: 'grid', placeItems: 'center', scale: String(stamp),
              background: landed ? 'transparent' : 'linear-gradient(#f7efdb, #e2d4b6)', boxShadow: landed ? 'none' : `0 ${size * 0.12}px ${size * 0.3}px rgba(0,0,0,.45)`,
              fontFamily: FONT.display, fontWeight: 700, fontSize: size * (landed ? 0.78 : 0.6), lineHeight: 1, color: C.ink }}>
              {l.ch}
            </div>
          </div>
        );
      })}
    </>
  );
};
