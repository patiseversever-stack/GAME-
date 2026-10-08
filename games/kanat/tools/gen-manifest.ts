// Generates assets/manifest.json: one record per shipped runtime file under public/ (source, licence,
// modification, generator script, size, sha256). Run: node tools/gen-manifest.ts
// The manifest test (tests/unit/manifest.test.ts) rejects any shipped file without a record or with a
// forbidden licence, so new asset folders must get a rule below.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';

export interface ManifestRecord {
  path: string; // relative to public/
  bytes: number;
  sha256: string;
  source: string;
  license: string;
  modification: string;
  generator: string;
}

export interface Manifest {
  v: 1;
  allowedLicenses: string[];
  files: ManifestRecord[];
}

export const ALLOWED_LICENSES = [
  'Original work (KANAT, procedural, generated in-repo)',
  'Derived from AWS Terrain Tiles — attribution required (docs/credits/terrain.md)',
  'SIL Open Font License 1.1',
  'Metadata (generated)',
];

const ROOT = new URL('..', import.meta.url).pathname;
const PUBLIC = join(ROOT, 'public');

interface Rule {
  test: RegExp;
  record: (path: string) => Omit<ManifestRecord, 'path' | 'bytes' | 'sha256'>;
}

function fontSource(file: string): string {
  try {
    const meta = JSON.parse(readFileSync(join(PUBLIC, 'fonts', 'fonts.json'), 'utf8')) as { faces: { file: string; url: string }[] };
    const face = meta.faces.find((f) => f.file === file);
    if (face) return face.url;
  } catch {
    /* fonts.json missing → generic source */
  }
  return 'https://fonts.google.com (Google Fonts CSS2 API)';
}

const RULES: Rule[] = [
  {
    test: /^fonts\/fonts\.json$/,
    record: () => ({
      source: 'tools/fonts*.ts (Google Fonts CSS2 API response, parsed)',
      license: 'Metadata (generated)',
      modification: 'none',
      generator: 'tools/fonts*.ts',
    }),
  },
  {
    test: /^fonts\/OFL\.txt$/,
    record: () => ({
      source: 'https://github.com/google/fonts (ofl/*/OFL.txt)',
      license: 'SIL Open Font License 1.1',
      modification: 'none (licence text shipped with the fonts as OFL requires)',
      generator: 'tools/fonts-fetch.ts',
    }),
  },
  {
    test: /^fonts\/.+\.woff2$/,
    record: (p) => ({
      source: fontSource(p.slice('fonts/'.length)),
      license: 'SIL Open Font License 1.1',
      modification: 'none (Google Fonts latin / latin-ext subset as served)',
      generator: 'tools/fonts*.ts',
    }),
  },
  {
    test: /^worlds\/[a-z]+\/world\.json$/,
    record: () => ({
      source: 'tools/terrain/worldDefs.ts + bake outputs',
      license: 'Original work (KANAT, procedural, generated in-repo)',
      modification: 'n/a',
      generator: 'tools/bake-terrain.ts',
    }),
  },
  {
    test: /^worlds\/[a-z]+\/.+\.(u16\.z|u8\.z|png|webp|ktx2)$/,
    record: () => ({
      source: 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png (z13 core, z11 far)',
      license: 'Derived from AWS Terrain Tiles — attribution required (docs/credits/terrain.md)',
      modification: 'bicubic resample, binomial filter, seeded hydraulic erosion, vertical scale, coastal bathymetry, procedural travertine patch; derived normal/splat/shadow-AO/colour maps',
      generator: 'tools/bake-terrain.ts',
    }),
  },
];

function walk(dir: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
}

export function buildManifest(): Manifest {
  const files: string[] = [];
  walk(PUBLIC, files);
  files.sort();
  const records: ManifestRecord[] = [];
  const unmatched: string[] = [];
  for (const full of files) {
    const path = relative(PUBLIC, full).split('\\').join('/');
    const rule = RULES.find((r) => r.test.test(path));
    if (!rule) {
      unmatched.push(path);
      continue;
    }
    const buf = readFileSync(full);
    records.push({ path, bytes: buf.length, sha256: createHash('sha256').update(buf).digest('hex'), ...rule.record(path) });
  }
  if (unmatched.length) throw new Error(`gen-manifest: no licence rule for: ${unmatched.join(', ')}`);
  return { v: 1, allowedLicenses: ALLOWED_LICENSES, files: records };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const m = buildManifest();
  mkdirSync(join(ROOT, 'assets'), { recursive: true });
  writeFileSync(join(ROOT, 'assets', 'manifest.json'), JSON.stringify(m, null, 1) + '\n');
  const total = m.files.reduce((s, f) => s + f.bytes, 0);
  console.log(`assets/manifest.json: ${m.files.length} files, ${(total / 1048576).toFixed(2)} MB`);
}
