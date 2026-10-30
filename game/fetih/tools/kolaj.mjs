// Görsel kolajı: birkaç ekran görüntüsünü etiketleriyle tek bir ızgarada birleştirir (JPEG; boyut sınırı için kalite
// kendiliğinden düşürülür).
//
//   node tools/kolaj.mjs çıktı.jpg [--cols=4] [--w=1400] [--max=340] [--title="…"] [--crop=0.35,1] a.png:Etiket b.png:Etiket …
//   Satır başlığı: "--row=ESKİ" gibi bir argüman sonraki görsellerin satırını başlatır (eski | yeni kıyası için
//   --pairs: görseller ikişer ikişer [eski, yeni] dizilir, üstte ESKİ / YENİ başlıkları).
//   --crop=y0,y1: her görüntünün yalnız bu dikey dilimi (0..1) gösterilir (kartın altındaki harita alanı gibi).
import { chromium } from 'playwright-core';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const out = resolve(args.find((a) => !a.startsWith('--') && /\.(jpe?g|png)$/i.test(a) && !a.includes(':')) || 'kolaj.jpg');
const opt = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')).map(([k, ...v]) => [k, v.join('=') || '1']));
const items = args.filter((a) => !a.startsWith('--') && a.includes(':') && resolve(a) !== out);
const cols = Number(opt.cols || 4);
const W = Number(opt.w || 1400);
const max = Number(opt.max || 340) * 1024;
const [c0, c1] = (opt.crop || '0,1').split(',').map(Number);
const cells = items.map((s) => {
	const i = s.lastIndexOf(':');
	const f = resolve(s.slice(0, i));
	return { src: existsSync(f) ? 'data:image/png;base64,' + readFileSync(f).toString('base64') : null, label: s.slice(i + 1) };
});
const cell = (c) =>
	`<figure><div class="im">${c.src ? `<img src="${c.src}">` : '<div class="no">YOK</div>'}</div><figcaption>${c.label}</figcaption></figure>`;
const pairs = 'pairs' in opt;
const body = pairs
	? `<div class="hd"><b class="o">ESKİ</b><b class="n">YENİ</b><b class="o">ESKİ</b><b class="n">YENİ</b></div><div class="g" style="grid-template-columns:repeat(4,1fr)">${cells.map(cell).join('')}</div>`
	: `<div class="g" style="grid-template-columns:repeat(${cols},1fr)">${cells.map(cell).join('')}</div>`;
const page = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;background:#0b1122;font-family:system-ui,sans-serif;color:#fff;width:${W}px}
h1{margin:0;padding:14px 18px 4px;font-size:26px;letter-spacing:.04em}
.hd{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:6px 14px 0}
.hd b{font-size:22px;letter-spacing:.14em;text-align:center}.hd .o{color:#ff8a78}.hd .n{color:#7dff9a}
.g{display:grid;gap:10px;padding:10px 14px 14px}
figure{margin:0;background:#141c33;border-radius:12px;overflow:hidden}
.im{position:relative;overflow:hidden;aspect-ratio:412/${Math.round(892 * (c1 - c0))}}
.im img{position:absolute;left:0;width:100%;top:${(-c0 / (c1 - c0)) * 100}%;}
.no{display:grid;place-items:center;height:100%;color:#8fa0c8;font-size:22px}
figcaption{padding:6px 10px 8px;font-size:15px;font-weight:600;color:#dfe7ff}
</style>${opt.title ? `<h1>${opt.title}</h1>` : ''}${body}`;
const exe =
	process.env.CHROMIUM ||
	['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', '/opt/pw-browsers/chromium/chrome-linux64/chrome'].find((p) => existsSync(p));
const browser = await chromium.launch({ executablePath: exe });
const p = await browser.newPage({ viewport: { width: W, height: 600 } });
await p.setContent(page);
let q = 86;
for (;;) {
	await p.screenshot({ path: out, fullPage: true, type: out.endsWith('.png') ? 'png' : 'jpeg', ...(out.endsWith('.png') ? {} : { quality: q }) });
	const sz = statSync(out).size;
	if (out.endsWith('.png') || sz <= max || q <= 40) {
		console.log(`kolaj: ${out} (${Math.round(sz / 1024)} KB, kalite ${q})`);
		break;
	}
	q -= 6;
}
await browser.close();
