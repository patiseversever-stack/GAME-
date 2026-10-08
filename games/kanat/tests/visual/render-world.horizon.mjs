// Horizon / crack test (§9.G-3): N random cameras per world with background + skirts in debug magenta.
// Counts magenta pixels below the ground point at the fog-fade distance (rays that must hit terrain).
// Needs the dev server: npx vite --port 5182.  Usage: node tests/visual/render-world.horizon.mjs [N=200] [tier=low]
import { launch } from '../../tools/shot.mjs';

const N = Number(process.argv[2] ?? 200);
const tier = process.argv[3] ?? 'low';
let fail = 0;
for (const w of ['kapadokya', 'likya', 'karadeniz', 'erciyes', 'pamukkale']) {
  const b = await launch();
  try {
    const page = await (await b.newContext({ viewport: { width: 195, height: 422 } })).newPage();
    let res = null;
    page.on('console', (m) => { if (m.text().startsWith('HORIZON ')) res = JSON.parse(m.text().slice(8)); });
    await page.goto(`http://localhost:5182/dev/render-world.html?world=${w}&tier=${tier}&horizon=${N}`);
    await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 600000 });
    console.log(JSON.stringify(res));
    if (!res || res.magentaPixels > 0) fail++;
  } finally {
    await b.close();
  }
}
console.log(fail === 0 ? 'HORIZON OK (0 magenta pixels)' : `HORIZON: ${fail} world(s) with magenta pixels`);
process.exit(fail === 0 ? 0 : 1);
