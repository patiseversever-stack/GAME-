// Budget test (§9.G-17): 10 fixed bookmarks per world × tiers → renderer.info (draw calls, triangles, programs,
// textures, texture MB). Needs the dev server: npx vite --port 5182
// Usage: node tests/visual/render-world.budget.mjs [worlds=kapadokya,...] [tiers=low,medium,high,ultra] [props=1]
import { launch } from '../../tools/shot.mjs';
import fs from 'node:fs';

const worlds = (process.argv[2] ?? 'kapadokya').split(',');
const tiers = (process.argv[3] ?? 'low,medium,high,ultra').split(',');
const props = process.argv[4] ?? '0';
const CAPS = { low: [80, 150000], medium: [140, 350000], high: [220, 700000], ultra: [300, 1200000] };
const out = [];
let fail = 0;
for (const w of worlds) {
  for (const t of tiers) {
    const b = await launch();
    try {
      const page = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
      let perf = null;
      page.on('console', (m) => { if (m.text().startsWith('PERF ')) perf = JSON.parse(m.text().slice(5)); });
      await page.goto(`http://localhost:5182/dev/render-world.html?world=${w}&tier=${t}&perf=1&props=${props}`);
      await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 400000 });
      const [maxCalls, maxTris] = CAPS[t];
      for (const r of perf?.rows ?? []) {
        const ok = r.calls <= maxCalls && r.tris <= maxTris;
        if (!ok) fail++;
        out.push({ world: w, tier: t, ...r, ok });
      }
      console.log(w, t, JSON.stringify(perf?.rows?.map((r) => [r.bm, r.calls, r.tris])));
    } finally {
      await b.close();
    }
  }
}
fs.mkdirSync('docs/shots/render-world', { recursive: true });
fs.writeFileSync(`docs/shots/render-world/budget_${props === '1' ? 'withprops' : 'world'}.json`, JSON.stringify(out, null, 1));
console.log(fail === 0 ? 'BUDGET OK' : `BUDGET: ${fail} bookmark(s) over the global cap`);
process.exit(fail === 0 ? 0 : 1);
