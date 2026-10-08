// §9.3-7 / §11: no external network request at runtime. Every non-localhost request is blocked; the
// game must boot, reach the menu and start a flight with ZERO attempts to leave localhost.

import { assert, assertEqual, BASE_URL, GAME_PAGE, launch, openPage, requireHandlers, run, sleep, test, waitFor, waitGameReady } from './lib.mjs';

const browser = await launch();
const s = await openPage(browser, { device: 'mi9t', orientation: 'portrait' });
const page = s.page;

test('boots offline (menu) without touching the network', async () => {
  await page.goto(`${BASE_URL}/${GAME_PAGE}?test=1`);
  await waitGameReady(page);
  await sleep(1000);
  const a = await page.evaluate(() => window.__game.app());
  assertEqual(a.state, 'menu', 'FSM reached the menu');
  assertEqual(s.blocked, [], 'external requests during boot');
});

test('starts a flight offline', async () => {
  await requireHandlers(page, ['goto', 'step']);
  await page.evaluate(() => window.__game.goto('career', 'w1r1', 1));
  await waitFor(async () => (await page.evaluate(() => window.__game.app())).state === 'game', { message: 'game state', timeout: 30000 });
  await page.evaluate(() => window.__game.step(300));
  await sleep(1000);
  assertEqual(s.blocked, [], 'external requests during play');
});

test('every request stayed on localhost / data / blob', async () => {
  const bad = s.requests.filter((u) => !/^(https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/|data:|blob:)/.test(u));
  assertEqual(bad, [], 'non-local requests');
  assert(s.requests.length > 0, 'requests were observed');
  assertEqual(s.errors, [], 'console errors');
});

test('no service worker, no third-party globals', async () => {
  const r = await page.evaluate(async () => ({
    sw: 'serviceWorker' in navigator ? (await navigator.serviceWorker.getRegistrations()).length : 0,
    ga: typeof window.gtag !== 'undefined' || typeof window.ga !== 'undefined' || typeof window.fbq !== 'undefined',
  }));
  assertEqual(r, { sw: 0, ga: false }, 'service worker / analytics SDK');
});

const failed = await run('offline');
await browser.close();
process.exit(failed ? 1 : 0);
