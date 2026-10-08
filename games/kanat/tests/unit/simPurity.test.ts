// Lint-style purity check for the flight agent's sim code (brief §4.G.8 / TECH_CONTRACTS §1): no engine-dependent
// transcendental Math, no Math.random/Date/performance.now, no DOM/three.js, no `**`, no TODO/FIXME.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(process.cwd(), 'src', 'sim');
const SKIP = new Set(['terrain', 'replay']); // owned by other agents

function files(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) {
      if (dir === ROOT && SKIP.has(e)) continue;
      out.push(...files(p));
    } else if (e.endsWith('.ts')) out.push(p);
  }
  return out;
}

const FORBIDDEN: [RegExp, string][] = [
  [/Math\.(sin|cos|tan|asin|acos|atan|atan2|sinh|cosh|tanh|exp|expm1|log|log2|log10|log1p|pow|cbrt|hypot)\s*\(/, 'engine-dependent Math (use detMath)'],
  [/Math\.random/, 'Math.random'],
  [/\bDate\b/, 'Date'],
  [/performance\.now/, 'performance.now'],
  [/\bdocument\b|\bwindow\b/, 'DOM'],
  [/from ['"]three['"]/, 'three.js'],
  [/[^*/]\*\*[^*/]/, '** operator'],
  [/TODO|FIXME/, 'TODO/FIXME'],
];

describe('sim purity', () => {
  it('flight-owned src/sim files use only deterministic primitives', () => {
    const bad: string[] = [];
    for (const f of files(ROOT)) {
      // strip block comments but keep line numbers
      const text = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
      const lines = text.split('\n');
      lines.forEach((raw, i) => {
        const line = raw.replace(/\/\/.*$/, ''); // ignore line comments
        for (const [re, what] of FORBIDDEN) if (re.test(line)) bad.push(`${f}:${i + 1} ${what}: ${raw.trim()}`);
      });
    }
    expect(bad).toEqual([]);
  });
});
