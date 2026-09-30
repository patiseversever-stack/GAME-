// Sonsuz zoom zinciri. Her an en fazla iki sahne çizilir: kök sahne ve (dalış sırasında) kapısının içindeki sonraki
// sahne. Kamera kapıya üstel ölçekle dalar; dalış bittiğinde iç sahne kimlik dönüşümündedir, yani kesme yoktur.
import React from 'react';
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { EASE, clampOpts } from '../theme';
import { innerPlacement, zoomCamera, type Portal } from '../fx/zoom';
import { BEATS, type Beat } from './timeline';

// feather: iris kenar yumuşatması (iç sahne pikseli). open: kapının "açıldığı" p aralığı (iç sahne belirir).
export type PortalSpec = Portal & { readonly feather?: number; readonly open?: readonly [number, number] };
export type SceneEntry = { readonly Comp: React.FC; readonly portal?: PortalSpec };
export type SceneMap = Record<Beat['id'], SceneEntry>;

export const diveP = (t: number, z: readonly [number, number]) => interpolate(t, [z[0], z[1]], [0, 1], { ...clampOpts, easing: EASE.dive });

export function chainAt(t: number) {
  let i = 0;
  while (i < BEATS.length - 1 && BEATS[i].zoom && t >= BEATS[i].zoom![1]) i++;
  const A = BEATS[i], B = BEATS[i + 1];
  const p = A.zoom && B && t >= A.zoom[0] ? diveP(t, A.zoom) : null;
  return { i, A, B, p };
}

// Dalış hızına göre hareket bulanıklığı örnek sayısı (kenardaki kare başına kayma ~ örnek aralığı 9 px)
export function blurSamplesAt(frame: number, fps: number, scenes: SceneMap, W: number, H: number) {
  const t = frame / fps, { A, p } = chainAt(t);
  const portal = scenes[A.id].portal;
  if (p === null || !portal || !A.zoom) return 1;
  const S = W / (2 * portal.r), dt = 0.5 / fps;
  const dp = (diveP(t + dt, A.zoom) - diveP(t - dt, A.zoom)) / (2 * dt);
  const edgePx = Math.abs(dp) * Math.log(S) * (Math.hypot(W, H) / 2) / fps; // kare başına kenar kayması
  return Math.max(1, Math.min(10, Math.round((edgePx * 0.5) / 9)));
}

export const Chain: React.FC<{ readonly scenes: SceneMap }> = ({ scenes }) => {
  const frame = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const t = frame / fps;
  const { A, B, p } = chainAt(t);
  const a = scenes[A.id];
  const parent = <Sequence from={Math.round(A.start * fps)} layout="none"><a.Comp /></Sequence>;
  if (p === null || !B || !a.portal) return <AbsoluteFill style={{ overflow: 'hidden' }}>{parent}</AbsoluteFill>;

  const portal = a.portal, b = scenes[B.id];
  const cam = zoomCamera(p, portal, W, H);
  const place = innerPlacement(portal, W, H);
  const half = Math.hypot(W / 2, H / 2) + 6;
  // iris: kapı dairesi, dalışın sonunda tüm kareyi kaplayacak kadar büyür (iç sahne koordinatında)
  const iris = interpolate(p, [0.84, 1], [W / 2, half], { ...clampOpts, easing: EASE.inOut });
  const feather = portal.feather ?? 0;
  const open = interpolate(p, portal.open ?? [0, 0.12], [0, 1], clampOpts);
  const clip = feather > 0
    ? { maskImage: `radial-gradient(circle ${iris}px at 50% 50%, #000 ${Math.max(0, iris - feather)}px, transparent ${iris}px)`, WebkitMaskImage: `radial-gradient(circle ${iris}px at 50% 50%, #000 ${Math.max(0, iris - feather)}px, transparent ${iris}px)` }
    : { clipPath: `circle(${iris}px at 50% 50%)` };
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: '#000' }}>
      <AbsoluteFill style={{ transformOrigin: '0 0', transform: `translate(${cam.tx}px, ${cam.ty}px) scale(${cam.s})` }}>
        {parent}
        {open > 0 ? (
          <div style={{ position: 'absolute', left: place.left, top: place.top, width: W, height: H, transformOrigin: '0 0', transform: `scale(${place.k})`, overflow: 'hidden', opacity: open, ...clip }}>
            <Sequence from={Math.round(B.start * fps)} layout="none"><b.Comp /></Sequence>
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
