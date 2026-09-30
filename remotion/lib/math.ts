// Küçük yardımcılar: deterministik rastgele, periyodik gürültü, zaman kodu.
import { noise3D } from '@remotion/noise';

export const hash = (a: number, b = 0, c = 0) => {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
export const TAU = Math.PI * 2;

// Döngüde dikişsiz gürültü: zamanı bir çember üzerinde örnekler (t=0 ile t=1 aynı değer).
export const loopNoise = (seed: string, t01: number, radius = 0.8) =>
  noise3D(seed, Math.cos(t01 * TAU) * radius, Math.sin(t01 * TAU) * radius, 0);

export const timecode = (frame: number, fps: number) => {
  const f = Math.floor(frame % fps), s = Math.floor(frame / fps);
  const p = (n: number) => String(n).padStart(2, '0');
  return `00:00:${p(s)}:${p(f)}`;
};
