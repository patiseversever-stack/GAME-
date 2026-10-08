// §9.3-2 lifecycle: background (visibilitychange), host pause, WebGL context loss + restore,
// orientation change during play, TR↔EN language switch. Uses window.__game; the active mode must
// register state/goto/step/hash handlers — a missing handler fails loudly (lib.requireHandlers).
//
// E2E_I18N_TEXT=0 skips the "visible text changes with the language" check (platform harness only:
// it has no localized UI).

import { assert, assertEqual, BASE_URL, GAME_PAGE, launch, openPage, requireHandlers, run, setHidden, sleep, test, waitFor, waitGameReady } from './lib.mjs';

const browser = await launch();
const s = await openPage(browser, { device: 'iphone13', orientation: 'portrait' });
const page = s.page;
const app = () => page.evaluate(() => window.__game.app());
const tick = async () => (await app()).tick;

async function advancing(ms = 600) {
  const a = await tick();
  await sleep(ms);
  return (await tick()) > a;
}

test('boot + required handlers', async () => {
  await page.goto(`${BASE_URL}/${GAME_PAGE}?test=1`);
  await waitGameReady(page);
  await requireHandlers(page, ['state', 'hash', 'goto', 'step']);
});

test('goto career → game state, sim advancing', async () => {
  await page.evaluate(() => window.__game.goto('career', 'w1r1', 1));
  await waitFor(async () => (await app()).state === 'game', { message: 'FSM in game', timeout: 30000 });
  await waitFor(async () => (await app()).simRunning, { message: 'sim running' });
  assert(await advancing(), 'loop ticks advance in game');
  const st = await page.evaluate(() => window.__game.state());
  assert(st && typeof st === 'object', 'state() returns an object');
  const h = await page.evaluate(() => window.__game.hash());
  assert(typeof h === 'number' || typeof h === 'string', 'hash() returns number|string');
});

test('step(n) is deterministic and render-independent', async () => {
  await page.evaluate(() => window.__game.goto('career', 'w1r1', 7));
  await setHidden(page, true); // stop the rAF loop so only step() advances the sim
  await waitFor(async () => !(await app()).loopRunning, { message: 'loop stopped' });
  await page.evaluate(() => window.__game.goto('career', 'w1r1', 7));
  await page.evaluate(() => window.__game.step(120));
  const h1 = await page.evaluate(() => window.__game.hash());
  await page.evaluate(() => window.__game.goto('career', 'w1r1', 7));
  await page.evaluate(() => window.__game.step(120));
  const h2 = await page.evaluate(() => window.__game.hash());
  assertEqual(h2, h1, 'same seed + same steps → same hash');
  await setHidden(page, false);
  await page.evaluate(() => window.__game.confirmResume());
});

test('background (visibilitychange) stops sim + loop, "Devam" holds the sim on return', async () => {
  await waitFor(async () => (await app()).simRunning, { message: 'sim running before hide' });
  await setHidden(page, true);
  await waitFor(async () => {
    const a = await app();
    return a.suspended && !a.loopRunning;
  }, { message: 'suspended on hidden' });
  assert(!(await advancing(500)), 'no ticks while hidden');
  await setHidden(page, false);
  await waitFor(async () => (await app()).resumePrompt === true, { message: 'resume prompt shown' });
  assert((await app()).loopRunning, 'rendering resumed behind the overlay');
  assert(!(await advancing(400)), 'sim held until Devam');
  await page.evaluate(() => window.__game.confirmResume());
  assert(await advancing(), 'sim advances after Devam');
});

test('host pause/resume during play', async () => {
  await page.evaluate(() => window.GameBridge.receive(JSON.stringify({ v: 1, game: 'kanat', type: 'pause', payload: {} })));
  await waitFor(async () => (await app()).suspended, { message: 'host pause' });
  assert(!(await advancing(400)), 'no ticks while host-paused');
  await page.evaluate(() => window.GameBridge.receive(JSON.stringify({ v: 1, game: 'kanat', type: 'resume', payload: {} })));
  await waitFor(async () => (await app()).resumePrompt, { message: 'prompt after host resume' });
  await page.evaluate(() => window.__game.confirmResume());
  assert(await advancing(), 'advancing after Devam');
});

test('WebGL context loss → restore → play continues', async () => {
  const lost = await page.evaluate(() => window.__game.loseContext());
  assert(lost, 'WEBGL_lose_context available on the game canvas (app.attachCanvas called?)');
  await waitFor(async () => (await app()).contextLost, { message: 'contextLost flag' });
  assert(!(await advancing(300)), 'sim stopped while context is lost');
  await page.evaluate(() => window.__game.restoreContext());
  await waitFor(async () => !(await app()).contextLost, { message: 'context restored', timeout: 20000 });
  await waitFor(async () => (await app()).resumePrompt, { message: 'prompt after restore' });
  await page.evaluate(() => window.__game.confirmResume());
  assert(await advancing(), 'advancing after restore');
  const st = await page.evaluate(() => window.__game.state());
  assert(st && typeof st === 'object', 'state() still works after restore');
});

test('orientation change during play', async () => {
  await page.setViewportSize({ width: 844, height: 390 });
  await waitFor(async () => (await app()).orientation === 'landscape', { message: 'landscape detected' });
  await waitFor(async () => (await page.evaluate(() => document.documentElement.dataset.orientation)) === 'landscape', {
    message: 'data-orientation=landscape',
  });
  assert(await advancing(), 'advancing in landscape');
  await page.setViewportSize({ width: 390, height: 844 });
  await waitFor(async () => (await app()).orientation === 'portrait', { message: 'portrait again' });
  assert(await advancing(), 'advancing in portrait');
});

test('language TR ↔ EN', async () => {
  const textBefore = await page.evaluate(() => document.body.innerText);
  await page.evaluate(() => window.GameBridge.receive(JSON.stringify({ v: 1, game: 'kanat', type: 'setLocale', payload: { lang: 'en' } })));
  await waitFor(async () => (await app()).lang === 'en', { message: 'lang en' });
  assertEqual(await page.evaluate(() => document.documentElement.lang), 'en', '<html lang=en>');
  if (process.env.E2E_I18N_TEXT !== '0') {
    await waitFor(async () => (await page.evaluate(() => document.body.innerText)) !== textBefore, {
      message: 'visible UI text changes after setLocale en (UI must re-render on the `locale` bus event)',
      timeout: 5000,
    });
  }
  await page.evaluate(() => window.GameBridge.receive(JSON.stringify({ v: 1, game: 'kanat', type: 'setLocale', payload: { lang: 'tr' } })));
  await waitFor(async () => (await app()).lang === 'tr', { message: 'lang tr' });
  assert(await advancing(), 'still advancing after language switches');
});

test('no console errors, no external requests', async () => {
  assertEqual(s.errors, [], 'console errors');
  assertEqual(s.blocked, [], 'blocked external requests');
});

const failed = await run('lifecycle');
await browser.close();
process.exit(failed ? 1 : 0);
