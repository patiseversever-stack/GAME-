// UI gallery screenshot + automated checks (overflow, off-screen, touch targets ≥ 44, safe areas, page errors).
// Usage: node dev/ui.shots.mjs <outDir> [filter] [--dpr=2] [--port=5184]
// Requires `npx vite --port 5184` running in games/kanat.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from '../tools/shot.mjs';

const args = process.argv.slice(2);
const outDir = args[0] ?? 'tests/out/ui';
const filter = args[1] && !args[1].startsWith('--') ? args[1] : '';
const dpr = Number((args.find((a) => a.startsWith('--dpr=')) ?? '--dpr=2').slice(6));
const port = Number((args.find((a) => a.startsWith('--port=')) ?? '--port=5184').slice(7));
const langs = (args.find((a) => a.startsWith('--langs=')) ?? '--langs=tr,en').slice(8).split(',');
const orients = (args.find((a) => a.startsWith('--orient=')) ?? '--orient=p,l').slice(9).split(',');
mkdirSync(outDir, { recursive: true });

export const SCREENS = [
  'loading', 'menu', 'menu&variant=new', 'worlds', 'worlds&variant=erciyes', 'routes', 'modes', 'modes&variant=locked', 'suru', 'daily',
  'duel', 'duel&variant=card', 'duel&variant=invalid', 'duel&variant=version', 'pause', 'results', 'results&variant=daily', 'results&variant=half',
  'results&variant=duel', 'settings', 'collection', 'collection&variant=wardrobe', 'collection&variant=badges', 'photo', 'photo&variant=filter',
  'unlock', 'unlock&variant=world', 'help', 'inverted', 'assistOff', 'resume', 'toast', 'hud', 'hud&variant=zone', 'hud&variant=daily',
  'hud&variant=ftue-jump', 'hud&variant=ftue-drag', 'hud&variant=ftue-chute', 'hud&variant=ftue-flare', 'hud&variant=warn', 'hud&variant=x0',
];

const CHECK = () => {
  const vw = innerWidth;
  const vh = innerHeight;
  const cs = getComputedStyle(document.documentElement);
  const px = (v) => parseFloat(v) || 0;
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;top:var(--kn-safe-top);left:var(--kn-safe-left);right:var(--kn-safe-right);bottom:var(--kn-safe-bottom);pointer-events:none';
  document.body.appendChild(probe);
  const pr = probe.getBoundingClientRect();
  probe.remove();
  const safe = { top: pr.top, left: pr.left, right: vw - pr.right, bottom: vh - pr.bottom };
  const issues = [];
  const root = document.querySelector('.kn-ui');
  if (!root) return { issues: ['no .kn-ui'], safe };
  const visible = (el) => {
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) === 0) return false;
    let p = el.parentElement;
    while (p) {
      const ps = getComputedStyle(p);
      if (ps.display === 'none' || ps.visibility === 'hidden' || Number(ps.opacity) === 0) return false;
      p = p.parentElement;
    }
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const inScroller = (el) => !!el.closest('.kn-hscroll, .kn-scroll');
  const label = (el) => `${el.tagName.toLowerCase()}.${String(el.className.baseVal ?? el.className).split(' ').slice(0, 2).join('.')} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 28)}"`;
  // 1. text overflow (clipped text) — any element whose content is wider than its box
  for (const el of root.querySelectorAll('*')) {
    if (!(el instanceof HTMLElement) || !visible(el)) continue;
    if (el.closest('.kn-hscroll') && el.classList.contains('kn-hscroll')) continue;
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (hasText && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight * 1.12 + 2) && getComputedStyle(el).overflow !== 'visible') issues.push(`clip ${label(el)} ${el.scrollWidth}>${el.clientWidth}`);
    // 2. off-screen horizontally (not inside a scroller)
    const r = el.getBoundingClientRect();
    if (!inScroller(el) && hasText && (r.left < -1 || r.right > vw + 1)) issues.push(`offscreen ${label(el)} [${Math.round(r.left)},${Math.round(r.right)}]`);
  }
  // 3. touch targets + safe area for interactive elements
  for (const el of root.querySelectorAll('button, [role="button"], input, textarea, a')) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    if (el.closest('.kn-hud-ftue')) continue;
    if (r.width < 43.5 || r.height < 43.5) issues.push(`target ${label(el)} ${Math.round(r.width)}x${Math.round(r.height)}`);
    const sc = el.closest('.kn-scroll, .kn-hscroll');
    if (sc) {
      const sr = sc.getBoundingClientRect();
      if (r.bottom < sr.top || r.top > sr.bottom || r.right < sr.left || r.left > sr.right) continue; // scrolled out of view: fine
      if (sc.classList.contains('kn-hscroll') && (r.left < sr.left - 1 || r.right > sr.right + 1)) continue; // partially scrolled
    }
    if (r.top < safe.top - 0.5 || r.left < safe.left - 0.5 || r.right > vw - safe.right + 0.5 || (r.bottom > vh - safe.bottom + 0.5 && !sc)) issues.push(`safe ${label(el)} [${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}]`);
  }
  return { issues, safe };
};

const browser = await launch();
const report = {};
try {
  const list = SCREENS.filter((s) => !filter || s.includes(filter));
  for (const orient of orients) {
    const [w, h] = orient === 'p' ? [390, 844] : [844, 390];
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error' && !m.text().includes('favicon')) errors.push(m.text());
    });
    page.on('requestfailed', (r) => { if (!r.url().includes('?t=')) errors.push(`reqfail ${r.url()}`); });
    page.on('response', (r) => {
      if (r.status() >= 400 && !r.url().includes('favicon')) errors.push(`${r.status()} ${r.url()}`);
    });
    for (const lang of langs) {
      for (const s of list) {
        errors.length = 0;
        const url = `http://localhost:${port}/dev/ui.html?screen=${s}&lang=${lang}${process.env.UIQ ?? ''}`;
        await page.goto(url, { waitUntil: 'load' });
        try {
          await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 15000 });
        } catch {
          errors.push('timeout waiting __shotReady');
        }
        await page.waitForTimeout(900);
        const name = `${s.replace('&variant=', '-')}_${lang}_${orient}`;
        await page.screenshot({ path: join(outDir, `${name}.png`) });
        const res = await page.evaluate(CHECK);
        const all = [...res.issues, ...errors.map((e) => `error ${e}`)];
        report[name] = all;
        console.log(`${name}: ${all.length ? all.length + ' issue(s)' : 'ok'}`);
        for (const i of all.slice(0, 12)) console.log(`   - ${i}`);
      }
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}
writeFileSync(join(outDir, 'report.json'), JSON.stringify(report, null, 2));
