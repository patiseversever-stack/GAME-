import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ALLOWED_LICENSES, type Manifest } from '../../tools/gen-manifest.ts';

const ROOT = new URL('../..', import.meta.url).pathname;
const PUBLIC = join(ROOT, 'public');

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(relative(PUBLIC, full).split('\\').join('/'));
  }
}

const FORBIDDEN = /(CC[- ]?BY[- ]?NC|CC[- ]?BY[- ]?SA|editorial|unknown|proprietary)/i;

describe('assets/manifest.json (§6.2)', () => {
  const manifest = JSON.parse(readFileSync(join(ROOT, 'assets', 'manifest.json'), 'utf8')) as Manifest;
  const byPath = new Map(manifest.files.map((f) => [f.path, f]));

  it('lists every shipped file under public/', () => {
    const shipped: string[] = [];
    walk(PUBLIC, shipped);
    const missing = shipped.filter((p) => !byPath.has(p));
    expect(missing, `run "node tools/gen-manifest.ts"; unlisted files: ${missing.join(', ')}`).toEqual([]);
  });

  it('has no stale records', () => {
    const shipped = new Set<string>();
    const list: string[] = [];
    walk(PUBLIC, list);
    for (const p of list) shipped.add(p);
    expect(manifest.files.filter((f) => !shipped.has(f.path)).map((f) => f.path)).toEqual([]);
  });

  it('uses only allowed licences and records provenance', () => {
    for (const f of manifest.files) {
      expect(ALLOWED_LICENSES, f.path).toContain(f.license);
      expect(f.license).not.toMatch(FORBIDDEN);
      expect(f.source.length, f.path).toBeGreaterThan(3);
      expect(f.generator.length, f.path).toBeGreaterThan(3);
      expect(f.sha256, f.path).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('credits the terrain data and fonts', () => {
    const credits = readFileSync(join(ROOT, 'docs', 'CREDITS.md'), 'utf8');
    expect(credits).toMatch(/SRTM data courtesy of the U\.S\. Geological Survey/);
    expect(credits).toMatch(/Open Font License/);
    for (const fam of ['Barlow Condensed', 'Inter', 'Playfair Display']) expect(credits).toContain(fam);
  });
});
