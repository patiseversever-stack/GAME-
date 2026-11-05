// Soru bankası sayımı ve uzunluk dağılımı:  node tools/denetim/banka.mjs
// Klasik banka (src/data/bank.js: q/*.js + q/ek/*.js) ve yeni tipler (DENEME_SAMPLES, src/data/ek/*.js dahil).
// Her tipte adet, kategori dağılımı, soru metni ve şık uzunluğu (ortanca / p95 / en uzun) ve kimlik çakışması.
import { build } from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BODY = `
import { BANK } from './src/data/bank.js';
import { ALL } from './src/data/q/index.js';
import { DENEME_SAMPLES } from './src/quiz/deneme.js';
const st = (v) => { v = v.filter((x) => x != null).sort((a, b) => a - b); if (!v.length) return '-'; const p = (k) => v[Math.min(v.length - 1, Math.floor(v.length * k))]; return p(0.5) + '/' + p(0.95) + '/' + v[v.length - 1]; };
const opts = (q) => (q.a || q.opts || q.items?.map((x) => x.t) || q.pairs?.flat() || (q.left ? [q.left.t, q.right.t] : []) || []).map(String);
const by = {};
for (const q of BANK) (by[q.type] ??= []).push(q);
console.log('KLASİK BANKA', BANK.length, '(ham ' + ALL.length + ', yinelenen/tipsiz elenen ' + (ALL.length - BANK.length + 0) + ' civarı)');
for (const [t, a] of Object.entries(by).sort((x, y) => y[1].length - x[1].length)) {
  const c = {}; for (const q of a) c[q.cat] = (c[q.cat] || 0) + 1;
  console.log('  ' + t.padEnd(9), String(a.length).padStart(5), '| soru ' + st(a.map((q) => String(q.q || q.text || '').length)).padEnd(11), '| şık ' + st(a.flatMap(opts).map((s) => s.length)).padEnd(9), JSON.stringify(c));
}
let ids = new Map(); let dup = 0;
for (const q of ALL) { if (ids.has(q.id)) { dup++; if (dup < 20) console.log('  KİMLİK ÇAKIŞMASI', q.id); } ids.set(q.id, 1); }
console.log('YENİ TİPLER');
for (const [t, a] of Object.entries(DENEME_SAMPLES)) {
  const c = {}; for (const q of a) c[q.cat] = (c[q.cat] || 0) + 1;
  const s = new Set(); let d = 0; for (const q of a) { if (s.has(q.id)) { d++; if (d < 10) console.log('  KİMLİK ÇAKIŞMASI', t, q.id); } s.add(q.id); }
  console.log('  ' + t.padEnd(10), String(a.length).padStart(5), '| soru ' + st(a.map((q) => String(q.q || '').length)).padEnd(11), q0(a), JSON.stringify(c));
}
function q0(a) { const x = a.map((q) => q.t ? String(q.t).length : null).filter((v) => v != null); return x.length ? '| cümle ' + st(x) : ''; }
`;
const r = await build({ stdin: { contents: BODY, resolveDir: root, loader: 'js' }, bundle: true, write: false, format: 'esm', platform: 'node', loader: { '.json': 'json' }, logLevel: 'silent' });
await import('data:text/javascript;base64,' + Buffer.from(r.outputFiles[0].text).toString('base64'));
