// AZ BİLİNEN (deneme): Pointless tarzı çok cevaplı soru ("Ege Bölgesi'nden bir il"). Doğru cevaplar arasında en
// az seçilen en çok puanı alır: puan = 100 − seçilme yüzdesi; yanlış cevap 0. "İzmir" diyen güvende ama az puanlı,
// "Uşak" diyen kahraman. Listede tuzaklar da var (Balıkesir Marmara'da, Sultanahmet Sinan'ın değil).
//
// Seçilme yüzdeleri: çevrimdışında ve galeride elle konmuş TAHMİNİ oranlar (100 kişiden kaçının aklına gelir:
// tanınırlık tahmini); ekranda "tahmini oran" diye yazar. Çevrimiçinde gerçek oyuncu seçimlerinden birikir (sunucu
// istatistiği) ve bu değerlerin yerini alır.
//
// Veri: ans: [[ad, tahmini %, ...eşanlamlar]], wrong: [tuzak ad, …] (liste = ikisinin birleşimi, alfabetik).
// Değer: seçilen listedeki sıra (v.pool). Tür 'closest': err = seçilme yüzdesi (yanlış 100); correct = doğru cevap.
// Çevrimiçi: publicView yalnız listeyi taşır (hangisinin doğru olduğu ve oranlar cevapta gelir).
// Giriş: liste + arama (Türkçe harf ve küçük yazım hatası duyarsız: "usak", "afyon", "suleymaniye").
// Joker: yarı yarıya → listedeki tuzakların yarısı silinir.

import { css, esc, shuffle, pCorrect, clamp, buzz } from './util.js';
import { botTime } from './timing.js';
import { appOf, stamp, rule, stampLater, sfx, LOOK, ACT } from './d_ortak.js';
import { setTimeout } from '../core/clock.js';

const CSS = /* css */ `
/* KALABALIK ANKETİ: 100 kişiye soruldu; seçenekler oy pusulası gibi akan kartlar. Cevapta senin cevabın için
   "100 kişiden kaçı" nokta tablosu yanar; bütün doğrular en az bilinenden en çok bilinene akar (en nadiri altın taç,
   tuzaklar kırmızı). Liste uzunsa (31 seçeneğe kadar) yalnız liste kendi içinde kayar, başlığıyla görünür kalır. */
.dn-ab{display:flex;flex-direction:column;gap:9px;user-select:none;-webkit-user-select:none}
.fl-q.cover .dn-ab{flex:1 1 auto;min-height:0}
.ab-crowd{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:12px;background:linear-gradient(90deg,rgba(180,91,255,.16),rgba(236,79,147,.1));box-shadow:inset 0 0 0 1.5px rgba(200,140,255,.25)}
.ab-crowd i{flex:none;width:58px;height:26px;background:
  radial-gradient(circle at 50% 30%,#d9b8ff 0 3px,transparent 3.5px) 0 0/10px 13px,
  radial-gradient(ellipse 4px 5px at 50% 95%,#a77ee6 0 99%,transparent) 0 0/10px 13px;opacity:.9}
.ab-crowd span{flex:1;min-width:0;font:500 13px/1.25 'Fredoka',sans-serif;color:#d8ccff}
.ab-crowd b{font-weight:700;color:#fff}
.dn-ab-s{position:relative;flex:none}
.dn-ab-s input{width:100%;height:42px;padding:0 38px 0 14px;border-radius:11px;font:600 16px 'Fredoka',sans-serif;color:#fff;background:#0b0f20;border:2px solid rgba(255,255,255,.18);
  box-shadow:inset 0 3px 0 rgba(0,0,0,.35);outline:none;user-select:text;-webkit-user-select:text}
.dn-ab-s input:focus{border-color:#c79bff;box-shadow:inset 0 3px 0 rgba(0,0,0,.35),0 0 0 3px rgba(180,91,255,.25)}
.dn-ab-s input::placeholder{color:#7f88ad}
.dn-ab-s::after{content:'';position:absolute;right:13px;top:50%;width:13px;height:13px;margin-top:-9px;border:2.5px solid #8f97b8;border-radius:50%}
.dn-ab-s::before{content:'';position:absolute;right:10px;top:50%;width:2.5px;height:8px;margin-top:2px;background:#8f97b8;transform:rotate(-45deg);border-radius:2px}
/* oy pusulaları: içeriği kadar genişleyen, akan kartlar */
.dn-ab-l{flex:0 1 auto;min-height:0;display:flex;flex-wrap:wrap;align-content:flex-start;gap:7px;overflow-y:auto;overscroll-behavior:contain;padding:2px 2px 6px;scrollbar-width:thin;scrollbar-color:rgba(200,160,255,.5) transparent}
.dn-ab-i{flex:0 1 auto;max-width:100%;min-height:38px;padding:6px 12px 7px;border:0;border-radius:9px;text-align:center;font:600 clamp(14px,calc(3.9 * var(--vw)),16px)/1.15 'Fredoka',sans-serif;color:#1d2238;
  background:linear-gradient(180deg,#fffdf6,#efe8d6);box-shadow:0 2px 0 #cbbf9e,0 4px 8px rgba(0,0,0,.3);touch-action:manipulation;transition:transform .08s,opacity .25s;overflow-wrap:anywhere}
.dn-ab-i:active{transform:translateY(2px)}
.dn-ab-i.sel{color:#2a1400;background:linear-gradient(180deg,#fff1b8,#ffcf4a);box-shadow:0 0 0 3px #fff,0 0 0 5.5px #b45bff,0 4px 10px rgba(0,0,0,.35)}
.dn-ab-i.gone{display:none}
.dn-ab-i.top{order:-1}
.dn-ab-none{flex:1 0 100%;padding:10px;text-align:center;font-size:13.5px;color:#9fb0d6}
.dn-ab-f{flex:none;display:flex;align-items:center;gap:10px}
.dn-ab-f span{flex:1;min-width:0;font:500 13px/1.25 'Fredoka',sans-serif;color:#cfd6f0}
.dn-ab-f span b{color:#ffd25a;font-weight:700}
.dn-ab .fl-send{flex:none;width:auto;min-width:118px;height:48px;padding:0 16px;font-size:18px}
/* cevap */
.dn-ab.done .ab-crowd,.dn-ab.done .dn-ab-s,.dn-ab.done .dn-ab-l,.dn-ab.done .dn-ab-f{display:none}
.ab-me{position:relative;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:12px;padding:12px 14px;border-radius:14px;
  background:linear-gradient(135deg,#2a1a4a,#16122a);box-shadow:inset 0 0 0 2px rgba(200,140,255,.35),0 10px 24px rgba(0,0,0,.45);animation:abUp .45s cubic-bezier(.3,1.4,.5,1) both}
.ab-me.gold{background:linear-gradient(135deg,#4a3200,#1e1508);box-shadow:inset 0 0 0 2.5px #ffd25a,0 0 26px rgba(255,200,60,.35),0 10px 24px rgba(0,0,0,.45)}
.ab-me.bad{background:linear-gradient(135deg,#4a120c,#1e0a0a);box-shadow:inset 0 0 0 2.5px #ff5a4a,0 10px 24px rgba(0,0,0,.45)}
.ab-dots{flex:none;width:clamp(64px,calc(22 * var(--vw)),96px);aspect-ratio:1;display:grid;grid-template-columns:repeat(10,1fr);grid-template-rows:repeat(10,1fr);gap:1.6px}
.ab-dots u{border-radius:50%;background:rgba(255,255,255,.14);text-decoration:none}
.ab-dots u.on{background:#ffd25a;box-shadow:0 0 4px rgba(255,210,90,.8);animation:abDot .3s both;animation-delay:calc(var(--k) * 14ms)}
.ab-me.bad .ab-dots u.on{background:#ff6a5a;box-shadow:none}
.ab-tx{min-width:0;display:flex;flex-direction:column;gap:2px}
.ab-tx small{font:italic 900 11px/1 'Barlow Condensed',sans-serif;letter-spacing:.16em;color:#bda8e8}
.ab-tx b{font:400 clamp(19px,calc(5.6 * var(--vw)),24px)/1.05 'Lilita One',sans-serif;color:#fff;overflow-wrap:anywhere}
.ab-tx span{font:500 13px/1.25 'Fredoka',sans-serif;color:#e6dcff}
.ab-tx span em{font-style:normal;font-weight:700;color:#ffd25a}
.ab-me>strong{font:400 34px/1 'Lilita One',sans-serif;color:#ffd25a;text-shadow:0 2px 0 #5a3a00}
.ab-me.bad>strong{color:#ff8a78;text-shadow:0 2px 0 #5a0a00}
.ab-me .fl-who{position:absolute;inset:auto;top:-10px;left:-8px;width:24px;height:24px;margin:0;border-radius:7px}
.ab-me .fl-who+.fl-who{left:12px;right:auto}
.dn-ab-r{display:flex;flex-direction:column;gap:7px;min-height:0}
.dn-ab-h{display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding:0 2px;font:italic 900 11.5px/1 'Barlow Condensed',sans-serif;letter-spacing:.14em;color:#a8a0c8}
.dn-ab-h em{font-style:normal;letter-spacing:.04em;color:#c6a8ff;white-space:nowrap}
.dn-ab-bars{display:flex;flex-wrap:wrap;gap:6px;align-content:flex-start}
.dn-ab-b{position:relative;display:inline-flex;align-items:center;gap:6px;min-height:30px;padding:3px 4px 3px 10px;border-radius:8px;background:#161a30;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.1);
  overflow:hidden;animation:abIn .32s both;animation-delay:calc(var(--k) * 35ms)}
.dn-ab-b>u{position:absolute;left:0;top:0;bottom:0;width:calc(var(--p) * 1%);background:rgba(160,110,255,.22);text-decoration:none}
.dn-ab-b>span{position:relative;font:600 13.5px/1.15 'Fredoka',sans-serif;color:#eef0fa}
.dn-ab-b>em{position:relative;flex:none;padding:2px 6px;border-radius:6px;font-style:normal;font:800 11.5px/1.2 'Fredoka',sans-serif;color:#d8ccff;background:rgba(255,255,255,.08);font-variant-numeric:tabular-nums}
.dn-ab-b.low{background:linear-gradient(90deg,#4a3200,#2a1e08);box-shadow:inset 0 0 0 2px #ffd25a,0 0 14px rgba(255,200,60,.35)}
.dn-ab-b.low>span::before{content:'';display:inline-block;width:14px;height:10px;margin-right:5px;vertical-align:-1px;background:#ffd25a;clip-path:polygon(0 100%,0 20%,25% 55%,50% 0,75% 55%,100% 20%,100% 100%)}
.dn-ab-b.low>em{color:#3a2400;background:#ffd25a}
.dn-ab-b.me{box-shadow:inset 0 0 0 2.5px #fff,0 0 0 2px #b45bff}
.dn-ab-b.bad{background:#3a0e0e;box-shadow:inset 0 0 0 2px #ff5a4a}
.dn-ab-b.bad>em{color:#fff;background:#d53b2c}
.dn-ab-b .fl-who{position:relative;inset:auto;flex:none;width:18px;height:18px;margin:0;border-radius:5px;border-width:2px}
.dn-ab-b .fl-who+.fl-who{right:auto;margin-left:-6px}
.dn-ab-l.more{-webkit-mask:linear-gradient(180deg,#000 calc(100% - 34px),transparent);mask:linear-gradient(180deg,#000 calc(100% - 34px),transparent)}
@media (max-height:720px){.ab-crowd{display:none}.dn-ab-i{min-height:34px;padding:5px 10px 6px}.ab-dots{width:62px}}
/* kısa ekran, cevap: 20+ doğrusu olan soruda (ad toplamı 280 harfe kadar) gövde %64'e küçülüyor, etiketler 7 px'e
   düşüyordu. Kart tek satır ve sıkı, çubuklar alçak ve dar aralıklı; kural yazısı (cevapta işe yaramaz, dar kartta
   kendi satırını kaplar) başlıktan kalkar. Yazı tabanı 12,5 px (rozetler 11 px): küçültme payı büyür. */
/* üst afiş daralmasın: cevap içeriği (küçültülmeden önce) kartı taşırınca afiş esnek öğe olarak 86 px'ten 62 px'e
   sıkışıyor, damga o anki yerleşime göre konuyor; küçültme gelince afiş açılıp her şey 24 px aşağı kayıyor, damga
   başlıktaki yazının üstünde kalıyordu (asıl düzeltme ortak: styles-arena .fl-qwho{flex:none}) */
.fl-q.cover.t-azbilinen .fl-qwho{flex:none}
@media (max-height:720px){
  .fl-q.cover.t-azbilinen.rv .fl-rule{display:none}
  .dn-ab{gap:7px}
  .ab-me{gap:10px;padding:8px 11px;border-radius:12px}
  .ab-dots{width:54px;gap:1.2px}
  .ab-tx b{font-size:clamp(17px,calc(5 * var(--vw)),21px)}
  .ab-tx span{font-size:12.5px}
  .ab-me>strong{font-size:30px}
  .dn-ab-r{gap:5px}
  .dn-ab-bars{gap:4px}
  .dn-ab-b{gap:5px;min-height:26px;padding:2px 3px 2px 8px;border-radius:7px}
  .dn-ab-b>span{font-size:12.5px;line-height:1.12}
  .dn-ab-b>em{padding:1px 5px;font-size:11px}
  /* çok doğrulu soruda (9+ çip) çipler iki sütunlu ızgara, uzun ad hücresinde sarar. Akan çipler dar ekranda satıra birer
     dizilip boyu genişliğe çok bağlıyordu: _coverFit ölçeği tek adımda (1 ölçekteki boydan) kestiriyor, küçültünce
     satırlar kısalınca gövde yarı boş kalıyordu (ek-ab-0013: 0,71, altta 80 px boşluk) */
  .dn-ab-bars:has(>.dn-ab-b:nth-child(9)){display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}
  .dn-ab-bars:has(>.dn-ab-b:nth-child(9))>.dn-ab-b>span{flex:1 1 auto;min-width:0}
}
/* en kısa ekran (320×568): 16–24 doğrulu soruda çipler satıra ikişer sığsın diye alçak ve sık (yazı 12 px, rozet
   10,5 px); kart da sıkışır */
@media (max-height:600px){
  .ab-me{gap:8px;padding:6px 9px}
  .ab-dots{width:46px;gap:1px}
  .ab-tx b{font-size:17px}
  .ab-tx span{font-size:12px}
  .ab-me>strong{font-size:26px}
  .dn-ab-bars{gap:2px 3px}
  .dn-ab-b{gap:4px;min-height:19px;padding:1px 2px 1px 7px;border-radius:6px}
  .dn-ab-b>span{font-size:12px;line-height:1.1}
  .dn-ab-b>em{padding:0 4px;font-size:10.5px;line-height:1.35}
  .dn-ab-b .fl-who{width:15px;height:15px}
}
/* girişler yukarıdan: aşağı kayan parça gövdenin altından taşıp _coverFit'i boş yere küçültmeye zorlar (taşma ölçüsü
   animasyon sürerken alınır, bitince yeniden alınmaz); yukarı taşma ölçüye girmez */
@keyframes abIn{from{transform:translateY(-6px) scale(.96)}}
@keyframes abUp{from{transform:translateY(-10px) scale(.97)}}
@keyframes abDot{from{transform:scale(0)}}
`;

/** Arama için sadeleştir: küçük harf, Türkçe harfler düz, harf ve rakam dışı yok. */
export const sade = (s) =>
	String(s ?? '')
		.toLocaleLowerCase('tr-TR')
		// sayfa windows-1252 okunabilir: düzenli ifadede ASCII dışı harf yok (esbuild dizeleri kaçışlar, düzenli ifadeyi değil)
		.replace(/[\u00E7\u011F\u0131\u00F6\u015F\u00FC\u00E2\u00EE\u00FB]/g, (c) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' })[c])
		.replace(/[^a-z0-9]/g, '');

function lev(a, b) {
	if (a === b) return 0;
	const m = a.length;
	const n = b.length;
	let prev = Array.from({ length: n + 1 }, (_, j) => j);
	for (let i = 1; i <= m; i++) {
		const cur = [i];
		for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
		prev = cur;
	}
	return prev[n];
}

/**
 * Yazım hatasına dayanıklı arama: sorgu bir adın (ya da eşanlamının) herhangi bir kelimesinin başıyla en çok
 * ⌊uzunluk/4⌋ harf farkla eşleşirse ya da adın içinde geçerse bulunur. Dönen: uyan sıralar (iyi eşleşen önce).
 */
export function ara(names, query, alias = []) {
	const q = sade(query);
	if (!q) return names.map((_, i) => i);
	const tol = Math.floor(q.length / 4);
	const hits = [];
	names.forEach((name, i) => {
		let best = 99;
		for (const full of [name, ...(alias[i] || [])]) {
			const s = sade(full);
			if (s.includes(q)) best = Math.min(best, s.startsWith(q) ? 0 : 1);
			// kelime kelime ve boşluksuz bütün ad ("neilarmstrng") üzerinden
			for (const w of [...String(full).split(/[\s'\u2019-]+/), full]) {
				const sw = sade(w);
				if (!sw) continue;
				const d = Math.min(lev(q, sw.slice(0, q.length)), lev(q, sw.slice(0, q.length + 1)), lev(q, sw));
				if (d <= tol) best = Math.min(best, 1 + d);
			}
		}
		if (best < 99) hits.push([best, i]);
	});
	return hits.sort((a, b) => a[0] - b[0] || a[1] - b[1]).map((h) => h[1]);
}

const pick = (v, value) => (Number.isInteger(value) && value >= 0 && value < v.pool.length ? value : -1);

export const azbilinen = {
	time: 30,
	label: 'Az Bilinen',
	kind: 'closest',
	cover: true, // tam ekran kalabalık anketi
	keep: true,
	jokers: ['yari'],
	fmt: (v, value) => {
		const i = pick(v, value);
		return i < 0 || v.pct[i] < 0 ? '0 puan' : `${100 - v.pct[i]} puan`;
	},
	sub: (v, value) => {
		const i = pick(v, value);
		if (i < 0) return 'cevap yok';
		return v.pct[i] < 0 ? `${v.pool[i]} · yanlış` : v.pool[i];
	},
	prepare(q) {
		const items = [...q.ans.map(([n, p, ...al]) => ({ n, p, al })), ...q.wrong.map((n) => ({ n, p: -1, al: [] }))].sort((a, b) => a.n.localeCompare(b.n, 'tr'));
		const v = { q, pool: items.map((x) => x.n), alias: items.map((x) => x.al), pct: items.map((x) => x.p) };
		return stamp(v, q, (q2, k, P, text) => {
			text(v.pool.join(' '), 0.3); // listeyi göz gezdirerek tarar
			return {
				look: LOOK.orient + v.pool.length * 0.12,
				// doğruları hatırla, hangisinin az bilindiğini tart
				think: P.think[0] + P.think[1] * k,
				act: 2 * ACT.tap + ACT.confirm + 1, // kaydır ya da ara
			};
		});
	},
	mount(el, v, api) {
		css('azbilinen', CSS);
		const app = appOf();
		el.innerHTML = `<div class="dn-ab">
			<div class="ab-crowd"><i></i><span><b>100 kişiye</b> soruldu. En az söylenen <b>doğru</b> cevap en çok puanı alır.</span></div>
			<label class="dn-ab-s"><input type="search" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Ara ya da listeden seç (${v.pool.length})" aria-label="Cevap ara"></label>
			<div class="dn-ab-l" data-kaydir>${v.pool.map((n, i) => `<button class="dn-ab-i" data-i="${i}">${esc(n)}</button>`).join('')}<div class="dn-ab-none" hidden>Listede yok: başka türlü yaz</div></div>
			<div class="dn-ab-f"><span>Doğru ama <b>az bilinen</b> cevap çok puan</span><button class="fl-send" disabled>GÖNDER</button></div>
		</div>`;
		rule(el, 'Nadiri kazanır');
		const root = el.querySelector('.dn-ab');
		const input = root.querySelector('input');
		const list = root.querySelector('.dn-ab-l');
		const items = [...list.querySelectorAll('.dn-ab-i')];
		const none = list.querySelector('.dn-ab-none');
		const info = root.querySelector('.dn-ab-f span');
		const send = root.querySelector('.fl-send');
		const hidden = new Set();
		let sel = -1;
		let done = false;
		const filter = () => {
			const hits = ara(v.pool, input.value, v.alias);
			const set = new Set(hits);
			const q = input.value.trim();
			items.forEach((b, i) => {
				b.classList.toggle('gone', hidden.has(i) || !set.has(i));
				b.classList.toggle('top', !!q && hits[0] === i);
			});
			none.hidden = items.some((b) => !b.classList.contains('gone'));
		};
		// liste ekrana sığmıyorsa altı solar: devamı olduğu görülür (yalnız liste kayar)
		const more = () => list.classList.toggle('more', list.scrollHeight > list.clientHeight + 2 && list.scrollTop + list.clientHeight < list.scrollHeight - 2);
		list.addEventListener('scroll', more, { passive: true });
		requestAnimationFrame(more);
		input.addEventListener('input', () => requestAnimationFrame(more));
		input.addEventListener('input', filter);
		input.addEventListener('keydown', (e) => {
			if (e.key !== 'Enter') return;
			const first = items.find((b) => b.classList.contains('top') && !b.classList.contains('gone')) || items.find((b) => !b.classList.contains('gone'));
			if (first) choose(Number(first.dataset.i));
			input.blur();
		});
		const choose = (i) => {
			if (done) return;
			items[sel]?.classList.remove('sel');
			sel = i;
			items[i].classList.add('sel');
			info.innerHTML = `Seçimin: <b>${esc(v.pool[i])}</b>`;
			send.disabled = false;
			sfx(app, 'tap');
			buzz(5);
		};
		list.addEventListener('click', (e) => {
			const b = e.target.closest('.dn-ab-i');
			if (b) choose(Number(b.dataset.i));
		});
		send.addEventListener('click', () => {
			if (done || sel < 0) return;
			done = true;
			send.disabled = true;
			input.disabled = true;
			info.innerHTML = `<b>${esc(v.pool[sel])}</b> gönderildi`;
			buzz(10);
			api.answer(sel);
		});
		return {
			lock() {
				done = true;
				send.disabled = true;
				input.disabled = true;
			},
			value: () => (sel >= 0 ? sel : null),
			joker(e) {
				if (!e?.hide) return;
				for (const i of e.hide) if (i !== sel) hidden.add(i);
				filter();
				app?.ui?.toast?.(`${e.hide.length} tuzak listeden silindi`, { tone: 'good', ms: 1800 });
			},
			reveal(results) {
				done = true;
				root.classList.add('done');
				input.blur();
				const meR = results.find((r) => r.p?.human);
				const mine = meR ? pick(v, meR.value) : -1;
				const ok = v.pct.map((p, i) => (p >= 0 ? i : -1)).filter((i) => i >= 0).sort((a, b) => v.pct[b] - v.pct[a]);
				const minP = Math.min(...ok.map((i) => v.pct[i]));
				const who = (i) =>
					results
						.filter((r) => pick(v, r.value) === i)
						.map((r) => `<b class="fl-who" style="background:${r.color}"></b>`)
						.join('');
				// doğrular en az bilinenden en çok bilinene; oyuncuların seçtiği tuzaklar başta kırmızı
				const asc = ok.slice().sort((a, b) => v.pct[a] - v.pct[b]);
				const chip = (i, k) =>
					`<div class="dn-ab-b${i === mine ? ' me' : ''}${v.pct[i] === minP ? ' low' : ''}" style="--p:${v.pct[i]};--k:${k}"><u></u><span>${esc(v.pool[i])}</span>${who(i)}<em>%${v.pct[i]}</em></div>`;
				const badChips = [...new Set(results.map((r) => pick(v, r.value)).filter((i) => i >= 0 && v.pct[i] < 0))]
					.map((i) => `<div class="dn-ab-b bad${i === mine ? ' me' : ''}" style="--p:0;--k:0"><u></u><span>${esc(v.pool[i])}</span>${who(i)}<em>TUZAK</em></div>`)
					.join('');
				// senin cevabın: 100 kişiden kaçı söyledi (nokta tablosu)
				let meCard = '';
				if (meR) {
					const good = mine >= 0 && v.pct[mine] >= 0;
					const p = good ? v.pct[mine] : mine >= 0 ? 0 : 0;
					const dots = Array.from({ length: 100 }, (_, k) => `<u${k < p ? ` class="on" style="--k:${k}"` : ''}></u>`).join('');
					const cls = good ? (v.pct[mine] === minP ? ' gold' : '') : ' bad';
					const name = mine >= 0 ? esc(v.pool[mine]) : 'Cevap yok';
					const line = good ? `100 kişiden <em>${p}</em> kişi bunu söyledi` : mine >= 0 ? 'Doğru cevaplardan değil: tuzak' : 'Süre doldu';
					meCard = `<div class="ab-me${cls}"><div class="ab-dots">${dots}</div><div class="ab-tx"><small>SENİN CEVABIN</small><b>${name}</b><span>${line}</span></div><strong>${good ? '+' + (100 - p) : '0'}</strong></div>`;
				}
				root.insertAdjacentHTML(
					'beforeend',
					`${meCard}<div class="dn-ab-r"><div class="dn-ab-h"><span>${ok.length} DOĞRU · EN AZ BİLİNENDEN EN ÇOK BİLİNENE</span><em>tahmini oran</em></div><div class="dn-ab-bars">${badChips}${asc.map((i, k) => chip(i, k + 1)).join('')}</div></div>`,
				);
				if (meR && app) {
					const order = results.slice().sort((a, b2) => a.err - b2.err || a.time - b2.time);
					const win = order[0] === meR;
					if (mine >= 0 && v.pct[mine] >= 0) {
						const pts = 100 - v.pct[mine];
						const tag = v.pct[mine] === minP ? 'En az bilinen cevap!' : pts >= 80 ? 'Az bilinen cevap!' : pts < 40 ? 'Doğru ama herkes bunu der' : '';
						stampLater(app, `+${pts} PUAN`, win ? 'gold' : '', win ? tag : `${order[0].name} daha az bilineni buldu`);
					} else stampLater(app, mine >= 0 ? 'YANLIŞ CEVAP' : 'SÜRE DOLDU', 'bad', mine >= 0 ? `${v.pool[mine]} doğru cevaplardan değil` : '');
				}
				setTimeout(() => {
					const w = el.closest('.fl-q')?.querySelector('.fl-cr.win .tag');
					if (w) w.textContent = 'KAZANDI';
				}, 0);
			},
			destroy() {},
		};
	},
	joker(id, v, R) {
		if (id !== 'yari') return null;
		const wrong = v.pct.map((p, i) => (p < 0 ? i : -1)).filter((i) => i >= 0);
		return { hide: shuffle(wrong, R).slice(0, Math.ceil(wrong.length / 2)).sort((a, b) => a - b) };
	},
	/** Çevrimiçi görünüm: yalnız liste (alfabetik); doğrular ve oranlar cevapta gelir. */
	publicView(v) {
		const o = JSON.parse(JSON.stringify(v));
		delete o.pct;
		delete o.alias; // eşanlamlar yalnız doğru cevaplarda var: hangisinin doğru olduğunu ele verir
		delete o.q.ans;
		delete o.q.wrong;
		return o;
	},
	judge(v, value) {
		const i = pick(v, value);
		if (i < 0) return { correct: false, err: 101 };
		const p = v.pct[i];
		return p < 0 ? { correct: false, err: 100, pts: 0 } : { correct: true, err: p, pts: 100 - p };
	},
	bot(v, skill, R) {
		const p = clamp(pCorrect(skill, v.q.diff) + 0.15, 0.1, 0.96);
		const ok = v.pct.map((x, i) => (x >= 0 ? i : -1)).filter((i) => i >= 0);
		const bad = v.pct.map((x, i) => (x < 0 ? i : -1)).filter((i) => i >= 0);
		let value;
		if (R() < p) {
			// acemi bilineni söyler, usta az bilinene oynar
			const ex = 1.1 - 2.2 * skill;
			const w = ok.map((i) => (v.pct[i] + 3) ** ex);
			let r = R() * w.reduce((a, b) => a + b, 0);
			value = ok[ok.length - 1];
			for (let k = 0; k < ok.length; k++) if ((r -= w[k]) <= 0) {
				value = ok[k];
				break;
			}
		} else value = bad[Math.floor(R() * bad.length)];
		return { value, time: botTime(v, R, skill, 0.15, 0.95) };
	},
	ornek(v) {
		const ok = v.pct.map((x, i) => (x >= 0 ? i : -1)).filter((i) => i >= 0);
		return { good: ok.reduce((a, b) => (v.pct[b] < v.pct[a] ? b : a)), bad: v.pct.findIndex((x) => x < 0) };
	},
};
