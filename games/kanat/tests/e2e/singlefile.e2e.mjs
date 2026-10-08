// §7.1 / §9.3-7: dist/single/kanat.html opens from file:// in headless Chromium, boots, serves every
// embedded runtime file from its pack (inline + overflow packs/*.js) and makes no network request.

import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { assert, assertEqual, launch, openPage, run, sleep, test, waitFor, waitGameReady } from './lib.mjs';

const SINGLE = process.env.SINGLE_HTML;
const BUDGET = 25_000_000;
const browser = await launch();
let s;

test('kanat.html exists and is within the 25 MB budget', async () => {
  assert(SINGLE && existsSync(SINGLE), `single html missing: ${SINGLE} (npm run build)`);
  const size = statSync(SINGLE).size;
  console.log(`    kanat.html = ${(size / 1e6).toFixed(2)} MB`);
  assert(size <= BUDGET, `kanat.html ${size} bytes > ${BUDGET}`);
  const html = readFileSync(SINGLE, 'utf8');
  assert(!/<script[^>]+src=["']https?:/i.test(html), 'no external <script src>');
  assert(!/<link[^>]+href=["']https?:/i.test(html), 'no external <link href>');
  assert(html.includes('id="kanat-pack-index"'), 'asset pack index embedded');
});

test('boots from file:// with zero network requests', async () => {
  s = await openPage(browser, { device: 'iphone13', allowHttpLocalhost: false });
  await s.page.goto(`${pathToFileURL(SINGLE).href}?test=1`);
  await waitGameReady(s.page, 60000);
  const a = await s.page.evaluate(() => window.__game.app());
  assertEqual(a.single, true, 'single-file build flag');
  assert(a.pack && typeof a.pack.files === 'number', 'embedded pack registered');
  assertEqual(a.state, 'menu', 'reached menu');
  const net = s.requests.filter((u) => !/^(file:|data:|blob:|about:)/.test(u));
  assertEqual(net, [], 'network requests');
});

test('embedded files (inline and overflow packs) are served through fetch()', async () => {
  const idx = JSON.parse(readFileSync(SINGLE, 'utf8').match(/<script type="application\/json" id="kanat-pack-index">([\s\S]*?)<\/script>/)[1]);
  const paths = Object.keys(idx.files);
  console.log(`    pack: ${paths.length} files, ${idx.packs.length} overflow pack(s)`);
  for (const p of idx.packs) assert(existsSync(`${dirname(SINGLE)}/${p}`), `overflow pack ${p} next to the html`);
  // sample: first + last inline file and one file from each overflow pack
  const inline = paths.filter((p) => idx.files[p].s === 'i');
  const pick = new Set([inline[0], inline[inline.length - 1]].filter(Boolean));
  idx.packs.forEach((_, i) => {
    const f = paths.find((p) => idx.files[p].s === i);
    if (f) pick.add(f);
  });
  for (const p of pick) {
    const n = await s.page.evaluate(async (path) => {
      const r = await fetch(`./${path}`);
      return r.ok ? (await r.arrayBuffer()).byteLength : -r.status;
    }, p);
    assertEqual(n, idx.files[p].n, `fetch ./${p} byte length`);
  }
});

test('gameplay starts from file:// when a mode is wired', async () => {
  const have = await s.page.evaluate(() => window.__game.handlers());
  assert('goto' in have, `__game.goto not registered — the mode must call registerTestHandlers({ goto }) (registered: ${JSON.stringify(have)})`);
  await s.page.evaluate(() => window.__game.goto('career', 'w1r1', 1));
  await waitFor(async () => (await s.page.evaluate(() => window.__game.app())).state === 'game', { message: 'game state', timeout: 30000 });
  await sleep(800);
  const net = s.requests.filter((u) => !/^(file:|data:|blob:|about:)/.test(u));
  assertEqual(net, [], 'network requests during play');
  assertEqual(s.errors, [], 'console errors');
});

const failed = await run('singlefile');
await browser.close();
process.exit(failed ? 1 : 0);
