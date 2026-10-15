// DİKEY masa düzeni (metre). Hedef: docs/_dikey_hedef.jpg — oyuncak gibi tok, yastıklı kenarlı masa,
// üstte rakip, altta oyuncunun eli. Kartlar okunurluk için gerçeğin ~2.5 katı.
import * as THREE from 'three';

export const TABLE = {
  y: 0.742, // çuha yüzeyi
  feltW: 0.84, // çuha (iç alan)
  feltD: 1.44,
  feltR: 0.13, // köşe yarıçapı
  railR: 0.042, // yastıklı kenarın kalınlığı (yarıçap)
  woodW: 0.13, // ahşap çerçeve genişliği (rayın dışından)
};

export const CARD = {w: 0.17, h: 0.17 / 0.7, t: 0.0008};

const target = new THREE.Vector3(0, TABLE.y, 0.06);
const pitch = THREE.MathUtils.degToRad(63), dist = 2.62;
export const CAMERA = {
  pos: target.clone().add(new THREE.Vector3(0, Math.sin(pitch) * dist, Math.cos(pitch) * dist)),
  target,
  fov: 46, // dikey görüş açısı, tasarım oranı için
  designAspect: 390 / 844, // tasarım ekranı (dikey telefon); daha dar ekranda yatay kapsama korunur
};

export interface SeatLayout {
  /** El kartlarının masadaki merkezi (rakipler için) */
  hand: THREE.Vector3;
  /** Yön açısı (y ekseni etrafında; kartın üst kenarı koltuğa bakar) */
  yaw: number;
  /** Toplanan kartların yığını */
  stack: THREE.Vector3;
  /** Pişti kartlarının sıralanacağı yön (dünya) */
  pistiDir: THREE.Vector3;
}

export interface Layout {
  pile: THREE.Vector3;
  deck: THREE.Vector3;
  deckYaw: number;
  /** rakip el kartlarının boyutu ve aralığı */
  oppScale: number;
  oppSpread: number;
  seats: SeatLayout[];
}

const v = (x: number, z: number, y = TABLE.y) => new THREE.Vector3(x, y, z);
const dir = (x: number, z: number) => new THREE.Vector3(x, 0, z);

export function makeLayout(seats: 2 | 4): Layout {
  const pile = v(0, -0.02);
  if (seats === 2) {
    return {
      pile, deck: v(-0.3, 0.02), deckYaw: 0.06, oppScale: 0.72, oppSpread: 0.125,
      seats: [
        {hand: v(0, 0.6), yaw: 0, stack: v(0.3, 0.3), pistiDir: dir(0, -1)},
        {hand: v(0, -0.44), yaw: Math.PI, stack: v(0.3, -0.3), pistiDir: dir(0, 1)},
      ],
    };
  }
  return {
    pile, deck: v(-0.28, 0.32), deckYaw: 0.06, oppScale: 0.62, oppSpread: 0.07,
    seats: [
      {hand: v(0, 0.6), yaw: 0, stack: v(0.3, 0.42), pistiDir: dir(-1, 0)},
      {hand: v(0.3, -0.06), yaw: Math.PI / 2, stack: v(0.3, -0.36), pistiDir: dir(0, 1)},
      {hand: v(0, -0.48), yaw: Math.PI, stack: v(-0.3, -0.46), pistiDir: dir(1, 0)},
      {hand: v(-0.3, -0.06), yaw: -Math.PI / 2, stack: v(-0.3, -0.36), pistiDir: dir(0, 1)},
    ],
  };
}
