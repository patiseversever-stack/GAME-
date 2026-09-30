// Masa sahnesinin ortak düzeni: sayfanın döngü pozu, oyunun ilk "tam sayfa" karesine denk gelen final pozu
// ve harf halkasının geometrisi. Yatay (1920x1080) ve dikey (1080x1920) için ayrı değerler.
import type { Pose } from '../components/PagePlane';

export type Stage = {
  land: boolean;
  u: number;
  P: number; // CSS perspektif mesafesi (oyunun 32° dikey görüş açısına denk: H/2 / tan(16°))
  loop: Pose;
  final: Pose;
  ring: { cx: number; cy: number; ax: number; ay: number; bx: number; by: number; size: number };
};

export const stageFor = (W: number, H: number): Stage => {
  const land = W >= H, u = Math.min(W, H) / 1080;
  const P = (H / 2) / Math.tan((16 * Math.PI) / 180);
  if (land) {
    return {
      land, u, P,
      loop: { cx: W * 0.5, cy: H * 0.49, w: W * 0.54, rx: 18, ry: 0, rz: -1.6, s: 1 },
      // oyunda yatay telefonda sayfa: ~%73 genişlik, 14.6° eğim (Director.frame 'overview')
      final: { cx: W * 0.5, cy: H * 0.52, w: W * 0.685, rx: 15, ry: 0, rz: 0.3, s: 1 },
      // halka sayfanın ETRAFINDA: ön yarı sayfanın alt kenarının altından, arka yarı üst kenarının üstünden geçer
      ring: { cx: W * 0.5, cy: H * 0.53, ax: W * 0.43, ay: -H * 0.03, bx: 0, by: H * 0.385, size: 64 * u },
    };
  }
  return {
    land, u, P,
    loop: { cx: W * 0.5, cy: H * 0.47, w: W * 0.8, rx: 18, ry: 0, rz: -1.6, s: 1 },
    final: { cx: W * 0.5, cy: H * 0.515, w: W * 0.76, rx: 15, ry: 0, rz: 0.3, s: 1 },
    ring: { cx: W * 0.5, cy: H * 0.47, ax: W * 0.44, ay: 0, bx: 0, by: H * 0.3, size: 66 * u },
  };
};

export const lerpPose = (a: Pose, b: Pose, t: number): Pose => ({
  cx: a.cx + (b.cx - a.cx) * t, cy: a.cy + (b.cy - a.cy) * t, w: a.w + (b.w - a.w) * t,
  rx: a.rx + (b.rx - a.rx) * t, ry: a.ry + (b.ry - a.ry) * t, rz: a.rz + (b.rz - a.rz) * t, s: a.s + (b.s - a.s) * t,
});
