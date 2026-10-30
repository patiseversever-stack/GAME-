// HALAT ÇEKME (deneme): 20 sn'lik canlı düello. İki komutanın arasında bir halat; art arda hızlı sorular gelir (doğru mu
// yanlış mı, hangisi daha büyük, kısa 3-4 şık). Her doğru halatı bir adım sana çeker, rakibin her doğrusu ona.
// Süre bitince halat kimin tarafındaysa o kazanır; ortadaysa az yanlış yapan (isabet), o da eşitse o skora önce ulaşan.
// ("Doğru sayısı" eşit nette yanlış sayısıyla birlikte artar, yani seri basmayı ödüllendirirdi; benzetimde rastgele
// basanın kazanma payını ~10 puan büyütüyordu. Bu yüzden eşitlikte isabet bakılır.)
//
// RASTGELE BASMA KÂRSIZDIR (kullanıcı şartı): yanlış cevap halatı rakibe bir adım çeker (−1) VE 0,9 sn kilitler.
// İki şıklı soruda rastgele basanın beklenen adımı 0, üç şıkta −1/3, dört şıkta −1/2: karışık turda beklenen halat
// konumu eksidedir. Her yeni soruda düğmeler okuma kapısı kadar kapalı (0,3 sn + metin/60 harf/sn: en hızlı okuyucudan
// hızlı, okumadan seri basanın basış sayısını yarıya indirir; şans payı küçülür). Kurallar judge içinde de yürür:
// sunucu ya da hakem kaydı yeniden oynatır, kilit içinde ya da sırasız gelen basışları saymaz. Sayısal kanıt:
// test/deneme-duello.test.mjs (rastgele basan bot ortalama bilgili bota karşı kaybeder; beklenen konumu ≤ 0).
//
// Veri: items: [{ t, o: [şıklar], r: doğru şık, d: zorluk, tf? }] (tf: DOĞRU/YANLIŞ, sırası sabit; ötekiler karışır).
// Görünüm: v.items [{ t, o, d, tf }] + v.key [doğru şık] (key yalnız sunucuda; publicView siler).
// Değer: { log: [[k, şık, t], …] } (k: sıradaki soru, t: kartın açılışından sn). Tür 'closest':
//   err = −1000·net + 10·yanlış + t_son/100 (net = doğru − yanlış = oyuncunun halata katkısı; halat = net farkı).
// Çevrimiçi akış (bkz. rapor): her basış act 'halat' { k, şık, t } olarak sunucuya gider; sunucu kendi saatiyle
// damgalar, kilidi uygular, { ok, doğru şık } döner ve iki koltuğa 'ip' { netA, netB } yayınlar (halat canlı oynar).
// Botlar: kayıt önceden üretilir (gerçekçi okuma hızı ve isabet), kart açılınca zamanına göre canlı oynatılır.
// Joker: yarı yarıya → sıradaki çok şıklı sorularda yanlış şıklardan biri (dört şıkta ikisi) söner.

import { css, esc, shuffle, pCorrect, clamp, buzz } from './util.js';
import { PLAYERS } from './timing.js';
import { appOf, stamp, onOpen, onClose, rule, stampLater, sfx, DENEME_CSS } from './d_ortak.js';
import { clock, setTimeout } from '../core/clock.js';

const len = (s) => [...String(s ?? '')].length;

export const GAP = 0.3; // yeni soru görünür olduktan sonra düğmelerin en az kapalı kaldığı süre (sn)
export const LOCK = 0.9; // yanlış cevaptan sonra kilit (sn): 0,6 sn düzeltme + sıradaki sorunun en az 0,3 sn kapısı
/**
 * Okuma kapısı (sn): yeni soru görünür olduktan sonra düğmeler bu kadar kapalı. En hızlı okuyucudan (timing.js
 * PLAYERS.fast, 39 harf/sn) hızlıdır, dürüst oyuncuyu bekletmez; ama okumadan seri basanın basış sayısını yarıya
 * indirir (rastgele basmanın şans payı, yani varyansı küçülür).
 */
export const gate = (it) => GAP + len(it.t) / 60 + (it.tf ? 0 : it.o.reduce((s, o) => s + len(o), 0) / 90);
const STEPS = 7; // halatın görünen en uç adımı
const SX = 15; // adım başına düğüm kayması (viewBox birimi)
const CX = 180;
const HY = 58; // ellerin yüksekliği


/** Bir kaydı kurallarla yeniden oynat (sunucu da aynısını yapar). */
export function tally(v, log, cap = (v.sec || 20) + 16) {
	const n = v.items.length;
	let k = 0;
	let next = gate(v.items[0]);
	let net = 0;
	let ok = 0;
	let bad = 0;
	let tEnd = 0;
	const steps = [];
	for (const e of Array.isArray(log) ? log : []) {
		if (!Array.isArray(e)) continue;
		const [ki, pick, t] = e;
		if (ki !== k || !Number.isFinite(t) || t < next - 0.02 || t > cap) continue;
		const right = v.key ? v.key[ki % n] === pick : null;
		if (right) {
			net++;
			ok++;
			tEnd = t;
		} else {
			net--;
			bad++;
		}
		// sıradaki soru: doğruda hemen, yanlışta düzeltmeden sonra görünür; düğmeler okuma kapısı kadar kapalı
		next = t + (right ? 0 : LOCK - GAP) + gate(v.items[(ki + 1) % n]);
		steps.push({ k: ki, pick, t, right });
		k++;
	}
	return { net, ok, bad, tEnd, steps };
}

/**
 * Bir oyuncunun turu (bot ve benzetim): skill ile isabet, okuma hızı; mode 'random' → okumadan, izin verilen ilk
 * anda rastgele basar (kullanıcının "rastgele basan" senaryosu).
 */
export function play(v, skill, R, mode = 'know') {
	const sec = v.sec || 20;
	const log = [];
	let t = 0.35 + R() * 0.3; // kart açılışına tepki
	let k = 0;
	const n = v.items.length;
	for (;;) {
		const it = v.items[k % n];
		const m = it.o.length;
		let dt;
		const g = gate(it);
		if (mode === 'random') dt = g + 0.05 + R() * 0.2; // düğme açılır açılmaz
		else {
			// okuma: ifade + (çok şıklıda) şıklar, blitz botuyla aynı ölçü; usta bot daha çabuk
			const L = len(it.t) + (it.tf ? 0 : 0.6 * it.o.reduce((s, o) => s + len(o), 0));
			dt = Math.max(g + 0.1, (L / 20 + 0.55) * (1.15 - 0.5 * skill) * (0.75 + R() * 0.5));
		}
		t += dt;
		if (t > sec) break;
		const right = v.key[k % n];
		let pick = right;
		if (mode === 'random') pick = Math.floor(R() * m);
		else if (R() >= (m === 2 ? Math.min(0.97, pCorrect(skill, it.d) + 0.1) : pCorrect(skill, it.d))) {
			do pick = Math.floor(R() * m);
			while (pick === right);
		}
		log.push([k, pick, Math.round(t * 100) / 100]);
		if (pick !== right) t += LOCK - GAP;
		k++;
	}
	return log;
}

const CSS = /* css */ `
.dn-ht{display:flex;flex-direction:column;gap:8px;user-select:none;-webkit-user-select:none}
.dn-ht-arena{position:relative;height:112px;border-radius:16px;overflow:hidden;background:linear-gradient(180deg,#0e2150,#1a356c 70%,#20406e);border:2.5px solid rgba(255,255,255,.22);box-shadow:inset 0 -10px 22px rgba(0,0,0,.35)}
.dn-ht-arena svg{position:absolute;inset:0;width:100%;height:100%}
.dn-ht-dust{position:absolute;bottom:10px;width:26px;height:12px;border-radius:50%;background:radial-gradient(#e8d6b0,rgba(232,214,176,0));opacity:0;z-index:1;pointer-events:none}
.dn-ht-dust.L{left:calc(3.5% + 30px);--dx:-4px}.dn-ht-dust.R{right:calc(3.5% + 30px);--dx:4px}
.dn-ht-dust.on{animation:dnHtDust .5s ease-out}
.dn-ht-cmd{position:absolute;bottom:14px;width:50px;transform-origin:50% 100%;transition:transform .18s ease-out;z-index:2}
.dn-ht-cmd.L{left:3.5%}
.dn-ht-cmd.R{right:3.5%}
.dn-ht-cmd .fl-av{width:50px;height:50px;border-radius:14px;border:3px solid var(--pc,#fff);box-shadow:0 4px 0 rgba(0,0,0,.4)}
.dn-ht-cmd.pull{animation:dnHtPullL .32s ease-out}
.dn-ht-cmd.R.pull{animation-name:dnHtPullR}
.dn-ht-cmd.slip{animation:dnHtSlipL .4s ease-out}
.dn-ht-cmd.R.slip{animation-name:dnHtSlipR}
.dn-ht-cmd.lost{animation:dnHtLostL .9s cubic-bezier(.5,0,.6,1) forwards}
.dn-ht-cmd.R.lost{animation-name:dnHtLostR}
.dn-ht-cmd.won{animation:dnHtWon .7s cubic-bezier(.3,1.6,.5,1) 2}
.dn-ht-sc{position:absolute;top:6px;z-index:3;min-width:34px;padding:0 7px 1px;border-radius:10px;text-align:center;font-family:'Lilita One';font-size:17px;line-height:1.3;color:#fff;background:var(--pc,#555);border:2px solid #fff;box-shadow:0 3px 0 rgba(0,0,0,.35);transition:transform .15s}
.dn-ht-sc.L{left:8px}.dn-ht-sc.R{right:8px}
.dn-ht-sc.pop{transform:scale(1.3)}
.dn-ht-sc small{font-family:'Fredoka';font-size:10px;font-weight:600;opacity:.9;margin-left:2px}
.dn-ht-mid{position:absolute;left:50%;top:6px;transform:translateX(-50%);z-index:3;padding:1px 10px 2px;border-radius:9px;font-family:'Lilita One';font-size:13px;letter-spacing:.06em;white-space:nowrap;color:#ffe7a0;background:rgba(6,14,38,.75);border:1.5px solid rgba(255,210,90,.5)}
.dn-ht.hot .dn-ht-mid{color:#fff;background:#c8352a;border-color:#fff;animation:dnHtBeat .5s ease-in-out infinite}
.dn-ht-combo{position:absolute;top:30px;z-index:3;font-family:'Lilita One';font-size:15px;color:#ff9a3a;text-shadow:0 2px 0 rgba(0,0,0,.5);opacity:0;transform:scale(.6);transition:opacity .2s,transform .25s cubic-bezier(.3,1.6,.5,1)}
.dn-ht-combo.L{left:10px}.dn-ht-combo.R{right:10px}
.dn-ht-combo.on{opacity:1;transform:scale(1)}
.dn-ht-q{position:relative;min-height:74px;display:grid;place-items:center;padding:16px 12px 8px;border-radius:16px;text-align:center;overflow:hidden;
  background:linear-gradient(180deg,rgba(255,255,255,.16),rgba(255,255,255,.06));border:2.5px solid rgba(255,255,255,.28);font-size:clamp(16px,calc(4.6 * var(--vw)),20px);line-height:1.22;font-weight:600;text-wrap:balance}
.dn-ht-q>span{display:block;animation:dnHtIn .22s ease-out}
.dn-ht-q>i{position:absolute;left:10px;top:4px;font-style:normal;font-family:'Lilita One';font-size:10.5px;letter-spacing:.12em;color:#9fc4ff}
.dn-ht-q>u{position:absolute;right:10px;top:4px;text-decoration:none;font-family:'Lilita One';font-size:10.5px;letter-spacing:.08em;color:#9fc4ff}
.dn-ht-q.ok{border-color:#7dff9a;box-shadow:0 0 0 3px rgba(125,255,154,.35)}
.dn-ht-q.no{border-color:#ff6a5a;box-shadow:0 0 0 3px rgba(255,106,90,.35);animation:flq-shake .38s}
.dn-ht-q .fix{display:block;margin-top:4px;font-size:13px;color:#ffb0a0}
.dn-ht-a{position:relative}
.dn-ht-a .fl-tf .fl-opt{min-height:64px;font-size:23px}
.dn-ht-a .fl-tf .fl-opt::before{width:26px;height:26px}
.dn-ht-g{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.dn-ht-g .fl-opt{min-height:52px;justify-content:center;text-align:center;padding:6px 8px 7px;font-size:clamp(14.5px,calc(4.1 * var(--vw)),17px)}
.dn-ht-g.n3 .fl-opt:first-child{grid-column:1/3}
.dn-ht-a .fl-opt.wait{pointer-events:none;opacity:.5;filter:saturate(.6)}
.dn-ht-a .fl-opt.gone{opacity:.14;pointer-events:none}
.dn-ht-a.lock .fl-opt{opacity:.35;pointer-events:none;filter:grayscale(.6)}
.dn-ht-rd{position:absolute;left:8%;right:8%;top:-5px;height:3px;border-radius:2px;background:#9fc4ff;transform-origin:left;transform:scaleX(0);opacity:0}
.dn-ht-a.read .dn-ht-rd{opacity:.8;animation:dnHtRd var(--gt) linear forwards}
.dn-ht-lk{position:absolute;left:8%;right:8%;bottom:-6px;height:5px;border-radius:3px;background:#ff6a5a;transform-origin:left;transform:scaleX(0);opacity:0}
.dn-ht-a.lock .dn-ht-lk{opacity:1;animation:dnHtLk var(--lk) linear forwards}
.dn-ht.done .dn-ht-q,.dn-ht.done .dn-ht-a{display:none}
.dn-ht-rows{display:none;flex-direction:column;gap:3px;font-size:12.5px;text-align:left}
.dn-ht.done .dn-ht-rows{display:flex}
.dn-ht-rows div{display:flex;gap:7px;align-items:center;padding:3px 8px;border-radius:8px;background:rgba(255,255,255,.06)}
.dn-ht-rows div.n{background:rgba(255,80,60,.2)}
.dn-ht-rows span:nth-child(2){min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dn-ht-rows em{margin-left:auto;flex:none;font-style:normal;font-family:'Lilita One';opacity:.85}
.dn-ht.hot .rope{animation:dnHtTaut .09s linear infinite}
@keyframes dnHtIn{from{transform:translateY(12px) scale(.96)}}
@keyframes dnHtDust{from{opacity:.85;transform:translateX(var(--dx)) scale(.4)}to{opacity:0;transform:translateX(calc(var(--dx) * 4)) scale(1.5)}}
@keyframes dnHtRd{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes dnHtLk{from{transform:scaleX(1)}to{transform:scaleX(0)}}
@keyframes dnHtPullL{40%{transform:translateX(-7px) rotate(-14deg)}}
@keyframes dnHtPullR{40%{transform:translateX(7px) rotate(14deg)}}
@keyframes dnHtSlipL{35%{transform:translateX(9px) rotate(10deg)}}
@keyframes dnHtSlipR{35%{transform:translateX(-9px) rotate(-10deg)}}
@keyframes dnHtLostL{30%{transform:translateX(20px) rotate(18deg)}to{transform:translateX(70px) rotate(80deg) translateY(10px);opacity:.75}}
@keyframes dnHtLostR{30%{transform:translateX(-20px) rotate(-18deg)}to{transform:translateX(-70px) rotate(-80deg) translateY(10px);opacity:.75}}
@keyframes dnHtWon{40%{transform:translateY(-12px) scale(1.12)}}
@keyframes dnHtBeat{50%{transform:translateX(-50%) scale(1.1)}}
@keyframes dnHtTaut{50%{transform:translateY(.7px)}}
`;

const ropeTex = (d) =>
	`<path d="${d}" fill="none" stroke="#6a4420" stroke-width="7" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#d6a866" stroke-width="5" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#8a5a2a" stroke-width="5" stroke-dasharray="2.2 3.2" stroke-linecap="butt"/><path d="${d}" fill="none" stroke="#fff3d0" stroke-width="1" opacity=".45" transform="translate(0,-1.4)"/>`;

function arenaSVG(cL, cR) {
	const marks = [];
	for (let i = 1; i <= STEPS; i++) for (const s of [-1, 1]) marks.push(`<line x1="${CX + s * i * SX}" y1="98" x2="${CX + s * i * SX}" y2="${i % 3 === 0 ? 92 : 95}" stroke="#cfe0ff" stroke-opacity="${i % 3 === 0 ? 0.6 : 0.3}" stroke-width="1.2"/>`);
	return `<svg viewBox="0 0 360 112" preserveAspectRatio="none" aria-hidden="true">
		<defs><linearGradient id="dnHtG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a3a1e"/><stop offset="1" stop-color="#2a1a0c"/></linearGradient></defs>
		<path d="M0,74 C60,64 110,72 180,66 S300,62 360,72 L360,98 L0,98Z" fill="#14285a" opacity=".7"/>
		<rect x="0" y="98" width="360" height="14" fill="url(#dnHtG)"/>
		<rect x="0" y="98" width="${CX}" height="3" fill="${cL}" opacity=".8"/><rect x="${CX}" y="98" width="${CX}" height="3" fill="${cR}" opacity=".8"/>
		<rect class="zone" x="${CX - 1}" y="30" width="2" height="68" fill="#ffd25a" opacity=".7"/>
		<path d="M${CX},30 l12,4 -12,4z" fill="#ffd25a"/>
		${marks.join('')}
		<g class="rope"><g class="tails"></g><g class="main"></g>
			<g fill="#f2c08a" stroke="#5a3214" stroke-width="1.4"><circle cx="66" cy="58" r="5"/><circle cx="58" cy="60" r="4.4"/><circle cx="294" cy="58" r="5"/><circle cx="302" cy="60" r="4.4"/></g>
			<g class="knot"><path d="M-5,0 L-12,-9 L-9,0 L-12,9Z M5,0 L12,-9 L9,0 L12,9Z" fill="#e8343c" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/><circle r="5.5" fill="#e8343c" stroke="#fff" stroke-width="1.6"/><circle r="2" cx="-1.5" cy="-1.5" fill="#fff" opacity=".6"/></g>
		</g>
	</svg>`;
}

export const halat = {
	time: 20,
	label: 'Halat Çekme',
	kind: 'closest',
	keep: true,
	jokers: ['yari'],
	fmt: (v, value) => {
		const s = tally(v, value?.log);
		return `${s.net > 0 ? '+' : ''}${s.net} adım`;
	},
	sub: (v, value) => {
		const s = tally(v, value?.log);
		return `${s.ok} doğru · ${s.bad} yanlış`;
	},
	prepare(q, R) {
		const items = shuffle(q.items, R).map((it) => {
			if (it.tf) return { it, o: it.o.slice(), r: it.r };
			const idx = shuffle(it.o.map((_, i) => i), R);
			return { it, o: idx.map((i) => it.o[i]), r: idx.indexOf(it.r) };
		});
		const { items: _, ...pub } = q;
		const v = { q: pub, items: items.map((x) => ({ t: x.it.t, o: x.o, d: x.it.d || 2, ...(x.it.tf ? { tf: true } : {}) })), key: items.map((x) => x.r) };
		return stamp(v, q, (q2, k, P, text) => {
			// sabit tur: ortanca oyuncu ~8 soruyu okuyup cevaplayabilsin (yıldırım turu ölçüsü)
			const avg = v.items.reduce((s, x) => s + len(x.t), 0) / Math.max(1, v.items.length);
			return { think: 0, act: (8 * (avg / 20 + 0.55)) / PLAYERS.med.act };
		});
	},
	mount(el, v, api) {
		css('deneme', DENEME_CSS);
		css('halat', CSS);
		const app = appOf();
		const m = app?.match;
		const card = el.closest('.fl-q');
		// iki taraf: kartın başlığındaki plakalar (soldaki saldıran); insan canlı, bot kaydı zamanında oynatılır
		const plates = [...(card?.querySelectorAll('.fl-qwho .fl-qp') || [])];
		const who = plates.slice(0, 2).map((e) => {
			const i = Number(e.dataset.p);
			const p = m?.players?.[i];
			const b = m?.cur?.v === v ? m.cur.bots?.find((x) => x.p?.i === i) : null;
			return { i, p, el: e, name: p?.name || e.querySelector('.nm b')?.textContent || '', color: p?.css || getComputedStyle(e).getPropertyValue('--pc') || '#888', av: e.querySelector('.fl-av')?.outerHTML || '', human: !!p?.human, steps: b ? tally(v, b.value?.log).steps : null, net: 0, ok: 0, j: 0, combo: 0 };
		});
		while (who.length < 2) who.push({ i: -1, name: who.length ? 'Rakip' : 'Sen', color: who.length ? '#4a8cff' : '#e8343c', av: '<span class="fl-av"></span>', human: !who.length, steps: null, net: 0, ok: 0, j: 0, combo: 0 });
		const meS = who.findIndex((w) => w.human);
		const [L, Rt] = who;
		el.innerHTML = `<div class="dn-ht">
			<div class="dn-ht-arena">${arenaSVG(L.color, Rt.color)}
				<div class="dn-ht-cmd L" style="--pc:${L.color}">${L.av}</div><div class="dn-ht-cmd R" style="--pc:${Rt.color}">${Rt.av}</div>
				<b class="dn-ht-sc L" style="--pc:${L.color}">0</b><b class="dn-ht-sc R" style="--pc:${Rt.color}">0</b>
				<i class="dn-ht-dust L"></i><i class="dn-ht-dust R"></i><span class="dn-ht-combo L"></span><span class="dn-ht-combo R"></span>
				<span class="dn-ht-mid">HALAT ORTADA</span>
			</div>
			<div class="dn-ht-q"><i></i><u></u><span></span></div>
			<div class="dn-ht-a"><i class="dn-ht-rd"></i><div class="dn-ht-btns"></div><i class="dn-ht-lk"></i></div>
			<div class="dn-ht-rows"></div>
		</div>`;
		rule(el, 'Halatı kendine çek');
		const root = el.querySelector('.dn-ht');
		const svg = root.querySelector('svg');
		const ropeMain = svg.querySelector('.main');
		const ropeTails = svg.querySelector('.tails');
		const knot = svg.querySelector('.knot');
		const cmd = [root.querySelector('.dn-ht-cmd.L'), root.querySelector('.dn-ht-cmd.R')];
		const sc = [root.querySelector('.dn-ht-sc.L'), root.querySelector('.dn-ht-sc.R')];
		const dust = [root.querySelector('.dn-ht-dust.L'), root.querySelector('.dn-ht-dust.R')];
		const combo = [root.querySelector('.dn-ht-combo.L'), root.querySelector('.dn-ht-combo.R')];
		const mid = root.querySelector('.dn-ht-mid');
		const stage = root.querySelector('.dn-ht-q');
		const sTxt = stage.querySelector('span');
		const sKind = stage.querySelector('i');
		const sNo = stage.querySelector('u');
		const ans = root.querySelector('.dn-ht-a');
		const btnHost = root.querySelector('.dn-ht-btns');
		ans.style.setProperty('--lk', LOCK - GAP + 's');

		// ---------------------------------------------------------------- halat (kare kare; durunca biter)
		let kx = CX; // düğümün görünen yeri
		let kv = 0;
		let tension = 0; // çekişte 1'e sıçrar, söner
		let alive = true;
		let hot = false;
		let t0 = null; // kart açıldı (sn)
		let frozen = false;
		const now = () => (t0 == null ? 0 : (clock.now() - t0) / 1000);
		const pos = () => L.net - Rt.net; // + : sola (L) çekili
		const restart = (e, cls) => {
			e.classList.remove('pull', 'slip');
			void e.offsetWidth;
			e.classList.add(cls);
		};
		const midText = () => {
			if (hot && !frozen) return;
			const p = pos();
			const lead = p === 0 ? null : p > 0 ? L : Rt;
			mid.textContent = !lead ? 'HALAT ORTADA' : `${lead.human ? 'SEN' : lead.name.toLocaleUpperCase('tr-TR')} ÖNDE · ${Math.abs(p)}`;
		};
		/** Bir taraf çekti (dir: +1 kendine, −1 yanlış: halat kaydı). */
		const pull = (s, right) => {
			const w = who[s];
			w.net += right ? 1 : -1;
			if (right) w.ok++;
			w.combo = right ? w.combo + 1 : 0;
			sc[s].textContent = (w.net > 0 ? '+' : '') + w.net;
			sc[s].classList.add('pop');
			setTimeout(() => sc[s].classList.remove('pop'), 160);
			combo[s].textContent = w.combo >= 3 ? `🔥 x${w.combo}` : '';
			combo[s].classList.toggle('on', w.combo >= 3);
			if (right) {
				restart(cmd[s], 'pull');
				dust[s].classList.remove('on');
				void dust[s].offsetWidth;
				dust[s].classList.add('on');
				restart(cmd[1 - s], 'slip');
				tension = 1;
				app?.cam?.impulse?.(s === meS ? 0.14 : 0.08);
				if (s !== meS) {
					sfx(app, 'whoosh');
					if (meS >= 0) buzz(10);
				}
			} else {
				restart(cmd[s], 'slip');
				tension = 0.5;
			}
			midText();
		};
		const draw = () => {
			const t = clock.now() / 1000;
			const target = CX - clamp(pos(), -STEPS, STEPS) * SX;
			// yay-sönüm: çekişte düğüm hızla kayar, hafifçe geri teper
			kv += (target - kx) * 0.16;
			kv *= 0.72;
			kx += kv;
			tension = Math.max(0, tension - 0.035);
			const jit = hot && !frozen ? Math.sin(t * 46) * 0.9 : 0;
			const sag = 7 - tension * 6.5 + jit;
			const ky = HY + 1 + sag * 0.35;
			const hl = 66 - (tension > 0.5 && pos() >= 0 ? 2 : 0);
			const hr = 294;
			ropeMain.innerHTML = ropeTex(`M${hl},${HY} Q${((hl + kx) / 2).toFixed(1)},${(HY + sag).toFixed(1)} ${kx.toFixed(1)},${ky.toFixed(1)} Q${((kx + hr) / 2).toFixed(1)},${(HY + sag).toFixed(1)} ${hr},${HY}`);
			knot.setAttribute('transform', `translate(${kx.toFixed(1)},${ky.toFixed(1)}) rotate(${(kv * 2).toFixed(1)})`);
			// komutanlar halatın gerginliğiyle geriye yaslanır; önde olan daha çok
			const p = clamp(pos(), -STEPS, STEPS) / STEPS;
			cmd[0].style.transform = `rotate(${(-6 - 6 * tension - 5 * p).toFixed(1)}deg)`;
			cmd[1].style.transform = `rotate(${(6 + 6 * tension - 5 * p).toFixed(1)}deg)`;
		};
		ropeTails.innerHTML = ropeTex('M66,58 Q40,74 30,96 L8,98') + ropeTex('M294,58 Q320,74 330,96 L352,98');
		const loop = () => {
			if (!alive || !root.isConnected) return;
			// bot taraflarının kaydı: kart açıldığından beri geçen süreye göre
			if (t0 != null && !frozen) {
				const e = now();
				for (let s = 0; s < 2; s++) {
					const w = who[s];
					while (w.steps && w.j < w.steps.length && w.steps[w.j].t <= e) pull(s, w.steps[w.j++].right);
				}
				gateTick(e);
				const left = (v.sec || 20) - e;
				if (!hot && left <= 5 && left > 0) {
					hot = true;
					root.classList.add('hot');
					mid.textContent = 'SON 5 SANİYE!';
					buzz(30);
				}
			}
			draw();
			requestAnimationFrame(loop);
		};
		draw();
		requestAnimationFrame(loop);
		onClose(el, () => (alive = false));

		// ---------------------------------------------------------------- sorular (insan)
		const me = meS >= 0 ? who[meS] : null;
		const log = [];
		const mine = [];
		let k = 0;
		let done = false;
		let lock = false;
		let lockUntil = 0; // yanlıştan sonra düzeltme bitişi (sn, kartın açılışından)
		let readyAt = gate(v.items[0]); // hakemin 'next'i: bu andan önceki basış sayılmaz (tally ile aynı kural)
		let hide = null; // yarı yarıya: { madde: [sönen şıklar] }
		let hideLeft = 0;
		const n = v.items.length;
		const show = () => {
			const it = v.items[k % n];
			sKind.textContent = it.tf ? 'DOĞRU MU?' : it.o.length === 2 ? 'HANGİSİ?' : 'SEÇ';
			sNo.textContent = `${k + 1}. SORU`;
			sTxt.textContent = it.t;
			sTxt.style.animation = 'none';
			void sTxt.offsetWidth;
			sTxt.style.animation = '';
			stage.classList.remove('ok', 'no');
			btnHost.innerHTML = it.tf
				? `<div class="fl-tf"><button class="fl-opt fl-yes wait" data-i="0"><span>DOĞRU</span></button><button class="fl-opt fl-no wait" data-i="1"><span>YANLIŞ</span></button></div>`
				: `<div class="dn-ht-g n${it.o.length}">${it.o.map((o, i) => `<button class="fl-opt wait" data-i="${i}"><span>${esc(o)}</span></button>`).join('')}</div>`;
			const hd = hide?.[k % n];
			if (hd && hideLeft > 0 && !it.tf) {
				hideLeft--;
				for (const i of hd) btnHost.querySelectorAll('.fl-opt')[i]?.classList.add('gone');
			}
			// okuma kapısı: düğmeler readyAt'e dek kapalı (ince çubuk dolar); açılışı oyun saatiyle kare döngüsü yapar
			ans.style.setProperty('--gt', Math.max(0.05, readyAt - now()).toFixed(2) + 's');
			ans.classList.remove('read');
			void ans.offsetWidth;
			ans.classList.add('read');
			gateTick(now());
		};
		/** Kare başına: kilit bittiyse sıradaki soru, kapı açıldıysa düğmeler (hakemle aynı saat: kartın açılışı). */
		function gateTick(e) {
			if (done || t0 == null) return;
			if (lock && e >= lockUntil) {
				lock = false;
				ans.classList.remove('lock');
				show();
				return;
			}
			if (!lock && e >= readyAt && btnHost.querySelector('.fl-opt.wait')) {
				for (const b of btnHost.querySelectorAll('.fl-opt.wait')) b.classList.remove('wait');
				ans.classList.remove('read');
			}
		}
		show();
		onOpen(el, () => {
			t0 = clock.now();
		});
		btnHost.addEventListener('click', (e) => {
			const b = e.target.closest('.fl-opt');
			if (!b || done || lock || t0 == null || b.classList.contains('wait') || b.classList.contains('gone')) return;
			const t = Math.round(now() * 100) / 100;
			if (t < readyAt) return;
			const pick = Number(b.dataset.i);
			const it = v.items[k % n];
			log.push([k, pick, t]);
			// bu sorunun düğmeleri hemen kapanır (sıradaki soru görünene ve kapısı açılana dek basış sayılmaz)
			for (const x of btnHost.querySelectorAll('.fl-opt')) if (x !== b) x.classList.add('wait');
			const right = v.key ? v.key[k % n] === pick : null;
			mine.push({ t: it.t, a: v.key ? it.o[v.key[k % n]] : '', right });
			k++;
			readyAt = t + (right === false ? LOCK - GAP : 0) + gate(v.items[k % n]);
			if (right === null) {
				// çevrimiçi: doğru şık sunucuda; halat sunucunun 'ip' yayınıyla oynar (bkz. dosya başı)
				setTimeout(() => !done && show(), 120);
				return;
			}
			if (me) pull(meS, right);
			if (right) {
				stage.classList.add('ok');
				const fx = app?.ui?.fx;
				if (fx) {
					const r = b.getBoundingClientRect();
					fx.text(r.left + r.width / 2, r.top, '+1', { cls: 'dn dn-gold', life: 700 });
				}
				sfx(app, me?.combo >= 3 ? 'combo' : 'right');
				buzz(14);
				setTimeout(() => !done && show(), 120);
			} else {
				b.classList.add('wrong');
				stage.classList.add('no');
				sTxt.insertAdjacentHTML('beforeend', `<b class="fix">Doğrusu: ${esc(it.o[v.key[(k - 1) % n]])} · −1</b>`);
				sfx(app, 'wrong');
				buzz(45);
				app?.cam?.impulse?.(0.1);
				lock = true;
				lockUntil = t + LOCK - GAP;
				ans.classList.add('lock');
			}
		});

		return {
			lock() {
				done = true;
				frozen = true;
			},
			value: () => ({ log: log.map((x) => x.slice()) }),
			joker(e) {
				if (!e?.hide) return;
				hide = e.hide;
				hideLeft = 6;
				app?.ui?.toast?.('Sıradaki çok şıklı sorularda yanlışlar sönüyor', { tone: 'good', ms: 1800 });
			},
			reveal(results) {
				done = true;
				frozen = true;
				root.classList.remove('hot');
				// son durum: hakemin hesabı (bütün kayıtlar)
				for (const r of results) {
					const s = who.findIndex((w) => w.i === r.i);
					if (s < 0) continue;
					const tl = tally(v, r.value?.log);
					who[s].net = tl.net;
					who[s].ok = tl.ok;
					sc[s].textContent = (tl.net > 0 ? '+' : '') + tl.net;
				}
				tension = 1;
				const order = results.slice().sort((a, b) => a.err - b.err || a.time - b.time);
				const win = order[0];
				const ws = who.findIndex((w) => w.i === win?.i);
				const p = pos();
				mid.textContent = p === 0 ? 'ORTADA · İSABET' : `${Math.abs(p)} ADIM`;
				if (ws >= 0) {
					setTimeout(() => {
						cmd[ws].classList.remove('pull', 'slip');
						cmd[1 - ws].classList.remove('pull', 'slip');
						cmd[1 - ws].classList.add('lost');
						cmd[ws].classList.add('won');
						app?.cam?.impulse?.(0.35);
						sfx(app, 'cheer');
						const fx = app?.ui?.fx;
						if (fx) {
							const r = cmd[ws].getBoundingClientRect();
							fx.burst(r.left + r.width / 2, r.top + r.height / 2, { n: 18, dist: 90, colors: [who[ws].color, '#ffd25a', '#fff'], kind: 'star', size: 12, life: 800 });
						}
					}, 350);
				}
				root.classList.add('done');
				root.querySelector('.dn-ht-rows').innerHTML = mine
					.slice(-3)
					.map((l) => `<div class="${l.right ? '' : 'n'}"><span>${l.right ? '✓' : '✗'}</span><span>${esc(l.t)}</span><em>${esc(l.a)}</em></div>`)
					.join('');
				const meR = results.find((r) => r.p?.human);
				if (meR && app && win) {
					const tl = tally(v, meR.value?.log);
					const lead = Math.abs(p);
					if (win === meR) stampLater(app, 'HALATI ÇEKTİN!', 'gold', p === 0 ? 'Halat ortada: senin isabetin yüksek' : `${lead} adım sende · ${tl.ok} doğru`);
					else stampLater(app, 'HALAT KAÇTI', 'bad', p === 0 ? `Halat ortada: ${win.name} daha az yanıldı` : `${win.name} ${lead} adım çekti`);
				}
				setTimeout(() => {
					const w = el.closest('.fl-q')?.querySelector('.fl-cr.win .tag');
					if (w) w.textContent = 'ÇEKTİ';
				}, 0);
			},
			destroy() {
				alive = false;
			},
		};
	},
	joker(id, v) {
		if (id !== 'yari') return null;
		// çok şıklı her soruda sönecek yanlışlar (dört şıkta iki, üç şıkta bir); kart sıradakilere uygular
		const hide = {};
		v.items.forEach((it, i) => {
			if (it.tf || it.o.length < 3) return;
			const wrong = it.o.map((_, j) => j).filter((j) => j !== v.key[i]);
			hide[i] = wrong.slice(0, it.o.length >= 4 ? 2 : 1);
		});
		return { hide };
	},
	/** Çevrimiçi görünüm: soru yazıları ve şıklar; doğru şıklar (key) sunucuda. */
	publicView(v) {
		const o = JSON.parse(JSON.stringify(v));
		delete o.key;
		delete o.q.items;
		return o;
	},
	judge(v, value) {
		const s = tally(v, value?.log);
		if (!value) return { correct: false, err: 1e5, net: 0 };
		return { correct: s.net >= 3, err: -1000 * s.net + 10 * s.bad + s.tEnd / 100, net: s.net };
	},
	bot(v, skill, R) {
		return { value: { log: play(v, skill, R) }, time: v.sec || 20 };
	},
	/** Sınama örneği (test/deneme.test.mjs): kapı açılır açılmaz hep doğru / hep yanlış basan iki kayıt (12 sn). */
	ornek(v) {
		const n = v.items.length;
		const rec = (bad) => {
			const log = [];
			for (let k = 0, t = 0; ; k++) {
				const it = v.items[k % n];
				t += gate(it) + 0.2;
				if (t > 12) return { log };
				log.push([k, bad ? (v.key[k % n] + 1) % it.o.length : v.key[k % n], Math.round(t * 100) / 100]);
				if (bad) t += LOCK - GAP;
			}
		};
		return { good: rec(false), bad: rec(true) };
	},
};
