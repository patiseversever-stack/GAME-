// Sonsuz zoom matematiği.
// Kamera, üst sahnedeki bir "kapı" dairesine üstel ölçekle dalar: s(p) = S^p. Kapının merkezi ekranın merkezine
// düz bir çizgide kayar; p=1'de kapı ekranı doldurur ve alt sahne kimlik dönüşümüyle devralır (atlama olmaz).
export type Portal = { cx: number; cy: number; r: number }; // üst sahne koordinatında (1080x1920 tabanı)

export function zoomCamera(p: number, portal: Portal, W: number, H: number) {
  const S = W / (2 * portal.r); // kapı çapı ekran genişliğine eşit olunca biter
  const s = Math.pow(S, p);
  const g = (s - 1) / (S - 1);
  const fx = W / 2 + (portal.cx - W / 2) * g, fy = H / 2 + (portal.cy - H / 2) * g;
  return { S, s, tx: W / 2 - s * fx, ty: H / 2 - s * fy };
}

// Alt sahnenin kapı içindeki yerleşimi (üst sahne koordinatında): tam kareyi 1/S ölçekte, kapı merkezine hizalar.
export function innerPlacement(portal: Portal, W: number, H: number) {
  const S = W / (2 * portal.r), k = 1 / S;
  return { k, left: portal.cx - (W * k) / 2, top: portal.cy - (H * k) / 2 };
}
