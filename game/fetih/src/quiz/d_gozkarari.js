// GÖZ KARARI: görselli soru (KARARLAR.md v1.6). Görsel düz konmaz: konusuna göre 14 desenli çerçeveden birine kesilir
// (gk_cerceve.js). Gösterim kipleri:
//   blur    bulanıktan netleşir            zoom    çok yakından uzaklaşır (odak: kurulumun bulduğu en ayrıntılı nokta)
//   sil     siyah siluet (derlemede çıkarılmış maske), cevapta görsel açılır
//   detail  tablolarda ayrıntıdan bütüne: bir ayrıntıdan başlar, hem uzaklaşır hem ortaya kayar
// 4 şık, 20 sn, joker yok. Erken bilen çok puan: 100 → 40 (sürenin %85'inde erir; kartın üstünde canlı sayaç).
// Düelloda ikisi de bilirse hızlı olan kazanır (mac.js HIZLI). Cevaptan sonra görsel tamamen netleşir, üstünden ışık
// geçer, çerçevenin altına cevap kurdelesi, altına tek satır ilginç bilgi gelir.
//
// Görseller ayrı dosyadan, tembel yüklenir: gk/<img>.webp (siluette gk/<img>.m.png). Görseller sayfanın yanında yoksa
// (gkHazir() false) tip maçta hiç seçilmez (match.askable); yedek çizim gösterilmez.

import { css, esc, shuffle, pCorrect, mountChoice, clamp, chips } from './util.js';
import { botTime, secOf } from './timing.js';
import { stamp, LOOK, onClose, DENEME_CSS } from './d_ortak.js';
import { playSfx } from './appref.js';
import { frameOf, frameSVG, hashStr } from './gk_cerceve.js';
import { KONULAR } from '../data/gozkarari.js';
import { clock } from '../core/clock.js';

export const GK_BASE = 'gk/';
const MODE = { blur: 'Netleşiyor', zoom: 'Uzaklaşıyor', sil: 'Siluet', detail: 'Ayrıntıdan bütüne' };
const SPAN = 0.85; // puan ve görsel sürenin bu payında açılır
const BLUR_K = 0.65; // bulanık kip SPAN'ın bu payında tam netleşir (kullanıcı: fotoğrafta netleşme biraz daha çabuk)

// ---------------------------------------------------------------- görsellerin varlığı (tarayıcıda bir kez yoklanır)
let OK = typeof Image === 'undefined' ? true : null; // node (sunucu, testler): karar istemcide
/** Görseller sayfanın yanında mı? Bilinmiyorsa (yoklama sürüyor) true; yoklama başarısızsa false. */
export function gkHazir() {
	if (OK === null) {
		OK = true;
		const im = new Image();
		im.onerror = () => (OK = false);
		im.src = GK_BASE + 'GK-001.webp';
	}
	return OK;
}
/** Bir sonraki görseli önden indir (kart açılmadan). */
const cache = new Map();
export function gkOnyukle(q) {
	if (typeof Image === 'undefined' || !q?.img) return;
	for (const u of [q.img + '.webp', q.mode === 'sil' ? q.img + '.m.png' : null]) {
		if (!u || cache.has(u)) continue;
		const im = new Image();
		im.decoding = 'async';
		im.src = GK_BASE + u;
		cache.set(u, im);
	}
}

const EYE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M1.6 12C4.2 7.2 7.9 4.8 12 4.8s7.8 2.4 10.4 7.2c-2.6 4.8-6.3 7.2-10.4 7.2S4.2 16.8 1.6 12z" fill="#fff"/><circle cx="12" cy="12" r="4.6" fill="#1a2650"/><circle cx="12" cy="12" r="2.1" fill="#ffd25a"/><circle cx="13.6" cy="10.4" r="1.1" fill="#fff"/></svg>';
const BULB = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5a6.8 6.8 0 0 0-4 12.3c.8.6 1.2 1.4 1.2 2.3v.9h5.6v-.9c0-.9.4-1.7 1.2-2.3A6.8 6.8 0 0 0 12 2.5z" fill="#ffd25a"/><path d="M9.4 19.6h5.2M10.2 21.6h3.6" stroke="#ffd25a" stroke-width="1.8" stroke-linecap="round"/></svg>';

const CSS = /* css */ `
.dn-gk{display:flex;flex-direction:column;gap:9px}
.gk-hd{display:flex;align-items:center;gap:8px;min-width:0}
.gk-hd .kn{flex:0 1 auto;min-width:0;display:flex;align-items:center;gap:6px;padding:4px 10px 4px 6px;transform:skewX(-8deg);background:#0b1230;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.75)}
.gk-hd .kn>*{transform:skewX(8deg)}
.gk-hd .kn svg{flex:none;width:20px;height:20px}
/* konu adı ("Dinozor ve deniz canlıları") dar ekranda iki satıra iner: eskiden tek satırda sıkışıp puan sayacını
   ekrandan itiyor ("PUAN" kesiliyordu), cevapta oyuncu çipleri üstüne biniyordu */
.gk-hd .kn{flex:1 1 auto;max-width:max-content}
.gk-hd .kn b{min-width:0;white-space:normal;overflow-wrap:normal;font:italic 800 13px/1.08 'Barlow Condensed','Lilita One',sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#fff}
.gk-hd .md{flex:none;font:italic 800 11px/1 'Barlow Condensed',sans-serif;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.62)}
/* sayaç içeriğinden (çubuğun en az 22 px'i + sayı + PUAN) dar olmaz: konu adı daralıp iki satıra iner; eskiden sayaç
   70 px'e sıkışıyor, "PUAN" ekranın kenarından taşıyordu */
.gk-pt{flex:1;display:flex;align-items:center;gap:7px;min-width:auto}
.gk-pt i{flex:1;min-width:22px;position:relative;height:9px;overflow:hidden;transform:skewX(-14deg);background:rgba(255,255,255,.13);box-shadow:inset 0 0 0 1px rgba(255,255,255,.25)}
.gk-pt i::after{content:'';position:absolute;inset:0;transform-origin:0 50%;transform:scaleX(var(--k,1));background:linear-gradient(90deg,#ff7a2a,#ffd25a 70%,#fff3b8)}
.gk-pt b{flex:none;min-width:2.1em;text-align:right;font:italic 900 22px/1 'Barlow Condensed','Lilita One',sans-serif;color:#ffd25a;text-shadow:0 2px 0 rgba(0,0,0,.45)}
.gk-pt small{flex:none;font:italic 800 10px/1 'Barlow Condensed',sans-serif;letter-spacing:.1em;color:rgba(255,255,255,.55)}
.gk-sw{position:relative;display:flex;align-items:center;justify-content:center;min-height:0}
.gk-st{position:relative;width:min(100%,330px);margin:2px auto 0;aspect-ratio:4/3;animation:gkIn .55s cubic-bezier(.2,1.4,.4,1) both}
.gk-st svg{position:relative;display:block;width:100%;height:100%;overflow:visible}
/* gölge ayrı, durgun katman: canlı resim her karede değişirken gölge yeniden süzülmez */
.gk-st svg.sd{position:absolute;inset:0;transform:translateY(10px);filter:blur(12px);opacity:.75}
@keyframes gkIn{0%{opacity:0;transform:translateY(-18px) rotate(-4deg) scale(.86)}100%{opacity:1;transform:none}}
.gk-st .ld{animation:gkLd 1.1s linear infinite}
@keyframes gkLd{0%{transform:translateX(-420px)}100%{transform:translateX(420px)}}
.gk-st.ok .ld{display:none}
.gk-st .nv{transition:opacity .5s ease}
.gk-st .sh{opacity:0}
.gk-st.rv .sh{animation:gkSh .9s .1s ease-out both}
@keyframes gkSh{0%{opacity:.85;transform:translateX(-460px) skewX(-20deg)}100%{opacity:.85;transform:translateX(520px) skewX(-20deg)}}
.gk-st.rv{animation:gkPop .45s cubic-bezier(.3,1.6,.5,1) both}
@keyframes gkPop{0%{transform:scale(1)}40%{transform:scale(1.045)}100%{transform:scale(1)}}
.gk-cap{position:absolute;left:50%;top:-12px;z-index:3;max-width:94%;padding:6px 16px 7px;transform:translateX(-50%) skewX(-8deg);white-space:nowrap;
  font:400 21px/1 'Lilita One',sans-serif;color:#1a1200;background:linear-gradient(180deg,#ffe98a,#ffbf2a);box-shadow:0 0 0 2.5px #1a1200,0 6px 14px rgba(0,0,0,.5);animation:gkCap .5s .2s cubic-bezier(.3,1.7,.5,1) both}
.gk-cap.no{color:#fff;background:linear-gradient(180deg,#ff6a55,#c42a1a)}
@keyframes gkCap{0%{opacity:0;transform:translateX(-50%) skewX(-8deg) translateY(-14px) scale(.6)}100%{opacity:1;transform:translateX(-50%) skewX(-8deg)}}
/* bilgi: cevaptan sonra soru kutusunun yerinde */
.gk-info{display:flex;align-items:center;gap:9px;text-align:left;font:500 14.5px/1.3 'Fredoka',sans-serif;color:#3a2600;animation:gkInfo .45s .35s ease-out both}
.gk-info svg{flex:none;width:22px;height:22px}
.fl-qtext.gk-bilgi{justify-content:flex-start;padding:8px 13px;background:linear-gradient(180deg,#fff8de,#ffeab0)}
.fl-qtext.gk-bilgi svg path:first-child{fill:#e0a10a}
.fl-qtext.gk-bilgi svg path:last-child{stroke:#e0a10a}
/* oyuncu çipleri doğal genişliğinde (konu adı daralır, gerekirse iki satır): taşıp sola, konu adının üstüne binmez */
.gk-res{flex:none;margin-left:auto;display:flex;justify-content:flex-end}
.gk-res .fl-chips{margin:0;flex-wrap:nowrap;justify-content:flex-end;gap:5px}
@keyframes gkInfo{0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:none}}
.dn-gk .fl-opts{margin-top:2px}
/* ---------------------------------------------------------------- tam ekran (ortak düzen styles-arena.js .fl-q.cover; burada yalnız Göz Kararı) */
.fl-q.t-gozkarari .fl-qc::before{padding-left:30px;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M1.6 12C4.2 7.2 7.9 4.8 12 4.8s7.8 2.4 10.4 7.2c-2.6 4.8-6.3 7.2-10.4 7.2S4.2 16.8 1.6 12z' fill='%23fff'/%3E%3Ccircle cx='12' cy='12' r='4.6' fill='%231a2650'/%3E%3Ccircle cx='12' cy='12' r='2.1' fill='%23ffd25a'/%3E%3C/svg%3E") 0 50%/24px no-repeat}
.fl-q.cover .dn-gk{flex:1 1 auto;min-height:0}
.fl-q.cover .gk-sw{flex:1 1 auto;min-height:96px;container-type:size;padding:14px 0 4px}
.fl-q.cover .gk-st{width:min(100cqw,133.3cqh);max-width:100%;margin:0}
.fl-q.t-gozkarari .fl-jk{display:none} /* bu tipte joker yok: çubuk da yer kaplamaz */
/* şıklar hep iki sütun, ekrana kilitli (minmax 0): uzun ad küçülerek sığar (fit.js), son çare iki satır */
.fl-q.t-gozkarari .fl-opts,.fl-q.t-gozkarari .fl-opts.one{grid-template-columns:repeat(2,minmax(0,1fr))}
.fl-q.t-gozkarari .fl-opt{min-width:0}
.fl-q.t-gozkarari .fl-opt>span{flex:1 1 auto;min-width:0;overflow:hidden;overflow-wrap:normal;word-break:normal}
.fl-q.t-gozkarari .fl-opt>span.fit-2{overflow-wrap:anywhere}
.dn-gk.rv .gk-hd .md{display:none}
@media (max-height:700px){
  .fl-q.t-gozkarari .fl-qc::before{background-size:20px;padding-left:26px}
  .fl-q.cover .gk-sw{padding:12px 0 2px;min-height:120px}
  .fl-q.cover .gk-hd .kn b{font-size:12px}
  .fl-q.t-gozkarari .fl-opts{gap:6px}
  .fl-q.t-gozkarari .fl-opt{min-height:38px}
  .fl-q.t-gozkarari .fl-opt span{font-size:14px;line-height:1.1}
  .fl-q.cover .gk-info{font-size:13px}
}
@media (prefers-reduced-motion:reduce){.gk-st,.gk-st.rv,.gk-cap,.gk-info{animation:none}.gk-st .ld{animation:none}}
`;

const ease = (x) => 1 - Math.pow(1 - x, 2.4);
let UID = 0;


export const gozkarari = {
	time: 20,
	label: 'Göz Kararı',
	kind: 'exact',
	jokers: [], // KARARLAR v1.6: bu tipte joker yok
	noJoker: true, // süre/sabotaj/kalkan/ikinci şans dahil (jokers.js support)
	cover: true, // kart bütün ekranı kaplar: üstte düello afişi, altında soru; harita görünmez (ui.js .fl-q.cover)
	prepare(q, R) {
		const order = shuffle([0, 1, 2, 3], R);
		const v = { q, opts: order.map((i) => q.a[i]), right: order.indexOf(0), frame: frameOf(q) };
		stamp(v, q, (q2, k, P, text) => {
			for (const a of q2.a) text(a);
			return { wait: LOOK.reveal, look: LOOK.orient + LOOK.image };
		});
		return v;
	},
	mount(el, v, api) {
		css('deneme', DENEME_CSS);
		css('gozkarari', CSS);
		const q = v.q;
		const k = 'gk' + ++UID;
		const sec = secOf(v);
		const span = sec * SPAN * 1000;
		const f0 = q.f || [0.5, 0.5];
		const box = q.box || null;
		const fr = frameSVG(v.frame || frameOf(q), k, hashStr(q.id || ''), box);
		const src = GK_BASE + q.img + '.webp';
		const sil = q.mode === 'sil';
		const konu = KONULAR[q.konu] || 'Göz Kararı';
		// siluet zemini: sahne ışığı (çerçevenin rengine yakın sıcak ton)
		const silBg = `<radialGradient id="sg${k}" cx=".5" cy=".45" r=".7"><stop offset="0" stop-color="#fff6dc"/><stop offset=".7" stop-color="#e9d6a8"/><stop offset="1" stop-color="#b99a62"/></radialGradient>`;
		el.innerHTML = `<div class="dn-gk">
			<div class="gk-hd"><span class="kn">${EYE}<b>${esc(konu)}</b></span><span class="md">${MODE[q.mode] || ''}</span>
				<span class="gk-pt"><i></i><b>100</b><small>PUAN</small></span></div>
			<div class="gk-sw"><div class="gk-st"><svg class="sd" viewBox="0 0 400 300" aria-hidden="true"><path d="${fr.d}" fill="#02040c"/></svg><svg viewBox="0 0 400 300" role="img" aria-label="Göz Kararı görseli">
				<defs>${fr.defs}<clipPath id="c${k}"><path d="${fr.d}"/></clipPath>
					<filter id="b${k}" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="0" edgeMode="duplicate"/></filter>
					${sil ? `${silBg}<mask id="m${k}" maskUnits="userSpaceOnUse" x="0" y="0" width="400" height="300"><image href="${GK_BASE + q.img}.m.png" width="400" height="300" preserveAspectRatio="none"/></mask>` : ''}
					<linearGradient id="l${k}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
					<radialGradient id="v${k}" cx=".5" cy=".5" r=".72"><stop offset=".62" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".38"/></radialGradient>
					<linearGradient id="w${k}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1b2550"/><stop offset=".5" stop-color="#2d3c78"/><stop offset="1" stop-color="#1b2550"/></linearGradient>
				</defs>
				<g clip-path="url(#c${k})">
					<rect width="400" height="300" fill="#141c3c"/>
					<rect class="ld" x="-200" width="200" height="300" fill="url(#w${k})"/>
					<g class="zm"><image class="im${sil ? ' nv' : ''}" href="${src}" width="400" height="300" preserveAspectRatio="xMidYMid slice"${sil ? ' opacity="0"' : ` filter="url(#b${k})"`}/></g>
					${sil ? `<g class="sl nv"><rect width="400" height="300" fill="url(#sg${k})"/><rect width="400" height="300" fill="#121830" mask="url(#m${k})"/></g>` : ''}
					<rect width="400" height="300" fill="url(#v${k})" pointer-events="none"/>
					<rect class="sh" x="-60" width="90" height="300" fill="url(#l${k})" pointer-events="none"/>
				</g>
				${fr.over}
			</svg></div></div>
			<div data-r="o"></div>
		</div>`;
		const root = el.querySelector('.dn-gk');
		const st = el.querySelector('.gk-st');
		const zm = el.querySelector('.zm');
		const im = el.querySelector('.im');
		const blur = el.querySelector(`#b${k} feGaussianBlur`);
		const bar = el.querySelector('.gk-pt i');
		const pts = el.querySelector('.gk-pt b');
		// yüklenince yükleme ışıltısı kalkar; yüklenemezse çerçeve boş kalır (soru yine cevaplanır)
		const probe = new Image();
		probe.onload = () => st.classList.add('ok');
		probe.src = src;
		gkOnyukle(q);

		const t0 = clock.now();
		let done = false;
		let alive = true;
		let last = '';
		const fNow = () => clamp((clock.now() - t0) / span, 0, 1);
		// kipin o andaki görünümü: bulanıklık (px), ölçek, odak
		const view = (f) => {
			const e = ease(clamp(f, 0, 1));
			if (q.mode === 'blur') {
				// netleşme puandan hızlı: sürenin ~%55'inde (20 sn'de ~11 sn) tam net; puan yine bütün aralıkta erir
				const eb = ease(clamp(f / BLUR_K, 0, 1));
				return { b: 24 * Math.pow(1 - eb, 1.35), s: 1.04 - 0.04 * eb, x: 0.5, y: 0.5 };
			}
			if (q.mode === 'zoom') return { b: 0, s: Math.exp(Math.log(5) * (1 - e)), x: f0[0], y: f0[1] };
			if (q.mode === 'detail') return { b: 0, s: Math.exp(Math.log(6.5) * (1 - e)), x: f0[0] + (0.5 - f0[0]) * e, y: f0[1] + (0.5 - f0[1]) * e };
			return { b: 0, s: 1, x: 0.5, y: 0.5 };
		};
		const apply = (o) => {
			const key = `${o.b.toFixed(1)}|${o.s.toFixed(3)}|${o.x.toFixed(3)}|${o.y.toFixed(3)}`;
			if (key === last) return;
			last = key;
			if (blur) blur.setAttribute('stdDeviation', o.b.toFixed(1));
			const X = o.x * 400;
			const Y = o.y * 300;
			// ölçek odak noktasında; odak kenara yakınsa görsel çerçeveden taşmasın (boşluk görünmesin)
			const tx = clamp(200 - X * o.s, 400 - 400 * o.s, 0);
			const ty = clamp(150 - Y * o.s, 300 - 300 * o.s, 0);
			zm.setAttribute('transform', `translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${o.s.toFixed(4)})`);
		};
		apply(view(0));
		const tick = () => {
			if (!alive || !el.isConnected) return;
			if (!done) {
				const f = fNow();
				apply(view(f));
				bar.style.setProperty('--k', (1 - f).toFixed(3));
				pts.textContent = String(Math.round(100 - 60 * f));
			}
			requestAnimationFrame(tick);
		};
		requestAnimationFrame(tick);
		const off = onClose(el, () => (alive = false));

		const ctl = mountChoice(el.querySelector('[data-r=o]'), v, api, {
			onPick() {
				done = true; // görsel cevap anında donar: puan o anda kilitlenir
			},
		});
		// şık yazısı kelime ortasından bölünmez (yumuşak tire yok): sığmayan uzun kelime ortak sığdırıcıda (fit.js) küçülür
		return {
			lock() {
				done = true;
				ctl.lock();
			},
			value: () => null,
			reveal(results) {
				done = true;
				ctl.reveal(results);
				// kalan açılışı yarım saniyede tamamla, sonra ışık geçsin
				const from = view(fNow());
				const a = clock.now();
				const step = () => {
					if (!el.isConnected) return;
					const t = clamp((clock.now() - a) / 520, 0, 1);
					const e = ease(t);
					apply({ b: from.b * (1 - e), s: from.s + (1 - from.s) * e, x: from.x + (0.5 - from.x) * e, y: from.y + (0.5 - from.y) * e });
					if (t < 1) requestAnimationFrame(step);
				};
				requestAnimationFrame(step);
				if (sil) {
					im.setAttribute('opacity', '1');
					el.querySelector('.sl')?.setAttribute('opacity', '0');
				}
				st.classList.add('rv');
				root.classList.add('rv');
				const me = results.find((r) => r.p?.human) || null;
				st.insertAdjacentHTML('beforeend', `<div class="gk-cap${me && !me.correct ? ' no' : ''}">${esc(v.opts[v.right])}</div>`);
				playSfx('iaReveal');
				const score = (r) => (r.correct ? Math.round(100 - 60 * clamp((r.time ?? sec) / (sec * SPAN), 0, 1)) : 0);
				// bilgi: soru kutusunun yerine geçer (soru artık gerekmez, cevap görselin üstünde; hiçbir ekranda taşmaz)
				const qt = el.closest('.fl-q')?.querySelector('.fl-qtext');
				if (q.b && qt) {
					qt.style.minHeight = qt.offsetHeight + 'px';
					qt.classList.add('gk-bilgi');
					qt.innerHTML = `<span class="gk-info">${BULB}<span>${esc(q.b)}</span></span>`;
				} else if (q.b) st.insertAdjacentHTML('afterend', `<div class="gk-info">${BULB}<span>${esc(q.b)}</span></div>`);
				// oyuncu puanları üst satırdaki puan sayacının yerine geçer (kart cevapta uzamaz)
				const pt = el.querySelector('.gk-pt');
				if (pt) pt.outerHTML = `<span class="gk-res">${chips(results, (r) => (r.correct ? '✓ ' + score(r) : r.value == null ? '—' : '✗'))}</span>`;
			},
			destroy() {
				alive = false;
				off?.();
			},
		};
	},
	/** Sonuç ekranındaki değer: erken bilme puanı. */
	judge(v, value) {
		const ok = value === v.right;
		return { correct: ok, err: ok ? 0 : 1 };
	},
	probe(v) {
		return { good: v.right, bad: (v.right + 1) % 4 };
	},
	bot(v, skill, R) {
		// bot da görsel açıldıkça bilir: erken cevaplarsa daha az emin
		const time = botTime(v, R, skill, 0.12, 0.85);
		const f = clamp(time / (secOf(v) * SPAN), 0, 1);
		const p = pCorrect(skill, v.q.diff) * Math.min(1, 0.6 + f * 0.9);
		const ok = R() < clamp(p, 0.05, 0.95);
		let value = v.right;
		if (!ok) do value = Math.floor(R() * 4); while (value === v.right);
		return { value, time };
	},
	publicView(v) {
		const o = JSON.parse(JSON.stringify(v));
		delete o.right;
		delete o.q.a; // a[0] doğru şık
		delete o.q.b; // bilgi satırı cevabı söyler: 'reveal' ile gelir
		return o;
	},
};
