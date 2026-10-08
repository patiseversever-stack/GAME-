// Simulation behaviour version (u16). Ghost codes embed it (src/sim/replay): a code recorded with a different
// SIM_VERSION is rejected with "recorded with a different version of the game".
// BUMP THIS whenever anything that changes simulated outcomes changes: flight model, tuning numbers, proximity,
// scoring, contact rules, prop/balloon placement, command handling, detMath.
// History: 1 = first KANAT flight sim (2026-10-08).
export const SIM_VERSION = 1;
