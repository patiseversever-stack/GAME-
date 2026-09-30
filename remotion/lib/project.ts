// CSS 3B zincirinin (perspective + rotateX + rotateZ + scale) bir düzlem noktasını ekrana nasıl yansıttığını hesaplar.
// Böylece 3B ızgaradaki bir hücreye ekran uzayında (düz, okunur) etiket ve çizgi bağlanabilir.
export type PlaneCam = { cx: number; cy: number; fx: number; fy: number; rx: number; rz: number; s: number; P: number };

export function projectPlane(x: number, y: number, k: PlaneCam) {
  const a = (k.rx * Math.PI) / 180, b = (k.rz * Math.PI) / 180;
  let px = (x - k.fx) * k.s, py = (y - k.fy) * k.s, pz = 0;
  const zx = px * Math.cos(b) - py * Math.sin(b), zy = px * Math.sin(b) + py * Math.cos(b);
  px = zx; py = zy;
  const ry = py * Math.cos(a) - pz * Math.sin(a), rzv = py * Math.sin(a) + pz * Math.cos(a);
  py = ry; pz = rzv;
  const f = k.P / (k.P - pz);
  return { x: k.cx + px * f, y: k.cy + py * f, depth: pz };
}
