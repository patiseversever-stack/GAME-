// V8 vs JavaScriptCore determinism check (brief §4.G.8). Runs tests/jsc/run-determinism.ts under Node (V8) and
// Bun (JavaScriptCore) and asserts that the printed HASHES lines are identical. Exit code 0 = identical.
//   node tests/jsc/compare.ts
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const script = join(here, 'run-determinism.ts');
const localBun = join(root, 'node_modules', '.bin', 'bun');

function runWith(cmd: string, args: string[]): { line: string | null; engine: string; ms: number; err: string } {
  const t0 = Date.now();
  const r = spawnSync(cmd, args, { encoding: 'utf8', cwd: root, maxBuffer: 64 * 1024 * 1024 });
  const ms = Date.now() - t0;
  const lines = (r.stdout || '').split('\n');
  return {
    line: lines.find((l) => l.startsWith('HASHES ')) ?? null,
    engine: lines.find((l) => l.startsWith('ENGINE '))?.slice(7) ?? cmd,
    ms,
    err: r.status === 0 ? '' : `${r.status} ${r.stderr}`,
  };
}

const v8 = runWith(process.execPath, [script, '--child']);
const jsc = existsSync(localBun) ? runWith(localBun, [script, '--child']) : runWith('npx', ['bun', script, '--child']);

console.log(`V8 : ${v8.engine} — ${v8.ms} ms`);
console.log(`JSC: ${jsc.engine} — ${jsc.ms} ms`);
if (!v8.line || !jsc.line) {
  console.error('FAIL: a run did not print HASHES', v8.err, jsc.err);
  process.exit(1);
}
const a = JSON.parse(v8.line.slice(7)) as { flights: { name: string; ticks: number; phase: string; hashes: number[] }[]; real: unknown };
const b = JSON.parse(jsc.line.slice(7)) as typeof a;
let samples = 0;
for (const f of a.flights) samples += f.hashes.length;
const realFlights = typeof a.real === 'object' && a.real !== null ? (a.real as { flights: { hashes: number[] }[] }).flights : [];
for (const f of realFlights) samples += f.hashes.length;
console.log(`flights: ${a.flights.length} analytic + ${realFlights.length} real-terrain, ${samples} tick-hash samples, detMath + 5-world placement hashes`);
for (const f of a.flights) console.log(`  ${f.name}: ${f.ticks} ticks, ${f.phase}`);
if (v8.line === jsc.line) {
  console.log('IDENTICAL: V8 and JavaScriptCore produced bit-identical hashes');
  process.exit(0);
}
console.error('MISMATCH between V8 and JavaScriptCore');
for (let i = 0; i < a.flights.length; i++) {
  const fa = a.flights[i];
  const fb = b.flights[i];
  if (JSON.stringify(fa) !== JSON.stringify(fb)) {
    const k = fa.hashes.findIndex((h, j) => h !== fb.hashes[j]);
    console.error(`  ${fa.name}: first differing sample ${k} (tick ≈ ${(k + 1) * 60})`);
  }
}
process.exit(1);
