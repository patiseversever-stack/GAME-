// eski→yeni tablo: node tablo.mjs <eski.json> <yeni.json>
import { readFileSync } from 'node:fs';
const [a, b] = process.argv.slice(2).map((f) => JSON.parse(readFileSync(f, 'utf8')));
const KAT = { tarih: 'Tarih', cografya: 'Coğrafya', sanat: 'Sanat ve Edebiyat', bilim: 'Bilim', spor: 'Spor', eglence: 'Genel Kültür' };
const n = (x) => x.toLocaleString('tr-TR');
const fark = (x, y) => (y - x > 0 ? '+' + n(y - x) : y - x < 0 ? '−' + n(x - y) : '0');
const out = [];
out.push('KATEGORİ');
for (const k of Object.keys(KAT)) out.push([KAT[k], n(a.kat[k]), n(b.kat[k]), fark(a.kat[k], b.kat[k])].join(' | '));
out.push(['TOPLAM', n(a.toplam), n(b.toplam), fark(a.toplam, b.toplam)].join(' | '));
out.push('', 'ZORLUK');
for (const z of ['1', '2', '3']) out.push([z, n(a.zor[z]), n(b.zor[z]), fark(a.zor[z], b.zor[z]), '%' + ((100 * b.zor[z]) / b.toplam).toFixed(1)].join(' | '));
out.push('', 'TİP (artana göre)');
const tipler = Object.keys(b.tip).sort((x, y) => b.tip[y] - (a.tip[y] || 0) - (b.tip[x] - (a.tip[x] || 0)));
for (const t of tipler) out.push([t, n(a.tip[t] || 0), n(b.tip[t]), fark(a.tip[t] || 0, b.tip[t])].join(' | '));
console.log(out.join('\n'));
