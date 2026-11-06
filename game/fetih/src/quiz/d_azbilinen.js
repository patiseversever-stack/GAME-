// AZ BİLİNEN (deneme, v2: beş levha): "100 kişiye soruldu" anketi. Ekranda tam beş şık: 3–4 doğru cevap (100 kişiden
// kaçının söylediğiyle: biri herkesin bildiği, biri orta, biri ya da ikisi az bilinen) ve 1–2 inandırıcı tuzak. Doğrular
// arasında en az söylenen en çok puanı alır: puan = 100 − söyleyen; tuzak 0. Karar: güvenli ama az puanlı bilineni mi,
// çok puanlı ama tuzak olabilecek az bilineni mi seçeceksin. Tek dokunuş cevaplar (arama kutusu, liste yok).
//
// Söyleyen sayıları: elle konmuş TAHMİNİ anket oranları (100 kişiden kaçının aklına gelir; bir kişi birden çok cevap
// sayabilir, toplam 100'ü aşabilir). Çevrimiçinde sunucu (sunucu.js) bunları oyuncu seçimleriyle karıştırabilir:
// v.oran 'karma' | 'gercek' olunca cevap şeridinde "oyuncu seçimi" yazar.
//
// Veri: ans: [[ad, söyleyen]] (3–4), wrong: [[tuzak ad, neden yanlış]] (1–2); toplam tam 5 şık.
// Görünüm: pool (adlar, Türkçe alfabetik), pct (söyleyen; tuzak −1), note (tuzağın nedeni; doğruda ''). Değer: pool sırası.
// Tür 'closest': err = söyleyen (tuzak 100, boş 101); correct = doğru cevap; pts = 100 − söyleyen.
// Çevrimiçi: publicView yalnız adları taşır (pct, note, q.ans, q.wrong cevapta gelir).
// Jokerler: yarı yarıya → en kötü iki şık söner (önce tuzaklar, sonra en çok söylenen doğru; kalan üçü hep doğru,
// en az bilinen hep kalır); seyirci → her şık için "doğru" diyen seyirci yüzdesi (az bilinen doğru daha az oy alır,
// bazen seyirci tuzağa kanar).
// Cevap: aynı beş levha puana göre dizilir (en az bilinen altın, en üstte; tuzaklar kırmızı, en altta); her levhada
// söyleyen sayısı ve 100 kişilik çubuk, kazanılan puan ve seçenlerin portreleri (.fl-who). Damga sorunun yerinde.

import { css, esc, clamp, buzz } from './util.js';
import { botTime } from './timing.js';
import { appOf, stamp, rule, stampLater, sfx, onClose, LOOK, ACT } from './d_ortak.js';
import { setTimeout } from '../core/clock.js';

const LETTERS = 'ABCDEF';
// harf blokları: arena şık renkleri (mavi, turuncu, yeşil, mor) + camgöbeği
const COLS = ['#2f7bff', '#ff8a1f', '#22c46a', '#a24bff', '#14b4cf', '#e0583a'];
const X_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" fill="none"/></svg>';
const CROWN = '<svg class="ab-cr" viewBox="0 0 24 16" aria-hidden="true"><path d="M1.5 15h21l.8-11.2-6.4 4.8L12 .8 7.1 8.6.7 3.8z" fill="currentColor"/></svg>';

const CSS = /* css */ `
/* BEŞ LEVHA: arena şıkları gibi açık zemin, renkli harf bloğu, eğik sağ kenar. Cevapta levhalar puana göre dizilir:
   harf bloğu söyleyen sayısına döner, levhanın kendisi 100 kişilik çubuktur (dolu kısım = söyleyenler), sağda kazanılan
   puan. Levha boyu tercih edilen boydur (--pb soru, --rb cevap): yer azsa içeriğinin boyuna dek kısalır, yazı hiç kırpılmaz;
   gövde yine sığmazsa ui._coverFit küçültür. */
.dn-ab{--pb:72px;--g:9px;--kw:46px;--fs:clamp(18px,calc(5.3 * var(--vw)),23px);--rb:70px;--rfs:clamp(16.5px,calc(4.7 * var(--vw)),20px);
  flex:1 1 auto;min-height:0;display:flex;flex-direction:column;gap:9px;user-select:none;-webkit-user-select:none}
.fl-q.cover.t-azbilinen .fl-qwho,.fl-q.cover.t-azbilinen .fl-qtext{flex:none}
/* şerit: 100 KİŞİYE SORULDU · kural (cevapta: KAÇI SÖYLEDİ · PUAN = 100 − KİŞİ) */
.ab-hd{flex:none;display:flex;align-items:center;gap:8px;min-width:0;padding:0 2px;white-space:nowrap;
  font:italic 800 clamp(10.5px,calc(3.25 * var(--vw)),13px)/1.15 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.75)}
.ab-hd i{flex:none;width:31px;height:13px;color:#ffd25a;background:radial-gradient(circle at 50% 26%,currentColor 0 2.3px,transparent 2.8px) 0 0/6.2px 13px,
  radial-gradient(ellipse 2.5px 4.2px at 50% 100%,currentColor 0 99%,transparent) 0 0/6.2px 13px}
.ab-hd b{font-weight:800;color:#fff}
.ab-hd em{margin-left:auto;font-style:normal;color:#ffd25a}
.dn-ab.jk .ab-hd em{color:#ff8cc0}
/* levhalar */
.ab-ps{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;gap:var(--g)}
.ab-p{position:relative;flex:0 1 var(--pb);display:flex;align-items:stretch;padding:0;border:0;border-radius:0;text-align:left;color:#0e1430;
  background:linear-gradient(180deg,#fff,#e4e9f4);clip-path:polygon(0 0,100% 0,calc(100% - 11px) 100%,0 100%);touch-action:manipulation;cursor:pointer;
  transition:transform .08s,opacity .25s,filter .15s;animation:abIn .34s cubic-bezier(.3,1.4,.5,1) backwards;animation-delay:calc(var(--k) * 45ms)}
.ab-p:active{transform:translateY(2px);filter:brightness(.94)}
.ab-k{flex:none;width:var(--kw);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding-right:5px;font-style:normal;color:#fff;
  background:var(--lc);clip-path:polygon(0 0,100% 0,calc(100% - 9px) 100%,0 100%)}
.ab-k b{font:italic 800 25px/1 'Barlow Condensed','Lilita One',sans-serif;text-shadow:0 2px 0 rgba(0,0,0,.25)}
.ab-m{position:relative;flex:1 1 auto;min-width:0;display:flex;align-items:center;gap:8px;padding:5px 16px 5px 11px}
.ab-t{position:relative;z-index:1;flex:1 1 auto;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:2px}
.ab-n{display:block;min-width:0;font:700 var(--fs)/1.1 'Fredoka',sans-serif;overflow-wrap:normal;word-break:normal}
.ab-p.pick{background:linear-gradient(90deg,#ffe066,#ffbb1f);color:#1a1200}
.ab-p.pick .ab-k{background:#1a1200;color:#ffd25a}
.ab-p.pick .ab-k b{text-shadow:none}
.dn-ab.lk .ab-p:not(.pick){opacity:.55}
.ab-p.gone{opacity:.14;pointer-events:none;transform:scale(.97)}
/* seyirci: şıkkın sağında pembe yüzde, altta ince çubuk ("doğru" diyenler) */
.ab-jq{position:relative;z-index:2;flex:none;padding:0 7px;border-radius:9px;border:2px solid #fff;text-decoration:none;font:400 14px/19px 'Lilita One',sans-serif;color:#fff;background:#ec4f93;
  box-shadow:0 2px 0 rgba(0,0,0,.3);animation:abPop .35s .25s cubic-bezier(.3,1.8,.5,1) backwards}
.ab-jp{position:absolute;left:11px;right:16px;bottom:4px;height:5px;border-radius:3px;background:rgba(10,21,52,.14);overflow:hidden;text-decoration:none}
.ab-jp i{display:block;height:100%;width:calc(var(--w) * 1%);border-radius:3px;background:linear-gradient(90deg,#ff9cc8,#ec4f93);transform-origin:0 50%;animation:abGrow .8s .2s cubic-bezier(.2,.8,.3,1) backwards}
.dn-ab.jk .ab-p:not(.gone) .ab-m{padding-bottom:9px}
/* ---- cevap */
.dn-ab.done .ab-ps{gap:var(--g)}
.dn-ab.done .ab-p{flex:0 1 var(--rb);opacity:1;cursor:default;animation:none;transition:transform .55s cubic-bezier(.3,1.15,.4,1)}
.dn-ab.done .ab-p .ab-m{padding:4px 8px 4px 11px}
.dn-ab.done .ab-n{font-size:var(--rfs)}
.ab-k small{font:italic 800 9.5px/1 'Barlow Condensed',sans-serif;letter-spacing:.12em;color:rgba(255,255,255,.62)}
.dn-ab.done .ab-k{background:#0e1430}
.dn-ab.done .ab-k b{font:400 23px/1 'Lilita One',sans-serif;letter-spacing:0;text-shadow:none;font-variant-numeric:tabular-nums}
.dn-ab.done .ab-p.ok{background:#eef2f9}
.ab-f{position:absolute;left:0;top:0;bottom:0;z-index:0;width:calc(var(--p) * 1%);background:linear-gradient(90deg,#86eaa6,#3cc977);transform-origin:0 50%;
  animation:abGrow .75s cubic-bezier(.2,.8,.3,1) backwards;animation-delay:calc(.2s + var(--k) * 70ms)}
.ab-s{display:block;font:italic 800 11.5px/1.1 'Barlow Condensed','Fredoka',sans-serif;letter-spacing:.08em;text-transform:uppercase}
.ab-w{position:relative;z-index:1;flex:none;display:flex;align-items:center;padding-left:3px}
.dn-ab .ab-w .fl-who{position:relative;inset:auto;top:auto;right:auto;left:auto;bottom:auto;flex:none;width:26px;height:26px;margin:0 0 0 -6px;border:2px solid #fff;border-radius:7px;
  box-shadow:0 2px 0 rgba(0,0,0,.3);transform:skewX(-6deg);overflow:hidden;animation:abPop .35s cubic-bezier(.3,1.8,.5,1) backwards;animation-delay:calc(.45s + var(--k) * 70ms)}
.dn-ab .ab-w .fl-who:first-child{margin-left:0}
.dn-ab .ab-w .fl-who.me{box-shadow:0 0 0 2.5px #ffd25a,0 2px 0 rgba(0,0,0,.3)}
.dn-ab .ab-w .fl-who .fl-avs{display:block;width:100%;height:100%}
.ab-pt{flex:none;width:58px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding-right:9px;color:#fff;background:#0e1430;
  clip-path:polygon(9px 0,100% 0,100% 100%,0 100%);animation:abPop .35s cubic-bezier(.3,1.8,.5,1) backwards;animation-delay:calc(.35s + var(--k) * 70ms)}
.ab-pt b{font:400 21px/1 'Lilita One',sans-serif;font-variant-numeric:tabular-nums}
.ab-pt small{font:italic 800 9.5px/1 'Barlow Condensed',sans-serif;letter-spacing:.12em;color:rgba(255,255,255,.62)}
/* en az bilinen: altın levha, taç, EN AZ BİLİNEN */
.dn-ab.done .ab-p.best{background:#fff3c8}
.ab-p.best .ab-f{background:linear-gradient(90deg,#ffe27a,#ffbd2a)}
.dn-ab.done .ab-p.best .ab-k,.ab-p.best .ab-pt{background:#1a1200}
.dn-ab.done .ab-p.best .ab-k b,.ab-p.best .ab-pt b{color:#ffd25a}
.ab-p.best .ab-s{color:#8a5a00}
.dn-ab .ab-n .ab-cr{display:inline-block;width:19px;height:13px;margin:0 6px 0 0;vertical-align:-1px;color:#e0a000}
/* tuzak: kırmızı levha, çarpı, üstü çizili ad, neden yanlış */
.dn-ab.done .ab-p.trap{background:#ffe1dc}
.dn-ab.done .ab-p.trap .ab-k{background:#d8392a}
.ab-p.trap .ab-k svg{width:22px;height:22px;color:#fff}
.ab-p.trap .ab-n{color:#7a160d;text-decoration:line-through;text-decoration-color:rgba(200,40,30,.75);text-decoration-thickness:2.5px}
.ab-p.trap .ab-s{color:#b3261a;text-transform:none;letter-spacing:.02em;font-size:12.5px}
.ab-p.trap .ab-pt{background:#7a160d}
/* kısa ekran (≤720 px; 1280×720 çerçevesi dahil): levhalar alçalır, yazı küçülür */
@media (max-height:720px){
  .dn-ab{--pb:52px;--g:6px;--kw:40px;--fs:clamp(16px,calc(4.9 * var(--vw)),19px);--rb:50px;--rfs:clamp(15px,calc(4.4 * var(--vw)),17px);gap:6px}
  .ab-k b{font-size:22px}
  .dn-ab.done .ab-k b{font-size:20px}
  .ab-pt{width:52px}
  .ab-pt b{font-size:19px}
  .ab-s{font-size:10.5px}
  .ab-p.trap .ab-s{font-size:11.5px}
  .dn-ab .ab-w .fl-who{width:23px;height:23px}
  .fl-q.cover.t-azbilinen.rv .fl-rule{display:none}
}
/* en kısa ekran (≤600 px): soruda şerit kalkar (kural başlıkta), levhalar sıkı; cevapta şerit döner (jokerler kalkınca yer açılır) */
@media (max-height:600px){
  .dn-ab{--pb:40px;--g:5px;--kw:34px;--fs:16px;--rb:44px;--rfs:15px;gap:5px}
  .dn-ab:not(.done):not(.jk) .ab-hd{display:none}
  .ab-k b{font-size:20px}
  .dn-ab.done .ab-k b{font-size:18px}
  .ab-k small,.ab-pt small{font-size:8.5px}
  .ab-m{padding:3px 14px 3px 9px}
  .ab-pt{width:47px}
  .ab-pt b{font-size:17px}
  .ab-s{font-size:10px}
  .ab-p.trap .ab-s{font-size:11px}
  .dn-ab .ab-w .fl-who{width:21px;height:21px;margin-left:-5px;border-radius:6px}
  .ab-jq{font-size:13px;line-height:17px;padding:0 6px}
  .ab-jp{bottom:3px;height:4px}
  .dn-ab.jk .ab-p:not(.gone) .ab-m{padding-bottom:7px}
}
/* dar kart (≤340 px): portreler daha sık */
@container (max-width:340px){
  .dn-ab .ab-w .fl-who{margin-left:-8px}
  .dn-ab .ab-n .ab-cr{width:16px;height:11px;margin-right:4px}
}
/* girişler yukarıdan: aşağı kayan parça gövdenin altından taşıp _coverFit'i boş yere küçültürdü */
@keyframes abIn{from{opacity:0;transform:translateY(-8px)}}
@keyframes abPop{from{transform:scale(.4);opacity:0}}
@keyframes abGrow{from{transform:scaleX(0)}}
@media (prefers-reduced-motion:reduce){.ab-p,.ab-f,.ab-pt,.ab-jq,.ab-jp i,.dn-ab .ab-w .fl-who{animation:none!important;transition:none!important}}
`;

/** Arama ve teklik denetimi için sadeleştir: küçük harf, Türkçe harfler düz, harf ve rakam dışı yok. */
export const sade = (s) =>
	String(s ?? '')
		.toLocaleLowerCase('tr-TR')
		// sayfa windows-1252 okunabilir: düzenli ifadede ASCII dışı harf yok (esbuild dizeleri kaçışlar, düzenli ifadeyi değil)
		.replace(/[\u00E7\u011F\u0131\u00F6\u015F\u00FC\u00E2\u00EE\u00FB]/g, (c) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' })[c])
		.replace(/[^a-z0-9]/g, '');

const pick = (v, value) => (Number.isInteger(value) && value >= 0 && value < v.pool.length ? value : -1);
const goodIdx = (v) => v.pct.map((p, i) => (p >= 0 ? i : -1)).filter((i) => i >= 0);
const trapIdx = (v) => v.pct.map((p, i) => (p < 0 ? i : -1)).filter((i) => i >= 0);
/** En az bilinen doğru (en çok puan). */
const bestOf = (v) => goodIdx(v).reduce((a, i) => (a < 0 || v.pct[i] < v.pct[a] ? i : a), -1);

/** Ad yazısı kutusuna sığsın: tek kelime asla ortasından bölünmez, en çok iki satır; sığmazsa yarımşar piksel küçülür. */
function fitNames(root) {
	for (const n of root.querySelectorAll('.ab-n')) {
		n.style.fontSize = '';
		if (!n.clientWidth) continue;
		const base = parseFloat(getComputedStyle(n).fontSize) || 16;
		const lh = parseFloat(getComputedStyle(n).lineHeight) || base * 1.1;
		let fs = base;
		const over = () => n.scrollWidth > n.clientWidth + 0.5 || n.offsetHeight > lh * (fs / base) * 2 + 1;
		for (let k = 0; k < 24 && over() && fs > base * 0.68; k++) n.style.fontSize = (fs -= 0.5) + 'px';
	}
}

export const azbilinen = {
	time: 25,
	label: 'Az Bilinen',
	kind: 'closest',
	cover: true, // tam ekran anket: beş levha
	keep: true, // cevap tahtası (levhalar) kalır
	jokers: ['yari', 'kahin'],
	rule: 'Nadiri kazanır',
	// sonuç ekranı sözcükleri (ui._showResult): "EN YAKIN SEN!" yerine
	birinci: 'EN NADİR CEVAP SENDE!',
	rozet: 'EN NADİR',
	ustun: 'seni geçti',
	fmt: (v, value) => {
		const i = pick(v, value);
		return i < 0 || v.pct[i] < 0 ? '0 puan' : `${100 - v.pct[i]} puan`;
	},
	sub: (v, value) => {
		const i = pick(v, value);
		if (i < 0) return 'cevap yok';
		return v.pct[i] < 0 ? `${v.pool[i]} · tuzak` : `${v.pool[i]} · ${v.pct[i]} kişi`;
	},
	prepare(q) {
		const items = [...q.ans.map(([n, p]) => ({ n, p, t: '' })), ...q.wrong.map((w) => (typeof w === 'string' ? { n: w, p: -1, t: '' } : { n: w[0], p: -1, t: w[1] || '' }))].sort((a, b) =>
			a.n.localeCompare(b.n, 'tr', { numeric: true }),
		);
		const v = { q, pool: items.map((x) => x.n), pct: items.map((x) => x.p), note: items.map((x) => x.t) };
		return stamp(v, q, (q2, k, P, text) => {
			text(v.pool.join(' ')); // beş adı okur
			return {
				look: LOOK.orient + v.pool.length * LOOK.gaze,
				// hangisi doğru, hangisi tuzak; doğrulardan hangisi az bilinir: risk ile puanı tart
				think: P.think[0] + P.think[1] * k,
				act: ACT.tap,
			};
		});
	},
	mount(el, v, api) {
		css('azbilinen', CSS);
		const app = appOf();
		el.innerHTML = `<div class="dn-ab">
			<div class="ab-hd"><i></i><b>100 kişiye soruldu</b><em>Az söylenen doğru kazanır</em></div>
			<div class="ab-ps">${v.pool
				.map(
					(n, i) =>
						`<button class="ab-p dn-ab-i" data-i="${i}" style="--lc:${COLS[i % COLS.length]};--k:${i}" aria-label="${esc(`${LETTERS[i]}: ${n}`)}"><i class="ab-k"><b>${LETTERS[i]}</b></i><span class="ab-m"><span class="ab-t"><span class="ab-n">${esc(n)}</span></span></span></button>`,
				)
				.join('')}</div>
		</div>`;
		rule(el, 'Nadiri kazanır');
		const root = el.querySelector('.dn-ab');
		const hd = root.querySelector('.ab-hd');
		const list = root.querySelector('.ab-ps');
		const plates = [...list.querySelectorAll('.ab-p')];
		let sel = -1;
		let done = false;
		const fit = () => root.isConnected && fitNames(root);
		requestAnimationFrame(fit);
		document.fonts?.ready?.then(fit);
		addEventListener('resize', fit);
		onClose(el, () => removeEventListener('resize', fit));
		list.addEventListener('click', (e) => {
			const b = e.target.closest('.ab-p');
			if (!b || done || b.classList.contains('gone')) return;
			done = true;
			sel = Number(b.dataset.i);
			b.classList.add('pick');
			root.classList.add('lk');
			sfx(app, 'tap');
			buzz(8);
			api.answer(sel);
		});
		return {
			lock() {
				done = true;
				root.classList.add('lk');
			},
			value: () => (sel >= 0 ? sel : null),
			joker(e) {
				if (!e) return;
				if (e.hide) {
					for (const i of e.hide) {
						if (i === sel || !plates[i]) continue;
						plates[i].classList.add('gone');
						plates[i].disabled = true;
					}
					app?.ui?.toast?.(`Yarı yarıya: ${e.hide.length} şık elendi, kalanların hepsi doğru`, { tone: 'good', ms: 2000 });
				}
				if (e.poll) {
					root.classList.add('jk');
					hd.querySelector('em').textContent = 'Seyirci: yüzde kaçı doğru diyor';
					plates.forEach((b, i) => {
						if (b.classList.contains('gone') || b.querySelector('.ab-jq')) return;
						const m = b.querySelector('.ab-m');
						m.insertAdjacentHTML('beforeend', `<s class="ab-jq">%${e.poll[i]}</s><u class="ab-jp"><i style="--w:${e.poll[i]}"></i></u>`);
					});
					app?.ui?.toast?.('Seyirci oy verdi: her şık için "doğru" diyenler', { tone: 'good', ms: 2000 });
					requestAnimationFrame(fit);
				}
			},
			reveal(results) {
				done = true;
				removeEventListener('resize', fit);
				const rm = !!app?.ui?.rm || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
				const first = new Map(plates.map((b) => [b, b.getBoundingClientRect().top]));
				const best = bestOf(v);
				const good = goodIdx(v).sort((a, b) => v.pct[a] - v.pct[b] || a - b);
				const order = [...good, ...trapIdx(v)];
				const who = (i) =>
					results
						.filter((r) => pick(v, r.value) === i)
						.map((r) => `<b class="fl-who" style="background:${r.color}"></b>`)
						.join('');
				const real = v.oran === 'gercek' ? '100 oyuncudan kaçı seçti' : v.oran === 'karma' ? 'Anket ve oyuncu seçimi' : '100 kişiden kaçı söyledi';
				root.classList.remove('lk', 'jk');
				root.classList.add('done');
				hd.innerHTML = `<i></i><b>${real}</b><em>Puan = 100 − kişi</em>`;
				order.forEach((i, k) => {
					const b = plates[i];
					const p = v.pct[i];
					const trap = p < 0;
					b.classList.remove('pick', 'gone');
					b.disabled = true;
					b.classList.add(trap ? 'trap' : 'ok');
					if (i === best) b.classList.add('best');
					b.style.setProperty('--k', String(k));
					b.style.setProperty('--p', String(trap ? 0 : clamp(p, 0, 100)));
					b.querySelector('.ab-k').innerHTML = trap ? `${X_SVG}<small>TUZAK</small>` : `<b data-n="${p}">${p}</b><small>KİŞİ</small>`;
					const sub = trap ? esc(v.note[i] || 'Doğru cevaplardan değil') : i === best ? 'En az bilinen' : '';
					b.querySelector('.ab-m').innerHTML = `${trap ? '' : '<u class="ab-f"></u>'}<span class="ab-t"><span class="ab-n">${i === best ? CROWN : ''}${esc(v.pool[i])}</span>${
						sub ? `<small class="ab-s">${sub}</small>` : ''
					}</span><span class="ab-w">${who(i)}</span>`;
					b.insertAdjacentHTML('beforeend', `<b class="ab-pt"><b data-n="${trap ? 0 : 100 - p}">${trap ? '0' : '+' + (100 - p)}</b><small>PUAN</small></b>`);
					b.setAttribute('aria-label', `${v.pool[i]}: ${trap ? 'tuzak, 0 puan' : `${p} kişi, ${100 - p} puan`}`);
				});
				// puana göre diz (en az bilinen üstte): FLIP, yalnız transform
				list.append(...order.map((i) => plates[i]));
				fitNames(root);
				if (!rm) {
					const z = root.currentCSSZoom || 1;
					for (const b of plates) {
						const dy = (first.get(b) - b.getBoundingClientRect().top) / z;
						if (Math.abs(dy) < 1) continue;
						b.style.transition = 'none';
						b.style.transform = `translateY(${dy.toFixed(1)}px)`;
					}
					void list.offsetHeight;
					for (const b of plates) {
						b.style.transition = '';
						b.style.transform = '';
					}
					// sayılar sıfırdan sayar (söyleyen ve puan), çubuklarla birlikte
					const fx = app?.ui?.fx;
					if (fx?.count)
						for (const n of root.querySelectorAll('[data-n]')) {
							const to = Number(n.dataset.n);
							const f = n.closest('.ab-pt') && to > 0 ? (x) => '+' + Math.round(x) : (x) => String(Math.round(x));
							n.textContent = f(0);
							setTimeout(() => n.isConnected && fx.count(n, 0, to, 650, f), 250);
						}
				}
				// damga (sorunun yerinde): senin cevabın, puanın ve kim kazandı
				const meR = results.find((r) => r.p?.human);
				if (meR && app) {
					const ord = results.slice().sort((a, b) => a.err - b.err || a.time - b.time);
					const win = ord[0] === meR || results.length === 1;
					const mine = pick(v, meR.value);
					if (mine >= 0 && v.pct[mine] >= 0) {
						const pts = 100 - v.pct[mine];
						const w = ord[0];
						const same = pick(v, w.value) === mine;
						const tag = mine === best ? 'En az bilinen cevap!' : win ? `En nadiri ${v.pool[best]} (+${100 - v.pct[best]})` : same ? `Aynı cevap: ${w.name} daha hızlı` : `${w.name} daha az bilineni buldu`;
						stampLater(app, `+${pts} PUAN`, win ? 'gold' : '', tag);
					} else if (mine >= 0) stampLater(app, 'TUZAK!', 'bad', `${v.pool[mine]}: ${v.note[mine] || 'doğru cevap değil'}`);
					else stampLater(app, 'SÜRE DOLDU', 'warn', `En nadiri ${v.pool[best]} (+${100 - v.pct[best]})`);
					if (mine === best && app.ui?.fx && !rm)
						setTimeout(() => {
							const b = plates[best];
							if (!b?.isConnected) return;
							const r = b.getBoundingClientRect();
							app.ui.fx.burst(r.left + r.width * 0.3, r.top + r.height / 2, { n: 16, dist: 90, colors: ['#ffd25a', '#fff', '#ffb21f'], kind: 'star', size: 12, life: 800 });
						}, 650);
				}
			},
			destroy() {
				removeEventListener('resize', fit);
			},
		};
	},
	joker(id, v, R) {
		const n = v.pool.length;
		if (id === 'yari') {
			// en kötü iki şık: önce tuzaklar, sonra en çok söylenen doğrular; en az bilinen hiç elenmez
			const worst = [...Array(n).keys()].sort((a, b) => (v.pct[b] < 0 ? 1000 : v.pct[b]) - (v.pct[a] < 0 ? 1000 : v.pct[a]) || a - b);
			return { hide: worst.slice(0, 2).sort((a, b) => a - b) };
		}
		if (id === 'kahin') {
			// seyirci her şık için "doğru mu?" oyu verir: bilinen doğru çok, az bilinen doğru az oy alır; tuzak az alır.
			// Bazen (zorlukla artar) seyirci bir tuzağa kanar, en az bilineni de küçümser.
			const d = v.q?.diff || 2;
			const traps = trapIdx(v);
			const fooled = traps.length > 0 && R() < (d >= 3 ? 0.14 : d === 2 ? 0.08 : 0.04);
			const lure = fooled ? traps[Math.floor(R() * traps.length)] : -1;
			const best = bestOf(v);
			const poll = v.pct.map((p, i) => {
				let y = p < 0 ? (i === lure ? 0.64 + R() * 0.2 : 0.14 + R() * 0.24) : 0.46 + 0.5 * Math.sqrt(p / 100) + (R() - 0.5) * 0.1;
				if (fooled && i === best) y -= 0.15;
				return Math.round(100 * clamp(y, 0.06, 0.98));
			});
			return { poll };
		}
		return null;
	},
	/** Çevrimiçi görünüm: yalnız şık adları (alfabetik); doğrular, sayılar ve tuzak nedenleri cevapta gelir. */
	publicView(v) {
		const o = JSON.parse(JSON.stringify(v));
		delete o.pct;
		delete o.note;
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
		const d = v.q?.diff || 2;
		const ok = goodIdx(v);
		const bad = trapIdx(v);
		// tuzağa kanma: acemi inandırıcı tuzağa sık düşer, usta pek düşmez (zor soruda daha sık)
		const fooled = bad.length > 0 && R() < clamp(0.42 - 0.45 * skill + 0.07 * (d - 2), 0.02, 0.6);
		let value;
		if (fooled) value = bad[Math.floor(R() * bad.length)];
		else {
			// acemi bilineni söyler (güvenli, az puan), usta az bilinene oynar
			const ex = 1.1 - 2.2 * skill;
			const w = ok.map((i) => (v.pct[i] + 3) ** ex);
			let r = R() * w.reduce((a, b) => a + b, 0);
			value = ok[ok.length - 1];
			for (let k = 0; k < ok.length; k++)
				if ((r -= w[k]) <= 0) {
					value = ok[k];
					break;
				}
		}
		return { value, time: botTime(v, R, skill, 0.15, 0.95) };
	},
	ornek(v) {
		return { good: bestOf(v), bad: trapIdx(v)[0] };
	},
};
