// SÜRÜ.io cross-engine determinism (BRIEF §9.G-21): run identical AI-vs-AI rounds (16 flocks incl. the player
// slot) and print the state hash every 10 s + the final ownership hash. Run under V8 and JavaScriptCore and diff:
//   node tests/jsc/suru-determinism.ts > /tmp/v8.txt && npx bun tests/jsc/suru-determinism.ts > /tmp/jsc.txt && diff /tmp/v8.txt /tmp/jsc.txt
// Optional args: number of rounds (default 10), seconds per round (default 180).
import { createRound, runRound } from '../../src/modes/suru/round.ts';

const rounds = Number(process.argv[2] ?? 10);
const secs = Number(process.argv[3] ?? 180);
const engine = typeof (globalThis as { Bun?: unknown }).Bun !== 'undefined' ? 'jsc(bun)' : 'v8(node)';
let combined = 0x811c9dc5;
for (let k = 0; k < rounds; k++) {
  const seed = 9000 + k * 7919;
  const round = createRound({ seed, player: 'utility', league: (k % 5) as 0 | 1 | 2 | 3 | 4, flockCount: 16 });
  const res = runRound(round, { hashEvery: 300, maxTicks: secs * 30 });
  const fin = round.sim.hashState();
  const line = `${seed} ${res.ticks} winner=${res.winner} ` + res.hashes.map((h) => h.toString(16).padStart(8, '0')).join(',') + ` final=${fin.toString(16)}`;
  console.log(line);
  combined = Math.imul(combined ^ fin, 0x01000193) >>> 0;
}
console.error(`[${engine}] combined ${combined.toString(16)}`);
console.log(`combined ${combined.toString(16)}`);
