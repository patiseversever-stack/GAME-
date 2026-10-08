// §9.3-6 Bridge: every message type round-trips through host-demo.html (iframe + postMessage),
// standalone mode has no errors.

import { assert, assertEqual, BASE_URL, GAME_PAGE, launch, openPage, run, sleep, test, waitFor, waitGameReady } from './lib.mjs';

const browser = await launch();
let ctx;
let host;
let frame;

async function app() {
  return frame.evaluate(() => window.__game.app());
}

async function hostMessages(type) {
  return host.evaluate((t) => window.hostDemo.messages(t), type);
}

async function sendFromHost(type, payload = {}) {
  await host.evaluate(([t, p]) => window.hostDemo.send(t, p), [type, payload]);
}

async function gameFrame() {
  const handle = await host.waitForSelector('#game');
  const f = await handle.contentFrame();
  if (!f) throw new Error('host-demo iframe has no frame');
  return f;
}

test('host-demo boots the game and receives ready + loading', async () => {
  ctx = await openPage(browser, { device: 'iphone13' });
  host = ctx.page;
  const src = encodeURIComponent(`./${GAME_PAGE}`);
  await host.goto(`${BASE_URL}/host-demo.html?test=1&src=${src}`);
  frame = await gameFrame();
  await waitGameReady(frame);
  const ready = await waitFor(async () => (await hostMessages('ready'))[0], { message: 'ready envelope at host' });
  assertEqual([ready.v, ready.game, ready.type], [1, 'kanat', 'ready'], 'ready envelope header');
  assert(typeof ready.payload.version === 'string' && ready.payload.version.length > 0, 'ready.version');
  assert(Array.isArray(ready.payload.modes) && ready.payload.modes.length > 0, 'ready.modes');
  assert(ready.payload.capabilities && typeof ready.payload.capabilities === 'object', 'ready.capabilities');
  const loading = await hostMessages('loading');
  assert(loading.length >= 1, 'at least one loading event');
  assert(loading.every((m) => m.payload.progress >= 0 && m.payload.progress <= 1), 'loading progress in 0..1');
  assertEqual(loading[loading.length - 1].payload.progress, 1, 'last loading progress = 1');
  const a = await app();
  assertEqual(a.bridge.transport, 'iframe', 'transport inside host-demo');
});

test('pause / resume', async () => {
  await sendFromHost('pause');
  await waitFor(async () => (await app()).pauseReasons.includes('host'), { message: 'host pause applied' });
  const a = await app();
  assert(a.suspended && !a.loopRunning, `suspended + loop stopped (got ${JSON.stringify({ s: a.suspended, l: a.loopRunning })})`);
  await sendFromHost('resume');
  await waitFor(async () => !(await app()).pauseReasons.includes('host'), { message: 'host resume applied' });
  assert((await app()).loopRunning, 'loop running again after resume');
});

test('mute', async () => {
  await sendFromHost('mute', { muted: true });
  await waitFor(async () => (await app()).hostMuted === true, { message: 'hostMuted' });
  assertEqual((await app()).effectiveMuted, true, 'effective mute on');
  await sendFromHost('mute', { muted: false });
  await waitFor(async () => (await app()).hostMuted === false, { message: 'hostMuted off' });
});

test('setLocale TR ↔ EN', async () => {
  await sendFromHost('setLocale', { lang: 'en' });
  await waitFor(async () => (await app()).lang === 'en', { message: 'lang en' });
  assertEqual(await frame.evaluate(() => document.documentElement.lang), 'en', '<html lang>');
  await sendFromHost('setLocale', { lang: 'tr' });
  await waitFor(async () => (await app()).lang === 'tr', { message: 'lang tr' });
});

test('setSafeArea', async () => {
  await sendFromHost('setSafeArea', { top: 47, right: 0, bottom: 34, left: 0 });
  await waitFor(async () => (await app()).safeArea.top === 47, { message: 'safe area top' });
  const css = await frame.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--host-safe-bottom').trim());
  assertEqual(css, '34px', '--host-safe-bottom');
});

test('setQuality every tier + auto', async () => {
  for (const tier of ['low', 'medium', 'high', 'ultra']) {
    await sendFromHost('setQuality', { tier });
    await waitFor(async () => {
      const a = await app();
      return a.quality === tier && a.tier === tier;
    }, { message: `quality ${tier}` });
  }
  await sendFromHost('setQuality', { tier: 'auto' });
  await waitFor(async () => (await app()).quality === 'auto', { message: 'quality auto' });
});

test('setProfile', async () => {
  await sendFromHost('setProfile', { displayName: 'Ayşe', avatarUrl: 'data:image/png;base64,AA==' });
  await waitFor(async () => (await app()).hostProfile.displayName === 'Ayşe', { message: 'host profile name' });
});

test('back with no open layer → exit', async () => {
  const before = (await hostMessages('exit')).length;
  const layers = (await app()).layers;
  assertEqual(layers, [], 'no layers open in the menu');
  await sendFromHost('back');
  await waitFor(async () => (await hostMessages('exit')).length > before, { message: 'exit after back' });
});

test('every game → host event type arrives as an exact envelope', async () => {
  const samples = {
    started: { mode: 'career' },
    ended: { mode: 'career', score: 48210, stars: 3, durationSec: 92.4, result: 'landed' },
    haptic: { pattern: 'medium' },
    share: { text: 'KANAT · Günün Rotası #214 🪂 2:07.4 · ⭐⭐⭐', mimeType: 'image/png' },
    analytics: { name: 'route_end', params: { route: 'w1r1', stars: 3 } },
    'storage:set': { key: 'e2e.key', value: '{"a":1}' },
    'storage:get': { key: 'e2e.key', id: 'e2e-1' },
    exit: {},
    perf: { tier: 'high', fpsP50: 60, fpsP90: 57.5 },
    error: { message: 'e2e synthetic error', fatal: false },
  };
  for (const [type, payload] of Object.entries(samples)) {
    const before = (await hostMessages(type)).length;
    const ok = await frame.evaluate(([t, p]) => window.__game.emit(t, p), [type, payload]);
    assert(ok === true, `${type}: bridge.send returned ${ok}`);
    const got = await waitFor(async () => {
      const list = await hostMessages(type);
      return list.length > before ? list[list.length - 1] : null;
    }, { message: `${type} at host` });
    assertEqual({ v: got.v, game: got.game, type: got.type, payload: got.payload }, { v: 1, game: 'kanat', type, payload }, `${type} envelope`);
  }
  // storage:get above was answered by the host with storage:value (same id)
  const log = await host.evaluate(() => window.hostDemo.state.log.filter((e) => e.dir === 'in' && e.msg.type === 'storage:value').map((e) => e.msg));
  assert(log.some((m) => m.payload.id === 'e2e-1' && m.payload.value === '{"a":1}'), 'host answered storage:get with storage:value');
});

test('haptic + share helpers go to the host when one exists', async () => {
  const before = (await hostMessages('haptic')).length;
  const res = await frame.evaluate(async () => {
    // the bridge singleton is exposed through window.GameBridge; use the test emitters for helpers
    return window.__game.emit('haptic', { pattern: [10, 40, 10] });
  });
  assert(res === true, 'haptic delivered');
  await waitFor(async () => (await hostMessages('haptic')).length > before, { message: 'haptic at host' });
});

test('storage round-trip: settings persisted at the host survive a cleared cache', async () => {
  await sendFromHost('setLocale', { lang: 'en' });
  await waitFor(
    async () => host.evaluate(() => (window.hostDemo.state.storage.get('kanat.settings') || '').includes('"lang":"en"')),
    { message: 'kanat.settings stored at host with lang en', timeout: 5000 },
  );
  // wipe the game's local cache (same origin as the host page in this demo → only kanat.* keys)
  await frame.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('kanat.')) localStorage.removeItem(k);
  });
  const getsBefore = (await hostMessages('storage:get')).length;
  await host.evaluate(() => window.hostDemo.reload());
  await sleep(300);
  frame = await gameFrame();
  await waitGameReady(frame);
  const a = await app();
  assertEqual(a.lang, 'en', 'lang restored from host storage');
  assertEqual(a.hostStorage, true, 'host storage detected as active');
  const gets = (await hostMessages('storage:get')).slice(getsBefore);
  assert(gets.some((m) => m.payload.key === 'kanat.settings'), 'game asked the host for kanat.settings');
  const answers = await host.evaluate(() => window.hostDemo.state.log.filter((e) => e.dir === 'in' && e.msg.type === 'storage:value').map((e) => e.msg.payload.id));
  for (const g of gets) assert(answers.includes(g.payload.id), `storage:get ${g.payload.id} answered`);
  await sendFromHost('setLocale', { lang: 'tr' });
});

test('no console errors inside host-demo session', async () => {
  const errs = ctx.errors.filter((e) => !e.includes('e2e synthetic error'));
  assertEqual(errs, [], 'console errors');
  assertEqual(ctx.blocked, [], 'external requests');
  await ctx.context.close();
});

test('standalone: no transport, no errors, helpers degrade silently', async () => {
  const s = await openPage(browser, { device: 'mi9t' });
  await s.page.goto(`${BASE_URL}/${GAME_PAGE}?test=1`);
  await waitGameReady(s.page);
  const a = await s.page.evaluate(() => window.__game.app());
  assertEqual(a.bridge.transport, 'none', 'standalone transport');
  assertEqual(a.store, 'local', 'local storage store in standalone');
  const r = await s.page.evaluate(() => [window.__game.emit('haptic', { pattern: 'light' }), window.__game.emit('exit', {})]);
  assertEqual(r, [false, false], 'sends are silent no-ops without a host');
  // host API still accepts commands in standalone (URL/receive path)
  await s.page.evaluate(() => window.GameBridge.receive(JSON.stringify({ v: 1, game: 'kanat', type: 'setLocale', payload: { lang: 'en' } })));
  await waitFor(async () => (await s.page.evaluate(() => window.__game.app())).lang === 'en', { message: 'receive() in standalone' });
  await sleep(500);
  assertEqual(s.errors, [], 'console errors (standalone)');
  assertEqual(s.blocked, [], 'external requests (standalone)');
  await s.context.close();
});

test('URL params apply on boot (lang, quality, muted, safe area, mode)', async () => {
  const s = await openPage(browser, { device: 'small' });
  await s.page.goto(`${BASE_URL}/${GAME_PAGE}?test=1&lang=en&quality=low&muted=1&safeTop=30&safeBottom=20&mode=suru`);
  await waitGameReady(s.page);
  const a = await s.page.evaluate(() => window.__game.app());
  assertEqual([a.lang, a.quality, a.hostMuted, a.safeArea.top, a.safeArea.bottom, a.deepLinkMode], ['en', 'low', true, 30, 20, 'suru'], 'url params');
  assertEqual(s.errors, [], 'console errors');
  await s.context.close();
});

const failed = await run('bridge');
await browser.close();
process.exit(failed ? 1 : 0);
