// İL AVI · SICAK SOĞUK (deneme): kartta gizli ilin silueti (kuzey yukarıda) ve bir ipucu; oyuncu haritada bir ile
// dokunur. Doğruysa il altına boyanır. Değilse dokunduğu il UZAKLIĞIN RENGİNE boyanır (kızgın kırmızıdan buz
// mavisine), üstünde "340 km ↗" yazar ve yeni bir ipucu açılır. En çok 4 deneme. Worldle'ın silueti, Globle'ın
// sıcak-soğuk boyası ve Kelime Oyunu'nun açılan ipuçları, 3B maket haritada.
//
// Veri: il: gizli ilin plakası, hints: [ipucu, …] (ilk ipucu baştan görünür, her yanlışta bir sonraki açılır),
//       tries?: deneme hakkı (varsayılan 4)
// Değer: { taps: [plaka, …] } (sırayla). Sunucu uzaklığı ve yargıyı il merkezlerinden yeniden hesaplar.
// Görünüm: v.hedef = gizli ilin dizini (adı `target` DEĞİL: arayüz haritalı tiplerde v.target'ı iğne hedefi sanar).
// Tür 'closest': bulduysa err = deneme − 1 (ilk dokunuşta 0); bulamadıysa err = 10 + en yakın uzaklık/100.
// Çevrimiçi: gizli il yalnız sunucuda kalır; her dokunuşu sunucu yanıtlar (adam asmacadaki 'harf' gibi: act 'il'
// → ev { plaka, km, yön }). Siluet istemciye gider (tipin doğası); harita verisiyle eşleştirilebilir, bu yüzden
// çevrimiçinde siluet hafifçe sadeleştirilip ölçeği gizlenmiş olarak gönderilmeli.
// Joker: yarı yarıya → gizli ilin bölgesi parlar; seyirci → gizli ile komşu bir il parlar.

import { css, esc, pCorrect, clamp, buzz } from './util.js';
import { botTime } from './timing.js';
import { KM_PER_UNIT } from './types.js';
import { appOf, stamp, guard, onClose, cardTop, tag, pop, sfx, rule, stampLater, LOOK, ACT, DENEME_CSS } from './d_ortak.js';
import { setTimeout } from '../core/clock.js';
import DATA from '../data/turkiye.json';

const PROV = DATA.provinces;
const BY_ID = new Map(PROV.map((p, i) => [p.id, i]));
const REGION = { marmara: 'Marmara', karadeniz: 'Karadeniz', ege: 'Ege', akdeniz: 'Akdeniz', icanadolu: 'İç Anadolu', dogu: 'Doğu Anadolu', guneydogu: 'Güneydoğu Anadolu' };
const TRIES = 4;

/** Uzaklığın rengi ve adı (km). */
export const HEAT = [
	[120, '#ff3b1f', 'Kızgın'],
	[250, '#ff8a1a', 'Sıcak'],
	[450, '#ffc93a', 'Ilık'],
	[700, '#7cc8ff', 'Serin'],
	[Infinity, '#2f6bff', 'Buz gibi'],
];
const heat = (km) => HEAT.find((h) => km < h[0]);
const ARROWS = ['→', '↗', '↑', '↖', '←', '↙', '↓', '↘'];

/** İki il merkezi arası kuş uçuşu (km) ve a'dan b'ye yön oku. */
export function between(a, b) {
	const pa = PROV[a].center;
	const pb = PROV[b].center;
	const dx = pb[0] - pa[0];
	const dy = pb[1] - pa[1]; // kuzey artı
	const km = Math.round(Math.hypot(dx, dy) * KM_PER_UNIT);
	const s = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
	return { km, dir: ARROWS[((s % 8) + 8) % 8] };
}

/** İlin silueti: SVG yolu (kuzey yukarıda), kutuya sığdırılmış. */
function silhouette(i, S = 100) {
	const rings = PROV[i].rings;
	let x0 = Infinity;
	let x1 = -Infinity;
	let y0 = Infinity;
	let y1 = -Infinity;
	for (const r of rings)
		for (let k = 0; k < r.length; k += 2) {
			x0 = Math.min(x0, r[k]);
			x1 = Math.max(x1, r[k]);
			y0 = Math.min(y0, -r[k + 1]);
			y1 = Math.max(y1, -r[k + 1]);
		}
	const s = (S - 8) / Math.max(x1 - x0, y1 - y0);
	const ox = (S - (x1 - x0) * s) / 2;
	const oy = (S - (y1 - y0) * s) / 2;
	const f = (x) => (Math.round(x * 10) / 10).toString();
	return rings
		.map((r) => {
			let d = '';
			for (let k = 0; k < r.length; k += 2) d += (k ? 'L' : 'M') + f(ox + (r[k] - x0) * s) + ' ' + f(oy + (-r[k + 1] - y0) * s);
			return d + 'Z';
		})
		.join('');
}

/** Dokunuşlardan sonuç: { found, tries, minKm } (sunucu da aynı hesabı yapar). */
function result(v, taps) {
	const list = (Array.isArray(taps) ? taps : []).map((id) => BY_ID.get(id)).filter((i) => i != null).slice(0, v.tries);
	const at = list.indexOf(v.hedef);
	let minKm = Infinity;
	for (const i of list) minKm = Math.min(minKm, i === v.hedef ? 0 : between(i, v.hedef).km);
	return { found: at >= 0, tries: at >= 0 ? at + 1 : list.length, minKm };
}

const CSS = /* css */ `
.dn-ia{display:flex;flex-direction:column;gap:8px}
.dn-ia-row{display:flex;gap:10px;align-items:stretch}
.dn-ia-sil{flex:none;width:96px;height:96px;border-radius:16px;display:grid;place-items:center;background:radial-gradient(circle at 50% 40%,#22396f,#0c1736);border:2.5px solid rgba(255,255,255,.75);box-shadow:0 4px 0 rgba(0,0,0,.35)}
.dn-ia-sil svg{width:86px;height:86px;overflow:visible}
.dn-ia-sil path{fill:#ffd25a;stroke:#fff;stroke-width:1.6;stroke-linejoin:round;filter:drop-shadow(0 2px 0 rgba(90,50,0,.6))}
.dn-ia-sil.won path{fill:#7dff9a}
.dn-ia-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}
.dn-ia-tries{display:flex;align-items:center;gap:6px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#cfe0ff}
.dn-ia-tries i{width:15px;height:15px;border-radius:50%;background:#fff;border:2px solid rgba(255,255,255,.4);box-shadow:inset 0 -2px 0 rgba(0,0,0,.2);transition:background .25s,transform .25s}
.dn-ia-tries i.used{background:var(--hc,#2f6bff);transform:scale(.8)}
.dn-ia-tries i.win{background:#7dff9a}
.dn-ia-hints{display:flex;flex-direction:column;gap:4px}
.dn-ia-hints span{display:flex;align-items:center;gap:6px;padding:4px 9px;border-radius:10px;font-size:14px;line-height:1.2;background:rgba(0,0,0,.28);animation:flq-pop .35s cubic-bezier(.3,1.5,.5,1)}
.dn-ia-hints span b{flex:none;font-family:'Lilita One';font-weight:400;font-size:11px;letter-spacing:.08em;padding:1px 6px;border-radius:6px;background:var(--gold);color:#3a2000}
.dn-ia-hints span.lock{opacity:.45}
.dn-ia-log{display:flex;flex-wrap:wrap;gap:5px;min-height:0}
.dn-ia-log span{display:inline-flex;align-items:center;gap:5px;padding:3px 9px 3px 4px;border-radius:999px;font-size:13.5px;line-height:1.1;color:#fff;background:rgba(0,0,0,.3);border:2px solid var(--hc);animation:flq-pop .3s cubic-bezier(.3,1.5,.5,1)}
.dn-ia-log span i{width:14px;height:14px;border-radius:50%;background:var(--hc)}
.dn-ia-log span em{font-style:normal;font-family:'Lilita One';color:var(--hc)}
.dn-ia-leg{display:flex;align-items:center;gap:3px;font-size:10.5px;color:#cfe0ff;opacity:.85}
.dn-ia-leg i{flex:1;height:6px;border-radius:3px}
.dn-ia.done .dn-ia-leg{display:none}
`;

export const ilavi = {
	time: 30,
	label: 'İl Avı',
	kind: 'closest',
	needsMap: true,
	jokers: ['yari', 'kahin'],
	fmt(v, value) {
		const r = result(v, value?.taps);
		return r.found ? `${r.tries}. denemede` : Number.isFinite(r.minKm) ? `${r.minKm} km` : '—';
	},
	sub(v, value) {
		const r = result(v, value?.taps);
		return r.found ? (r.tries === 1 ? 'ilk dokunuşta' : 'buldu') : 'en yakın uzaklık';
	},
	prepare(q) {
		const target = BY_ID.get(q.il);
		const v = { q, hedef: target, tries: q.tries || TRIES, sil: silhouette(target), hints: (q.hints || []).slice() };
		return stamp(v, q, (q2, k, P, text) => {
			for (const h of q2.hints || []) text(h);
			const n = v.tries;
			return {
				wait: 0.5 + 0.6,
				look: LOOK.orient + LOOK.image * 0.75 + LOOK.map,
				// her deneme: rengi ve oku oku, yeni ipucunu oku, haritada yeni yeri seç ve dokun (son deneme dahil)
				act: n * (ACT.mapTap + 0.8) + (n - 1) * 1.2,
			};
		});
	},
	mount(el, v, api) {
		css('deneme', DENEME_CSS);
		css('ilavi', CSS);
		const app = appOf();
		const hints = v.hints;
		el.innerHTML = `<div class="dn-ia">
			<div class="dn-ia-row">
				<div class="dn-ia-sil"><svg viewBox="0 0 100 100"><path d="${v.sil}"/></svg></div>
				<div class="dn-ia-info">
					<div class="dn-ia-tries">${'<i></i>'.repeat(v.tries)}<span>deneme</span></div>
					<div class="dn-ia-hints">${hints.map((h, k) => `<span class="${k ? 'lock' : ''}"><b>İPUCU ${k + 1}</b>${k ? '<em>yanlışta açılır</em>' : esc(h)}</span>`).join('')}</div>
				</div>
			</div>
			<div class="dn-ia-log"></div>
			<div class="dn-ia-leg"><span>kızgın</span>${HEAT.map((h) => `<i style="background:${h[1]}"></i>`).join('')}<span>buz</span></div>
		</div>`;
		rule(el, 'Az denemede bul');
		const root = el.querySelector('.dn-ia');
		const dots = [...root.querySelectorAll('.dn-ia-tries i')];
		const hintEls = [...root.querySelectorAll('.dn-ia-hints span')];
		const log = root.querySelector('.dn-ia-log');
		const taps = [];
		let done = false;
		const finish = () => {
			if (done) return;
			done = true;
			root.classList.add('done');
			api.answer({ taps: taps.slice() });
		};
		if (!app) return { lock: () => (done = true), value: () => ({ taps: taps.slice() }), reveal() {}, destroy() {} };
		const b = app.board;
		const g = guard(app);
		g.allActive();
		queueMicrotask(() => {
			if (!el.isConnected) return;
			app.cam.fit(app.boundsOf(PROV.map((_, i) => i)), { pitch: 1.02, pad: 1.03, top: cardTop(el), dur: 0.7 });
		});
		const open = (k) => {
			const h = hintEls[k];
			if (!h || !h.classList.contains('lock')) return;
			h.classList.remove('lock');
			h.innerHTML = `<b>İPUCU ${k + 1}</b>${esc(hints[k])}`;
		};
		api.onMapTap((pt) => {
			if (done) return;
			const i = b.pick(pt.x, pt.z);
			if (i < 0) return;
			const p = b.provinces[i];
			if (taps.includes(p.id)) {
				app.ui.toast?.(`${p.name} zaten denendi`, { tone: 'warn', ms: 1200 });
				return;
			}
			taps.push(p.id);
			const dot = dots[taps.length - 1];
			if (i === v.hedef) {
				g.paint(i, '#ffd25a', pt.x, pt.z);
				g.fx(i, 0.6, 1);
				dot?.classList.add('win');
				tag(app, `<b>${esc(p.name)}</b><em>✓</em>`, p.x, p.z, 'big').el.style.setProperty('--tc', '#7dff9a');
				root.querySelector('.dn-ia-sil').classList.add('won');
				pop(app, p.x, p.z, 'BULDUN!', { colors: ['#ffd25a', '#7dff9a', '#fff'], n: 18, dist: 90, cls: 'dn dn-gold' });
				sfx(app, 'right');
				buzz(14);
				return finish();
			}
			const d = between(i, v.hedef);
			const h = heat(d.km);
			g.paint(i, h[1], pt.x, pt.z);
			g.fx(i, 0.3, 0);
			dot?.style.setProperty('--hc', h[1]);
			dot?.classList.add('used');
			tag(app, `<b>${esc(p.name)}</b><em>${d.km} km ${d.dir}</em>`, p.x, p.z).el.style.setProperty('--tc', h[1]);
			log.insertAdjacentHTML('beforeend', `<span style="--hc:${h[1]}"><i></i>${esc(p.name)}<em>${d.km} km ${d.dir}</em></span>`);
			pop(app, p.x, p.z, `${h[2]}!`, { colors: [h[1], '#fff'], n: d.km < 250 ? 12 : 6, dist: 46, cls: `dn ${d.km < 450 ? 'dn-hot' : 'dn-cold'}` });
			sfx(app, d.km < 250 ? 'star' : 'tap');
			buzz(d.km < 250 ? 20 : 8);
			open(taps.length);
			if (taps.length >= v.tries) setTimeout(finish, 450);
		});
		const close = onClose(el, () => g.restore());
		return {
			lock() {
				done = true;
				root.classList.add('done');
			},
			value: () => ({ taps: taps.slice() }),
			joker(e) {
				if (e?.zone) {
					for (const i of e.zone) g.fx(i, 0.15, 1);
					app.ui.toast?.(e.text, { tone: 'good', ms: 2000 });
				}
			},
			reveal(results) {
				done = true;
				root.classList.add('done');
				const t = b.provinces[v.hedef];
				const won = taps.includes(t.id);
				if (!won) {
					g.paint(v.hedef, '#ffd25a', t.x, t.z);
					g.fx(v.hedef, 0.6, 1);
					tag(app, `<b>${esc(t.name)}</b>`, t.x, t.z, 'big').el.style.setProperty('--tc', '#ffd25a');
				}
				// kadraj: gizli il ve bütün denemeler
				const list = [v.hedef, ...taps.map((id) => BY_ID.get(id))];
				const bb = app.boundsOf(list);
				app.cam.fit({ x0: bb.x0 - 4, x1: bb.x1 + 4, z0: bb.z0 - 4, z1: bb.z1 + 3 }, { pitch: 1.0, pad: 1.15, top: cardTop(el), dur: 1.1, arc: 3 });
				const meR = results.find((r) => r.p?.human);
				if (meR) {
					const order = results.slice().sort((a, b2) => a.err - b2.err || a.time - b2.time);
					const r = result(v, meR.value?.taps);
					const win = order[0] === meR;
					// damga kısa (harita kartında en çok ~14 harf sığar), ayrıntı alt satırda
					if (r.found) stampLater(app, r.tries === 1 ? 'İLK DOKUNUŞTA!' : `${r.tries}. DENEMEDE!`, win ? 'gold' : 'bad', win ? `${t.name} bulundu` : `${order[0].name} daha az denemede buldu`);
					else stampLater(app, win ? 'EN YAKIN SEN!' : 'BULAMADIN', win ? 'gold' : 'bad', `Gizli il: ${t.name}`);
				}
			},
			destroy: close,
		};
	},
	joker(id, v, R) {
		const t = PROV[v.hedef];
		if (id === 'yari') {
			const zone = PROV.map((p, i) => (p.region === t.region ? i : -1)).filter((i) => i >= 0);
			return { zone, text: `Gizli il ${REGION[t.region] || ''} Bölgesi'nde` };
		}
		if (id === 'kahin') {
			const nb = t.nb.map((id2) => BY_ID.get(id2)).filter((i) => i != null);
			const i = nb[Math.floor(R() * nb.length)];
			return i == null ? null : { zone: [i], text: `Seyirci: gizli il ${PROV[i].name}'e komşu` };
		}
		return null;
	},
	/** Çevrimiçi görünüm: gizli il ve sonraki ipuçları sunucuda; siluet ve ilk ipucu gider. */
	publicView(v) {
		const o = JSON.parse(JSON.stringify(v));
		delete o.hedef;
		delete o.q.il;
		o.hints = o.hints.map((h, k) => (k ? '' : h)); // sonrakiler yanlış denemede sunucudan gelir
		delete o.q.hints;
		return o;
	},
	judge(v, value) {
		const r = result(v, value?.taps);
		if (r.found) return { correct: true, err: r.tries - 1, tries: r.tries };
		return { correct: false, err: Number.isFinite(r.minKm) ? 10 + r.minKm / 100 : 99 };
	},
	bot(v, skill, R) {
		// bilen bot 1–2 denemede, bilmeyen sıcak-soğukla yaklaşır; her denemede komşulara doğru ilerler
		const p = clamp(pCorrect(skill, v.q.diff) + 0.1, 0.1, 0.95);
		const taps = [];
		let cur = -1;
		for (let k = 0; k < v.tries; k++) {
			if (R() < p * (0.55 + 0.25 * k)) {
				taps.push(PROV[v.hedef].id);
				break;
			}
			// yanlış deneme: önce uzakta bir il, sonra gizli ile her seferinde biraz daha yakın
			const want = (k === 0 ? 350 + R() * 500 : 120 + R() * 260) * (1.2 - skill * 0.5);
			let best = -1;
			let bd = Infinity;
			for (let i = 0; i < PROV.length; i++) {
				if (i === v.hedef || taps.includes(PROV[i].id)) continue;
				const d = Math.abs(between(i, v.hedef).km - want) + (cur >= 0 ? between(i, cur).km * 0.2 : 0);
				if (d < bd) {
					bd = d;
					best = i;
				}
			}
			if (best < 0) break;
			cur = best;
			taps.push(PROV[best].id);
		}
		return { value: { taps }, time: botTime(v, R, skill, 0.15 + 0.15 * taps.length, 1) };
	},
};
