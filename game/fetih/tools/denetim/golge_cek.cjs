// Gölge Oyunu perde çekimi (gerçek WebGL; SwiftShader yavaşsa GPU=1 dene):  node tools/denetim/golge_cek.cjs <html> <kimlik,kimlik> <çıktı> [GxY]
const { chromium } = require('playwright');
const path = require('path');
const [html, ids, out, sz = '412x915'] = process.argv.slice(2);
(async () => {
	const [W, H] = sz.split('x').map(Number);
	const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
	for (const id of ids.split(',')) {
		const p = await b.newPage({ viewport: { width: W, height: H } });
		if (process.env.GPU) await p.addInitScript(() => {
			const gp = WebGLRenderingContext.prototype.getParameter;
			const g2 = WebGL2RenderingContext.prototype.getParameter;
			const fake = function (orig) { return function (x) { if (x === 0x9246) return 'ANGLE (Apple, Apple M1 Pro, OpenGL 4.1)'; if (x === 0x9245) return 'Apple'; return orig.call(this, x); }; };
			WebGLRenderingContext.prototype.getParameter = fake(gp);
			WebGL2RenderingContext.prototype.getParameter = fake(g2);
		});
		await p.goto('file://' + path.resolve(html) + '#golge@' + id, { timeout: 180000 });
		await p.waitForFunction(() => document.querySelector('.fl-q.on .fl-qbody > *'), null, { timeout: 400000, polling: 250 });
		for (const t of [10, 18, 24]) {
			await p.waitForTimeout(t === 10 ? 10000 : t === 18 ? 8000 : 6000);
			await p.screenshot({ path: path.join(out, `golge_${id}_${t}s.png`), timeout: 180000 });
		}
		await p.evaluate(() => document.querySelector('.fl-q.on .fl-opt')?.click());
		await p.waitForTimeout(6000);
		await p.screenshot({ path: path.join(out, `golge_${id}_cevap.png`), timeout: 180000 });
		console.log(id, 'tamam');
		await p.close();
	}
	await b.close();
})();
