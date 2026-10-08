// Interaction smoke test for the UI gallery (navigation, back stack, language switch, perf-panel taps,
// duel validation, HUD parachute visibility). Usage: node dev/ui.interact.mjs [port]
import { launch } from '../tools/shot.mjs';

const port = Number(process.argv[2] ?? 5184);
const base = `http://localhost:${port}/dev/ui.html`;
const browser = await launch();
let failed = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failed++;
};
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const ready = async (url) => {
    await page.goto(url);
    await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 15000 });
  };
  const top = () => page.evaluate(() => window.__ui.top());

  // Menu → Modlar → Kariyer → worlds → routes; back unwinds the stack.
  await ready(`${base}?screen=menu&lang=tr`);
  await page.click('.kn-mgrid--rows .kn-mcard >> nth=0');
  check('menu → modes', (await top()) === 'modes');
  await page.click('.kn-mode-main >> nth=0');
  check('modes → worlds', (await top()) === 'worlds');
  await page.click('.kn-wcard >> nth=0');
  check('worlds → routes', (await top()) === 'routes');
  const hiddenMenu = await page.evaluate(() => getComputedStyle(document.querySelector('[data-screen="menu"]')).visibility);
  check('covered screens hidden', hiddenMenu === 'hidden', hiddenMenu);
  check('back → worlds', (await page.evaluate(() => window.__ui.back())) && (await top()) === 'worlds');
  await page.evaluate(() => window.__ui.back());
  await page.evaluate(() => window.__ui.back());
  check('back to menu', (await top()) === 'menu');
  check('back on menu root returns false', (await page.evaluate(() => window.__ui.back())) === false);

  // Settings: language switch re-renders the stack in English; 5 taps on version → perf panel.
  await page.click('.kn-menu-top-right .kn-btn--icon');
  check('settings opened', (await top()) === 'settings');
  await page.click('.kn-seg button:has-text("English")');
  await page.waitForTimeout(100);
  const title = await page.textContent('[data-screen="settings"] .kn-head-title');
  check('language switch → EN title', title === 'Settings', title ?? '');
  const pressed = await page.getAttribute('.kn-seg button:has-text("English")', 'aria-pressed');
  check('EN segment pressed after re-render', pressed === 'true', String(pressed));
  const ver = page.locator('.kn-version');
  await ver.scrollIntoViewIfNeeded();
  for (let i = 0; i < 5; i++) await ver.click();
  const toast = await page.textContent('.kn-toast-text').catch(() => '');
  check('5 taps on version → openPerfPanel', toast === 'perf panel', toast ?? '');
  await page.click('.kn-set--toggle:has-text("Left-handed")');
  check('left-hand toggle applies root class', await page.evaluate(() => document.documentElement.classList.contains('kn-left')));

  // Duel: invalid then valid code.
  await ready(`${base}?screen=duel&lang=tr`);
  await page.fill('.kn-code-input', 'KNT1-short');
  await page.click('.kn-duel .kn-btn--primary');
  await page.waitForSelector('.kn-error');
  check('duel invalid → error', ((await page.textContent('.kn-error')) ?? '').includes('Kod geçersiz'));
  await page.fill('.kn-code-input', 'KNT1-G214-eJzLSM3JyVcozy_KSQEAGgQEXQ');
  await page.click('.kn-duel .kn-btn--primary');
  await page.waitForSelector('.kn-ghost-line');
  const line = await page.textContent('.kn-ghost-line');
  check('duel ghost card text', line === 'Ayşe’nin hayaleti · Günün Rotası #214 · 2:07.4', line ?? '');

  // HUD: parachute appears only in the landing zone; pause button opens pause; back resumes.
  await ready(`${base}?screen=hud&variant=zone&lang=tr`);
  check('parachute visible in zone', await page.evaluate(() => document.querySelector('.kn-hud-chute').classList.contains('is-on')));
  await ready(`${base}?screen=hud&lang=tr`);
  check('parachute hidden outside zone', !(await page.evaluate(() => document.querySelector('.kn-hud-chute').classList.contains('is-on'))));
  await page.click('.kn-hud-pause');
  check('pause button → pause', (await top()) === 'pause');
  check('HUD hidden under pause', await page.evaluate(() => document.querySelector('.kn-hud').classList.contains('is-hidden')));
  await page.evaluate(() => window.__ui.back());
  check('back closes pause', (await top()) === 'flight');
  check('in-flight back → pause', (await page.evaluate(() => window.__ui.back())) && (await top()) === 'pause');

  // Results: three stars stamped.
  await ready(`${base}?screen=results&lang=tr`);
  const stamped = await page.evaluate(() => document.querySelectorAll('.kn-res-star.is-on').length);
  check('results stars stamped', stamped === 3, String(stamped));
  const sounds = await page.evaluate(() => (window.__sounds ?? []).map((e) => e.type + (e.index ?? e.i ?? '')).join(','));
  check('results sound events (tally/star/reward)', sounds.includes('tally0') && sounds.includes('tallyEnd') && sounds.includes('star0') && sounds.includes('star2') && sounds.includes('reward'), sounds);

  check('no page errors', errors.length === 0, errors.join(' | '));
} finally {
  await browser.close();
}
process.exit(failed ? 1 : 0);
