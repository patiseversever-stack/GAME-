// Expert-bot calibration of the PROVISIONAL (generated) routes. Written by `node dev/integrator.routes.ts --write`
// (integrator): expert bot (+4 m line) flies every generated route; score and time land here and become the
// route's expertScore (⭐⭐ ≥ 0.50×, ⭐⭐⭐ ≥ 0.85×). Routes from src/content/routes/*.json carry their own numbers.
export const PROVISIONAL_BENCH: Readonly<Record<string, { expertScore: number; expertTimeSec: number }>> = {};
