// Masa ölçüleri (metre) ve koltuklara göre yerleşim. Ekranın tamamı çuha; kamera yukarıdan ~70° bakar.
// Kartlar okunurluk için gerçeğin ~2 katı.
import * as THREE from 'three';

export const TABLE = {
  y: 0.742, // çuha yüzeyi
  feltW: 3.2, // çuha düzlemi (görüşten taşacak kadar geniş)
  feltD: 1.8,
  feltCenterV: 0.5, // amblemin dokudaki dikey konumu (yığın z = 0)
};

export const CARD = {w: 0.125, h: 0.125 / 0.7, t: 0.0007};

const target = new THREE.Vector3(0, TABLE.y, 0.07);
const pitch = THREE.MathUtils.degToRad(68), dist = 1.45;
export const CAMERA = {
  pos: target.clone().add(new THREE.Vector3(0, Math.sin(pitch) * dist, Math.cos(pitch) * dist)),
  target,
  fov: 34, // dikey (2:1 ekran için); daha dar ekranlarda yatay kapsama korunur
};

export interface SeatLayout {
  /** El kartlarının masadaki merkezi (rakipler için) */
  hand: THREE.Vector3;
  /** Yön açısı (y ekseni etrafında; kartın üst kenarı koltuğa bakar) */
  yaw: number;
  /** Toplanan kartların yığını */
  stack: THREE.Vector3;
}

export interface Layout {
  pile: THREE.Vector3;
  deck: THREE.Vector3;
  deckYaw: number;
  /** rakip el kartlarının boyutu */
  oppScale: number;
  seats: SeatLayout[];
}

const v = (x: number, z: number, y = TABLE.y) => new THREE.Vector3(x, y, z);

export function makeLayout(seats: 2 | 4): Layout {
  const pile = v(0, 0), deck = v(-0.6, 0.02);
  if (seats === 2) {
    return {
      pile, deck, deckYaw: 0.12, oppScale: 0.72,
      seats: [
        {hand: v(0, 0.4), yaw: 0, stack: v(0.62, 0.2)},
        {hand: v(0, -0.27), yaw: Math.PI, stack: v(0.62, -0.22)},
      ],
    };
  }
  return {
    pile, deck: v(-0.66, 0.2), deckYaw: 0.12, oppScale: 0.66,
    seats: [
      {hand: v(0, 0.4), yaw: 0, stack: v(0.66, 0.22)},
      {hand: v(0.62, -0.02), yaw: Math.PI / 2, stack: v(0.82, -0.3)},
      {hand: v(0, -0.3), yaw: Math.PI, stack: v(0.4, -0.3)},
      {hand: v(-0.62, -0.02), yaw: -Math.PI / 2, stack: v(-0.82, -0.3)},
    ],
  };
}
