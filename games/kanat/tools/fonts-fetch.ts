// Downloads the KANAT UI fonts (Google Fonts, SIL OFL 1.1) into public/fonts/ — latin + latin-ext subsets
// (latin-ext carries ğ Ğ ş Ş İ; latin carries ı ç ö ü). Re-run: `node tools/fonts-fetch.ts`.
// The runtime loader (src/ui/fonts.ts) mirrors the file list + unicode ranges written to public/fonts/fonts.json.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'fonts');
const CSS_URL =
  'https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,600;0,700;1,600&family=Inter:wght@400;600&family=Playfair+Display:ital,wght@1,400;1,600&display=swap';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const KEEP = new Set(['latin', 'latin-ext']);

interface Face { family: string; style: string; weight: string; subset: string; url: string; unicodeRange: string; file: string }

async function main(): Promise<void> {
  const css = await (await fetch(CSS_URL, { headers: { 'user-agent': UA } })).text();
  const re = /\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g;
  const parsed: Omit<Face, 'file'>[] = [];
  for (let m = re.exec(css); m; m = re.exec(css)) {
    const subset = m[1];
    if (!KEEP.has(subset)) continue;
    const body = m[2];
    const get = (k: string): string => (new RegExp(`${k}:\\s*([^;]+);`).exec(body)?.[1] ?? '').trim();
    const url = /url\(([^)]+)\)/.exec(get('src'))?.[1] ?? '';
    parsed.push({ family: get('font-family').replace(/'/g, ''), style: get('font-style'), weight: get('font-weight'), subset, url, unicodeRange: get('unicode-range') });
  }
  // Variable fonts (Inter, Playfair) return one file for several weights: download once, name it "var".
  const urlCount = new Map<string, number>();
  for (const f of parsed) urlCount.set(f.url, (urlCount.get(f.url) ?? 0) + 1);
  const faces: Face[] = [];
  const seen = new Map<string, string>();
  mkdirSync(OUT, { recursive: true });
  for (const f of parsed) {
    let file = seen.get(f.url);
    if (!file) {
      const slug = f.family.toLowerCase().replace(/\s+/g, '-');
      const w = (urlCount.get(f.url) ?? 1) > 1 ? 'var' : f.weight;
      file = `${slug}-${f.style === 'italic' ? 'italic-' : ''}${w}-${f.subset}.woff2`;
      const buf = Buffer.from(await (await fetch(f.url, { headers: { 'user-agent': UA } })).arrayBuffer());
      writeFileSync(join(OUT, file), buf);
      seen.set(f.url, file);
      console.log(`${file}  ${buf.length} B  <- ${f.url}`);
    }
    faces.push({ ...f, file });
  }
  writeFileSync(join(OUT, 'fonts.json'), JSON.stringify({ source: CSS_URL, license: 'SIL Open Font License 1.1', faces }, null, 2));
  console.log(`${faces.length} faces, ${seen.size} files → public/fonts/`);
}

await main();
