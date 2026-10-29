// Eski / yeni kıyası: iki derlemede aynı maç anlarını çeker ve tek bir görselde yan yana dizer
// (her satır bir an: solda ESKİ, sağda YENİ). Kullanıcıya her işten sonra gösterilen görsel budur.
//
//   node tools/kiyas.mjs çıktı.png [--eski=REF|dosya.html] [--yeni=dosya.html] [--only=a_secim,c_saldiri,d3_soru]
//                        [--q=1 --mode=ffa3 --region=ege --seed=7 --work=dizin]
//   --only içinde "eski~yeni" bir satırda iki farklı çekimi yan yana koyar (süreleri farklı anlar için: eski
//   savaş 2 sn, yeni film 6 sn; ör. s_savas_1~s_savas_3)
//
//   --eski  git referansı (vars. HEAD~1; o sürümün dist/FetihLigi.html'i) ya da bir .html dosyası
//   --yeni  vars. dist/FetihLigi.html (önce `node build.mjs`)
// Çekimler tools/flow.mjs ile alınır (aynı tohum, aynı oyuncu seçimleri). Bir anda eski sürümde yoksa
// (yeni özellik) solda "YOKTU" yazar.
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const out = resolve(process.argv.slice(2).find((a) => !a.startsWith('--')) || 'kiyas.png');
const opt = Object.fromEntries(process.argv.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const pairs = (opt.only || 'a_secim,c_saldiri,d3_soru').split(',').map((n) => (n.includes('~') ? n.split('~') : [n, n]));
const only = [...new Set(pairs.flat())];
const work = opt.work ? resolve(opt.work) : mkdtempSync(join(tmpdir(), 'kiyas-')); // --work: çekimler hazırsa yeniden kullan

function htmlOf(ref, name) {
	if (ref.endsWith('.html')) return resolve(ref);
	const file = join(work, name + '.html');
	writeFileSync(file, execFileSync('git', ['show', `${ref}:./dist/FetihLigi.html`], { maxBuffer: 64 << 20 }));
	return file;
}
const eski = htmlOf(opt.eski || 'HEAD~1', 'eski');
const yeni = resolve(opt.yeni || 'dist/FetihLigi.html');

const pass = ['q', 'mode', 'region', 'seed', 'w', 'h'].filter((k) => opt[k]).map((k) => `--${k}=${opt[k]}`);
for (const [name, html] of [['eski', eski], ['yeni', yeni]]) {
	if (opt.work && existsSync(join(work, name))) continue;
	console.log(`${name}: çekimler…`);
	try {
		execFileSync('node', ['tools/flow.mjs', join(work, name), `--html=${html}`, `--only=${only.join(',')}`, ...pass], { stdio: 'inherit', timeout: 15 * 60e3 });
	} catch (e) {
		console.log(`${name}: akış yarıda kaldı (${e.message.split('\n')[0]}); alınan çekimlerle sürüyor`);
	}
}

// yan yana dizim: tarayıcıda basit bir sayfa, tek ekran görüntüsü
const img = (dir, n) => {
	const f = join(work, dir, n + '.png');
	return existsSync(f) ? 'data:image/png;base64,' + readFileSync(f).toString('base64') : null;
};
const rows = pairs
	.map(([na, nb]) => ({ a: img('eski', na), b: img('yeni', nb) }))
	.filter((r) => r.a || r.b)
	.map(
		(r) => `<div class="r"><div class="c">${r.a ? `<img src="${r.a}">` : '<div class="no">YOKTU</div>'}</div><div class="c">${r.b ? `<img src="${r.b}">` : '<div class="no">—</div>'}</div></div>`,
	)
	.join('');
const page = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;background:#0b1122;font-family:system-ui,sans-serif;color:#fff}
.h{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:14px 16px 6px}
.h b{font-size:34px;letter-spacing:.12em;text-align:center}
.h b:first-child{color:#ff8a78}.h b:last-child{color:#7dff9a}
.r{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:8px 16px}
.c img{display:block;width:100%;border-radius:14px}
.no{display:grid;place-items:center;aspect-ratio:412/892;border-radius:14px;background:#1a2340;font-size:28px;color:#8fa0c8;letter-spacing:.1em}
</style><div class="h"><b>ESKİ</b><b>YENİ</b></div>${rows}`;
const exe =
	process.env.CHROMIUM ||
	['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', '/opt/pw-browsers/chromium/chrome-linux64/chrome'].find((p) => existsSync(p));
const browser = await chromium.launch({ executablePath: exe });
const p = await browser.newPage({ viewport: { width: 860, height: 600 } });
await p.setContent(page);
await p.screenshot({ path: out, fullPage: true, type: out.endsWith('.jpg') ? 'jpeg' : 'png', ...(out.endsWith('.jpg') ? { quality: 82 } : {}) });
await browser.close();
console.log('kıyas: ' + out);
