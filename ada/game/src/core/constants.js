// Kural motorunun sabitleri. Hepsi metre ve saniye cinsinden.
export const TICK_RATE = 60;
export const DT = 1 / TICK_RATE;

export const LANES = [-1, 0, 1];
export const LANE_WIDTH = 1.7;

export const RUN = {
  maxSpeed: 9.6,
  accel: 6.5,
  lateralSpeed: 9.5,
  jumpVelocity: 6.0,
  gravity: 17,
  slideTime: 0.72,
  stumbleTime: 0.6,
  stumbleSpeed: 3.2,
  fallTime: 1.3,
  zipSpeed: 15,
  hurdleClearY: 0.55,
};

export const OBSTACLE = {
  hurdle: { depth: 0.7, height: 0.9 },
  arch: { depth: 0.9, clearance: 1.05 },
  block: { depth: 1.6, height: 2.2 },
};
