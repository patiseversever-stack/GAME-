// Etkileşim ölçümü: çek → sürükle-at → botlar; kare kare görüntü alır.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { startServer } from '/home/user/GAME-/tools/dev-server.mjs';
const S = '/tmp/claude-0/-home-user-GAME-/eb259e66-b9d3-5e28-97cf-ac059024af83/scratchpad';
const [, , query = 'mode=okey&seed=7&speed=fast', w = '390', h = '844'] = process.argv;
const server = await startServer(5197);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1.5, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 5).join('\n')));
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errs.push(m.type() + ': ' + m.text()); });
await page.goto('http://localhost:5197/index.html?mute=1&' + query);
await page.waitForFunction(() => document.body.dataset.ready === '1', null, { timeout: 30000 });
const log = (...a) => console.log(...a);
const st = () => page.evaluate(() => { const c = window.__okey.ctl; const s = c.game.state; return { turn: s.turn.seat, needsDraw: s.turn.needsDraw, hand0: s.hands[0].length, stock: s.stock.length, d0: s.discards[0].length, status: s.status, busy: c.busy, myTurn: c.myTurn, rack: c.scene.rack.count }; });
await page.waitForFunction(() => window.__okey.ctl.myTurn, null, { timeout: 40000 });
log('my turn', JSON.stringify(await st()));
const L = await page.evaluate(() => { const L = window.__okey.ctl.scene.L; return { stock: L.stock, pile0: L.piles[0], rack: L.rack.rect, slot0: L.rack.slotCenter(0) }; });
// 1) desteye dokun → çek; kare kare
const shots = [];
const shoot = async (name) => { const p = `${S}/shots/flow_${name}.png`; await page.screenshot({ path: p }); shots.push(p); };
await shoot('0_before');
await page.touchscreen.tap(L.stock.cx, L.stock.cy);
for (let i = 1; i <= 5; i++) { await page.waitForTimeout(70); await shoot(`1_draw_${i}`); }
await page.waitForTimeout(500);
log('after draw', JSON.stringify(await st()));
await shoot('2_drawn');
// 2) ilk taşı sürükleyerek at (parmak ofseti!) — fare ile
const c0 = await page.evaluate(() => { const L = window.__okey.ctl.scene.L; const i = window.__okey.ctl.scene.rack.slots.findIndex((t) => t !== null); return L.rack.slotCenter(i); });
await page.mouse.move(c0.x, c0.y);
await page.mouse.down();
await page.mouse.move(c0.x + 10, c0.y - 20, { steps: 3 });
await page.waitForTimeout(80);
await shoot('3_dragging');
await page.mouse.move(L.pile0.cx, L.pile0.cy + 30, { steps: 12 });
await page.waitForTimeout(120);
await shoot('4_over_pile');
await page.mouse.up();
for (let i = 1; i <= 6; i++) { await page.waitForTimeout(60); await shoot(`5_discard_${i}`); }
await page.waitForTimeout(800);
log('after discard', JSON.stringify(await st()));
await page.waitForTimeout(3500);
log('bots', JSON.stringify(await st()));
await shoot('6_bots');
if (errs.length) console.log('HATALAR:\n' + errs.slice(0, 8).join('\n'));
console.log(shots.join('\n'));
await browser.close(); server.close();
