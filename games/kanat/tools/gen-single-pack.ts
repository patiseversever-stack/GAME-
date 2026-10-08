// Single-file asset pack generator (owner: platform). Collects every runtime file under public/
// (worlds/*, fonts/*, basis transcoder, …) and embeds it into dist/single/kanat.html as base64
// <script type="application/x-kanat-asset"> blocks + a JSON index (read by src/core/assets.ts).
// If the html would exceed the budget (25 MB), whole groups (one world = one group) overflow into
// dist/single/packs/kanat-pack-N.js — classic scripts that load next to the html even from file://.
//
// Used by vite.single.config.ts (closeBundle). CLI dry run: `node tools/gen-single-pack.ts [publicDir]`.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';

export interface PackFile {
  path: string; // posix, relative to public/
  mime: string;
  bytes: Uint8Array;
  group: string;
}

export interface PackPlan {
  inline: PackFile[];
  overflow: PackFile[][];
  inlineBytes: number;
  overflowBytes: number;
  budgetBytes: number;
}

export interface InjectResult {
  html: string;
  packs: { name: string; content: string }[];
  report: {
    files: number;
    inlineFiles: number;
    overflowFiles: number;
    rawBytes: number;
    htmlBytes: number;
    packBytes: number[];
    groups: Record<string, { files: number; bytes: number; where: 'inline' | string }>;
  };
}

export const SINGLE_HTML_BUDGET = 25_000_000; // bytes (decimal MB, the stricter reading of "25 MB")
export const PACK_CHUNK_BYTES = 12_000_000; // raw bytes per overflow pack file

const MIME: Record<string, string> = {
  '.json': 'application/json',
  '.bin': 'application/octet-stream',
  '.f32': 'application/octet-stream',
  '.u16': 'application/octet-stream',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.ktx2': 'image/ktx2',
  '.basis': 'application/octet-stream',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.wasm': 'application/wasm',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.opus': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.wav': 'audio/wav',
  '.txt': 'text/plain',
  '.css': 'text/css',
  '.gz': 'application/gzip',
};

/** Files under public/ that are NOT runtime data. */
const SKIP = [/(^|\/)\./, /\.map$/i, /(^|\/)README[^/]*$/i, /\.md$/i, /(^|\/)Thumbs\.db$/i, /(^|\/)LICENSE[^/]*$/i, /\.psd$/i, /\.blend\d?$/i];

/** Embedding priority: shared runtime first, then the first world (main mode), then the rest. */
export const GROUP_PRIORITY = ['core', 'fonts', 'basis', 'draco', 'audio', 'suru', 'worlds/kapadokya', 'worlds/likya', 'worlds/karadeniz', 'worlds/erciyes', 'worlds/pamukkale'];

export function mimeOf(path: string): string {
  return MIME[extname(path).toLowerCase()] ?? 'application/octet-stream';
}

export function groupOf(path: string): string {
  const parts = path.split('/');
  if (parts[0] === 'worlds' && parts.length > 2) return `worlds/${parts[1]}`;
  if (parts.length === 1) return 'core';
  return parts[0];
}

export function collectPublicFiles(publicDir: string): PackFile[] {
  const out: PackFile[] = [];
  const walk = (dir: string): void => {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries.sort()) {
      const full = join(dir, name);
      const st = statSync(full);
      const rel = relative(publicDir, full).split(sep).join('/');
      if (SKIP.some((re) => re.test(rel))) continue;
      if (st.isDirectory()) walk(full);
      else if (st.isFile()) out.push({ path: rel, mime: mimeOf(rel), bytes: new Uint8Array(readFileSync(full)), group: groupOf(rel) });
    }
  };
  walk(publicDir);
  return out;
}

export const b64Len = (n: number): number => 4 * Math.ceil(n / 3);

/** Per-file tag overhead estimate (script tag + attributes + index entry). */
const TAG_OVERHEAD = 160;

function groupRank(g: string): number {
  const i = GROUP_PRIORITY.indexOf(g);
  return i >= 0 ? i : GROUP_PRIORITY.indexOf('worlds/kapadokya') - 0.5; // unknown shared groups before worlds
}

/**
 * Greedy plan: groups in priority order go inline while the html stays under budget; a group that
 * does not fit goes whole to overflow (no half worlds). `baseHtmlBytes` = html size without the pack.
 */
export function planPack(files: PackFile[], baseHtmlBytes: number, budgetBytes = SINGLE_HTML_BUDGET): PackPlan {
  const groups = new Map<string, PackFile[]>();
  for (const f of files) {
    const g = groups.get(f.group) ?? [];
    g.push(f);
    groups.set(f.group, g);
  }
  const order = [...groups.keys()].sort((a, b) => groupRank(a) - groupRank(b) || a.localeCompare(b));
  const inline: PackFile[] = [];
  const spill: PackFile[] = [];
  let used = baseHtmlBytes + 4096; // index json slack
  let inlineBytes = 0;
  for (const g of order) {
    const list = groups.get(g)!;
    const cost = list.reduce((s, f) => s + b64Len(f.bytes.length) + TAG_OVERHEAD + f.path.length * 2, 0);
    if (used + cost <= budgetBytes) {
      inline.push(...list);
      used += cost;
      inlineBytes += list.reduce((s, f) => s + f.bytes.length, 0);
    } else {
      spill.push(...list);
    }
  }
  // chunk overflow by group boundaries, ≤ PACK_CHUNK_BYTES raw where possible
  const overflow: PackFile[][] = [];
  let cur: PackFile[] = [];
  let curBytes = 0;
  let curGroup = '';
  for (const f of spill) {
    const startNew = cur.length > 0 && (curBytes + f.bytes.length > PACK_CHUNK_BYTES || (f.group !== curGroup && curBytes > PACK_CHUNK_BYTES / 2));
    if (startNew) {
      overflow.push(cur);
      cur = [];
      curBytes = 0;
    }
    cur.push(f);
    curBytes += f.bytes.length;
    curGroup = f.group;
  }
  if (cur.length) overflow.push(cur);
  return {
    inline,
    overflow,
    inlineBytes,
    overflowBytes: spill.reduce((s, f) => s + f.bytes.length, 0),
    budgetBytes,
  };
}

const escAttr = (s: string): string => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** Inject pack tags into the built html (before </body>) and render overflow pack scripts. */
export function injectPack(html: string, files: PackFile[], budgetBytes = SINGLE_HTML_BUDGET): InjectResult {
  const plan = planPack(files, Buffer.byteLength(html), budgetBytes);
  const index: { v: 1; files: Record<string, { m: string; n: number; s: 'i' | number }>; packs: string[] } = { v: 1, files: {}, packs: [] };
  for (const f of plan.inline) index.files[f.path] = { m: f.mime, n: f.bytes.length, s: 'i' };
  const packs: { name: string; content: string }[] = [];
  plan.overflow.forEach((chunk, i) => {
    const name = `packs/kanat-pack-${i + 1}.js`;
    index.packs.push(name);
    const body: Record<string, string> = {};
    for (const f of chunk) {
      index.files[f.path] = { m: f.mime, n: f.bytes.length, s: i };
      body[f.path] = Buffer.from(f.bytes).toString('base64');
    }
    packs.push({
      name,
      content: `/* KANAT asset pack ${i + 1} — generated by tools/gen-single-pack.ts */\n(self.__kanatPack = self.__kanatPack || []).push({ files: ${JSON.stringify(body)} });\n`,
    });
  });
  const tags: string[] = [];
  tags.push(`<script type="application/json" id="kanat-pack-index">${JSON.stringify(index).replace(/</g, '\\u003c')}</script>`);
  for (const f of plan.inline) {
    tags.push(`<script type="application/x-kanat-asset" data-p="${escAttr(f.path)}">${Buffer.from(f.bytes).toString('base64')}</script>`);
  }
  const block = `\n<!-- kanat asset pack: ${plan.inline.length} inline file(s), ${plan.overflow.length} overflow pack(s) -->\n${tags.join('\n')}\n`;
  const out = html.includes('</body>') ? html.replace('</body>', `${block}</body>`) : html + block;

  const groups: InjectResult['report']['groups'] = {};
  for (const f of files) {
    const g = groups[f.group] ?? (groups[f.group] = { files: 0, bytes: 0, where: 'inline' });
    g.files++;
    g.bytes += f.bytes.length;
    const e = index.files[f.path];
    if (e && e.s !== 'i') g.where = index.packs[e.s];
  }
  return {
    html: out,
    packs,
    report: {
      files: files.length,
      inlineFiles: plan.inline.length,
      overflowFiles: files.length - plan.inline.length,
      rawBytes: files.reduce((s, f) => s + f.bytes.length, 0),
      htmlBytes: Buffer.byteLength(out),
      packBytes: packs.map((p) => Buffer.byteLength(p.content)),
      groups,
    },
  };
}

// ---- CLI dry run ------------------------------------------------------------------------------
const isMain = typeof process !== 'undefined' && process.argv[1] && /gen-single-pack\.ts$/.test(process.argv[1]);
if (isMain) {
  const dir = process.argv[2] ?? 'public';
  const files = collectPublicFiles(dir);
  const res = injectPack('<html><body></body></html>', files);
  console.log(JSON.stringify({ publicDir: dir, ...res.report }, null, 2));
}
