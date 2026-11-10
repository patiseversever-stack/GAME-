// Her tipin "en zor yerleşen" soruları:  node tools/denetim/en_uzun.mjs [adet=2]
// Soru metni, en uzun şık / öğe ve şıkların toplamı ölçüsünde en uzun olanlar (klasik banka + yeni tipler).
// Çıktı: cakisma.cjs için tip@kimlik listesi (virgüllü) ve her biri için ölçü.
import { build } from 'esbuild';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const N = Number(process.argv[2] || 2);
const BODY = `const N = ${N};
import { BANK } from './src/data/bank.js';
import { DENEME_SAMPLES } from './src/quiz/deneme.js';
const L = (s) => [...String(s ?? '')].length;
const parts = (q) => [
  ...(Array.isArray(q.a) ? q.a : []), ...(Array.isArray(q.opts) ? q.opts : []), ...(Array.isArray(q.items) ? q.items : []).map((x) => x?.t ?? x?.q ?? ''), ...(Array.isArray(q.pairs) ? q.pairs.flat() : []), ...(q.left ? [q.left.t, q.right.t] : []),
  ...(Array.isArray(q.f) ? q.f.map((x) => x.t) : []), ...(Array.isArray(q.f) ? q.f.map((x) => x.n || '') : []), ...(Array.isArray(q.clues) ? q.clues : []), ...(Array.isArray(q.words) ? q.words.map((x) => x.clue) : []),
  ...(Array.isArray(q.ans) ? q.ans.map((x) => (Array.isArray(x) ? x[0] : x)) : []), ...(Array.isArray(q.wrong) ? q.wrong : []), typeof q.t === 'string' ? q.t : null, q.text, typeof q.n === 'string' ? q.n : null, q.hint, typeof q.w === 'string' ? q.w : null,
].filter((x) => x != null).map(String);
const by = {};
for (const q of [...BANK, ...Object.values(DENEME_SAMPLES).flat()]) (by[q.type] ??= []).push(q);
const out = [];
const rows = [];
for (const [t, list] of Object.entries(by)) {
  const score = (q) => [L(q.q), Math.max(0, ...parts(q).map(L)), parts(q).reduce((a, s) => a + L(s), 0)];
  const pick = new Set();
  for (const k of [0, 1, 2]) for (const q of list.slice().sort((a, b) => score(b)[k] - score(a)[k]).slice(0, N)) pick.add(q);
  for (const q of [...pick].slice(0, N * 2)) { out.push(t + '@' + q.id); rows.push(t.padEnd(10) + ' ' + q.id.padEnd(16) + ' ' + score(q).join('/')); }
}
console.log(rows.join('\\n'));
console.log('\\nLISTE ' + out.join(','));
`;
const r = await build({ stdin: { contents: BODY, resolveDir: root, loader: 'js' }, bundle: true, write: false, format: 'esm', platform: 'node', loader: { '.json': 'json' }, logLevel: 'silent' });
await import('data:text/javascript;base64,' + Buffer.from(r.outputFiles[0].text).toString('base64'));
