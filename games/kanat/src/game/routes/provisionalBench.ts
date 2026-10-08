// Expert-bot calibration of the PROVISIONAL (generated) routes. Written by `node dev/integrator.routes.ts --write`
// (integrator): expert bot (+4 m line) flies every generated route; score and time land here and become the
// route's expertScore (⭐⭐ ≥ 0.50×, ⭐⭐⭐ ≥ 0.85×). Routes from src/content/routes/*.json carry their own numbers.
export const PROVISIONAL_BENCH: Readonly<Record<string, { expertScore: number; expertTimeSec: number }>> = {
  w1r1: { expertScore: 5704, expertTimeSec: 56.9 },
  w1r2: { expertScore: 7501, expertTimeSec: 83.5 },
  w1r3: { expertScore: 8801, expertTimeSec: 86.7 },
  w1r4: { expertScore: 7000, expertTimeSec: 90.8 },
  w2r1: { expertScore: 7028, expertTimeSec: 75.2 },
  w2r2: { expertScore: 7740, expertTimeSec: 63.5 },
  w2r3: { expertScore: 5921, expertTimeSec: 95.2 },
  w2r4: { expertScore: 6538, expertTimeSec: 69.4 },
  w3r1: { expertScore: 7424, expertTimeSec: 83.9 },
  w3r2: { expertScore: 4779, expertTimeSec: 88.2 },
  w3r3: { expertScore: 6426, expertTimeSec: 98.8 },
  w3r4: { expertScore: 4242, expertTimeSec: 97.9 },
  w4r1: { expertScore: 9368, expertTimeSec: 88.6 },
  w4r2: { expertScore: 8108, expertTimeSec: 93.5 },
  w4r3: { expertScore: 15219, expertTimeSec: 117.5 },
  w4r4: { expertScore: 13403, expertTimeSec: 98.8 },
  w5r1: { expertScore: 6903, expertTimeSec: 105.4 },
  w5r2: { expertScore: 11103, expertTimeSec: 110.3 },
  w5r3: { expertScore: 6817, expertTimeSec: 106.3 },
  w5r4: { expertScore: 16002, expertTimeSec: 125.1 },
};
