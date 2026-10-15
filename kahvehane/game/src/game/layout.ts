// Masa ölçüleri (metre) ve koltuklara göre yerleşim. Kartlar okunurluk için gerçeğin ~2 katı.
import * as THREE from 'three';

export const TABLE = {
  y: 0.742, // çuha yüzeyi
  feltW: 0.86,
  outerW: 1.0,
  teaGlasses: [
    [-0.385, 0.1],
    [0.36, -0.36],
  ] as [number, number][],
};

export const CARD = {w: 0.125, h: 0.125 / 0.7, t: 0.0007};

export const CAMERA = {
  pos: new THREE.Vector3(0, 1.235, 0.7),
  target: new THREE.Vector3(0, 0.7, -0.3),
  fov: 50,
};

export interface SeatLayout {
  /** El kartlarının masadaki merkezi (rakipler için) */
  hand: THREE.Vector3;
  /** El kartlarının yön açısı (y ekseni etrafında; kart üst kenarı koltuğa bakar) */
  yaw: number;
  /** Toplanan kartların yığını */
  stack: THREE.Vector3;
  /** Tepki ve isim etiketinin dünya noktası */
  label: THREE.Vector3;
}

export interface Layout {
  pile: THREE.Vector3;
  deck: THREE.Vector3;
  deckYaw: number;
  seats: SeatLayout[];
}

const v = (x: number, z: number, y = TABLE.y) => new THREE.Vector3(x, y, z);

export function makeLayout(seats: 2 | 4): Layout {
  const pile = v(0, -0.07), deck = v(-0.29, -0.05);
  if (seats === 2) {
    return {
      pile, deck, deckYaw: 0.22,
      seats: [
        {hand: v(0, 0.36), yaw: 0, stack: v(0.3, 0.2), label: v(0, 0.36)},
        {hand: v(0.02, -0.33), yaw: Math.PI, stack: v(-0.3, -0.31), label: v(0, -0.45, 1.25)},
      ],
    };
  }
  return {
    pile, deck: v(-0.25, 0.12), deckYaw: 0.4,
    seats: [
      {hand: v(0, 0.36), yaw: 0, stack: v(0.3, 0.2), label: v(0, 0.36)},
      {hand: v(0.33, -0.05), yaw: Math.PI / 2, stack: v(0.31, -0.3), label: v(0.55, -0.1, 1.15)},
      {hand: v(0.02, -0.33), yaw: Math.PI, stack: v(-0.3, -0.31), label: v(0, -0.45, 1.25)},
      {hand: v(-0.33, -0.05), yaw: -Math.PI / 2, stack: v(-0.31, 0.2), label: v(-0.55, -0.1, 1.15)},
    ],
  };
}
