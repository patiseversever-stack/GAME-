// İpucu açılma taraması: node tools/soru/ipucu_acik.mjs
// İpuçlu ilçe kökleri (tools/veri/pilot/ilce_secim.txt 5. alan) bankadaki başka bir sorunun cevabını açıyor mu: cevabı o ilçe
// olan ve kökünde/şıklarında ipucunun özel adı geçen sorular listelenir (BRIF.md §12). Her bulgu elle okunur: ortak
// kelime ("adası") açılma değilse geçilir, gerçek açılmada ipucu değiştirilir.
process.chdir(new URL('../..', import.meta.url).pathname);
await import('../../test/kanca.mjs');
const fs = await import('node:fs');
const { BANK } = await import('../../src/data/bank.js');
const kucuk = (s) => s.toLocaleLowerCase('tr-TR');
const sec = fs.readFileSync('tools/veri/pilot/ilce_secim.txt', 'utf8').split('\n').filter((l) => l && !l.startsWith('#')).map((l) => l.split('|').map((x) => x.trim())).filter((f) => f[4]);
const metin = (q) => kucuk([q.q, ...(Array.isArray(q.a) ? q.a : []), q.f, q.info, q.b, q.alt, q.note, ...(q.clues || []), ...(q.hints || [])].filter(Boolean).join(' | '));
let n = 0;
for (const [ad, il, z, goster, ip] of sec) {
	const g = kucuk(goster || ad);
	const ozel = (ip.match(/[A-ZÇĞİÖŞÜ][\p{L}-]+/gu) || []).map((w) => kucuk(w.replace(/'.*$/, ''))).filter((w) => w.length >= 4);
	const kel = ozel.length ? ozel : ip.split(/\s+/).map((w) => kucuk(w.replace(/'.*$/, ''))).filter((w) => w.length >= 6);
	for (const b of BANK) {
		if (/-wd-/.test(b.id)) continue;
		const dogru = kucuk(String(Array.isArray(b.a) ? b.a[0] : (b.ans ?? b.w ?? '')));
		if (!(dogru === g || dogru.startsWith(g + ' ') || dogru.endsWith(' ' + g))) continue;
		const m = metin(b);
		const ortak = kel.filter((w) => m.includes(w));
		if (ortak.length) (n++, console.log(`${ad} [${ip}] ↔ ${b.id}: ${b.q} → ${dogru}  (ortak: ${ortak.join(',')})`));
	}
}
console.log(n + ' olası açılma');
