// KAYIP İL (deneme): haritadan bir il silinmiş. Kart açılınca il boşluğa düşer; yerinde simsiyah bir kuyu kalır,
// kenarından altın bir ışık perdesi yükselir. Harita gecede (sahip renkleri gizli), kamera boşluğun çevresinde
// ağır ağır döner. Dört şık. Zaman geçtikçe ipuçları sırayla açılır: 1. bölge (bölgenin illeri ışığa çıkar),
// 2. bir komşu il altın parlar ve adı yazar, 3. plaka ya da ünlü bir şey. Erken bilen kazanır (eşitlikte süre).
// Cevapta kayıp il gökten iner, yerine oturur (sarsıntı, altın boya dalgası).
//
// Veri: il: kayıp ilin plakası, a: [doğru, y1, y2, y3] (il adları), hint: 3. ipucu (plaka, ünlü bir şey),
//       nb?: parlayacak komşunun plakası (verilmezse şıklarda olmayan ilk komşu)
// Değer: şık indeksi. Tür 'exact'.
// İpucu saatleri sorunun süresinden (v.hintAt, sn): soru saatine bağlı; çevrimiçinde iki oyuncu aynı anda görür.
// Çevrimiçi: publicView doğru şıkkı, plakayı ve ipuçlarını taşımaz (ipuçları saatinde sunucudan gelir). Boşluğun
// biçimi istemciye gitmek zorunda (tipin doğası): çevrimiçi sürümde il dizini yerine sadeleştirilmiş çokgen gider.

import * as THREE from 'three';
import { css, esc, shuffle, pCorrect, mountChoice, buzz } from './util.js';
import { botTime } from './timing.js';
import { appOf, stamp, guard, camLock, onClose, onOpen, cardTop, tag, pop, sfx, rule, stampLater, LOOK, DENEME_CSS } from './d_ortak.js';
import { clock, setTimeout, clearTimeout } from '../core/clock.js';
import { holdLift } from './d_tufan.js';
import DATA from '../data/turkiye.json';

const PROV = DATA.provinces;
const BY_ID = new Map(PROV.map((p, i) => [p.id, i]));
const REGION = { marmara: 'Marmara', karadeniz: 'Karadeniz', ege: 'Ege', akdeniz: 'Akdeniz', icanadolu: 'İç Anadolu', dogu: 'Doğu Anadolu', guneydogu: 'Güneydoğu Anadolu' };
const HINT_AT = [0.2, 0.4, 0.6]; // ipuçlarının açıldığı an (sürenin payı)
const FLOOR_Y = -0.69; // kuyunun dibi: il duvarlarının alt kenarının hemen üstü
const DROP = -4; // düşen il (lift)

// ---------------------------------------------------------------- kuyu ve altın perde

const CURTAIN_VS = /* glsl */ `
attribute float aV;
attribute float aS;
varying float vV;
varying float vS;
void main() {
	vV = aV;
	vS = aS;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const CURTAIN_FS = /* glsl */ `
uniform float uTime;
uniform float uA;
varying float vV;
varying float vS;
void main() {
	float edge = exp(-abs(vV - 0.26) * 10.0);            // kenar çizgisi: yüzey hizasında parlak
	float up = pow(1.0 - clamp((vV - 0.26) / 0.74, 0.0, 1.0), 2.4) * step(0.26, vV); // yukarı sönen perde
	float down = (1.0 - smoothstep(0.0, 0.26, 0.26 - vV)) * step(vV, 0.26) * 0.5; // kuyunun ağzında içe süzülen ışık
	float sh = 0.55 + 0.45 * sin(vS * 7.0 - uTime * 2.6) * sin(vS * 2.3 + uTime * 1.3);
	float cell = floor(vS * 9.0);
	float tw = fract(sin(cell * 91.7 + floor(uTime * 5.0 + cell) * 13.1) * 43758.5453);
	float rise = fract(vV * 1.6 - uTime * 0.45 + fract(cell * 0.37));
	float sp = step(0.9, tw) * smoothstep(0.08, 0.0, abs(fract(vS * 9.0) - 0.5) - 0.38) * smoothstep(0.0, 0.1, rise) * smoothstep(0.35, 0.1, rise) * step(0.26, vV);
	vec3 gold = vec3(1.0, 0.74, 0.28);
	vec3 col = gold * (edge * 1.5 + up * 0.5 * sh + down * 0.6) + vec3(1.0, 0.93, 0.7) * sp * 0.9;
	gl_FragColor = vec4(col * uA, 1.0);
}`;

let MATS = null;
function mats(app) {
	if (MATS) return MATS;
	MATS = {
		floor: new THREE.MeshBasicMaterial({ color: 0x000000 }),
		lid: new THREE.MeshBasicMaterial({ colorWrite: false }),
		curtain: new THREE.ShaderMaterial({
			vertexShader: CURTAIN_VS,
			fragmentShader: CURTAIN_FS,
			uniforms: { uTime: app.board.G?.uTime || { value: 0 }, uA: { value: 1 } },
			transparent: true,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
			side: THREE.DoubleSide,
		}),
	};
	return MATS;
}

/** İlin yerinde kuyu: { group, curtain, dispose() }. Halkalar (x, kuzey) dünyada (x, −z). */
function pit(app, i) {
	const b = app.board;
	const p = b.provinces[i];
	const M = mats(app);
	const cap = [];
	const capIdx = [];
	const cv = [];
	const cA = [];
	const cI = [];
	for (const r of p.rings) {
		const n = r.length >> 1;
		if (n < 3) continue;
		// taban (kapak ve dip): halka üçgenlenir
		const pts = [];
		for (let k = 0; k < n; k++) pts.push(new THREE.Vector2(r[k * 2], r[k * 2 + 1]));
		const tri = THREE.ShapeUtils.triangulateShape(pts, []);
		const o = cap.length / 3;
		for (const q of pts) cap.push(q.x, 0, -q.y);
		for (const t of tri) capIdx.push(o + t[0], o + t[2], o + t[1]);
		// perde: kenar boyunca dikey şerit (kenarın kara yüksekliğinden aşağı ve yukarı)
		const base = cv.length / 3;
		let s = 0;
		for (let k = 0; k <= n; k++) {
			const kk = k % n;
			const x = r[kk * 2];
			const z = -r[kk * 2 + 1];
			if (k) s += Math.hypot(x - r[(k - 1) * 2], z + r[(k - 1) * 2 + 1]);
			const y = b.heightAt(x, z);
			cv.push(x, y - 0.32, z, x, y + 0.9, z);
			cA.push(0, s, 1, s);
			if (k) {
				const a = base + (k - 1) * 2;
				cI.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
			}
		}
	}
	const capGeo = new THREE.BufferGeometry();
	capGeo.setAttribute('position', new THREE.Float32BufferAttribute(cap, 3));
	capGeo.setIndex(capIdx);
	const cGeo = new THREE.BufferGeometry();
	cGeo.setAttribute('position', new THREE.Float32BufferAttribute(cv, 3));
	const aV = [];
	const aS = [];
	for (let k = 0; k < cA.length; k += 2) {
		aV.push(cA[k]);
		aS.push(cA[k + 1]);
	}
	cGeo.setAttribute('aV', new THREE.Float32BufferAttribute(aV, 1));
	cGeo.setAttribute('aS', new THREE.Float32BufferAttribute(aS, 1));
	cGeo.setIndex(cI);
	const group = new THREE.Group();
	const floor = new THREE.Mesh(capGeo, M.floor);
	floor.position.y = FLOOR_Y;
	// kapak: yalnız derinlik yazar (renk yok), denizden önce: kuyunun içine deniz düzlemi çizilmez
	const lid = new THREE.Mesh(capGeo, M.lid);
	lid.position.y = 0.002;
	lid.renderOrder = 1;
	const curtain = new THREE.Mesh(cGeo, M.curtain);
	curtain.renderOrder = 3;
	curtain.frustumCulled = false;
	group.add(floor, lid, curtain);
	b.group.add(group);
	try {
		const r = app.renderer;
		if (r?.compileAsync) r.compileAsync(group, app.camera, app.scene).catch(() => {});
	} catch {
		/* ilk çizimde derlenir */
	}
	return {
		group,
		curtain,
		dispose() {
			group.removeFromParent();
			capGeo.dispose();
			cGeo.dispose();
		},
	};
}

// ---------------------------------------------------------------- tip

const CSS = /* css */ `
.dn-ky{display:flex;flex-direction:column;gap:6px}
.dn-ky .fl-opt{min-height:44px}
.dn-ky-top{display:flex;align-items:center;gap:8px;height:20px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#cfe0ff}
.dn-ky-top .sc{flex:none;width:18px;height:18px;border-radius:50%;background:#000;border:2px solid var(--gold);box-shadow:0 0 10px rgba(255,190,70,.8),inset 0 0 6px rgba(255,190,70,.6)}
.dn-ky-bar{flex:1;height:8px;border-radius:6px;background:rgba(255,255,255,.14);overflow:hidden;position:relative}
.dn-ky-bar i{position:absolute;inset:0;border-radius:6px;background:linear-gradient(90deg,#ffd25a,#ff8a3a);transform-origin:0 50%}
.dn-ky-bar i.run{animation:dnShrink var(--t,20s) linear forwards}
.dn-ky-bar u{position:absolute;top:0;bottom:0;width:2px;background:rgba(10,18,44,.9)}
.fl-q.locked .dn-ky-bar i{animation-play-state:paused}
.dn-ky-top b{font-family:'Lilita One';font-weight:400;font-size:14px;letter-spacing:.04em;color:var(--gold)}
.dn-ky-h{display:flex;flex-direction:column;gap:3px}
.dn-ky-h span{position:relative;display:flex;align-items:center;gap:7px;height:25px;padding:0 9px;border-radius:9px;font-size:13.5px;white-space:nowrap;line-height:1.2;background:rgba(0,0,0,.28);overflow:hidden}
.dn-ky-h span b{flex:none;font-family:'Lilita One';font-weight:400;font-size:11px;letter-spacing:.08em;padding:1px 6px;border-radius:6px;background:var(--gold);color:#3a2000}
.dn-ky-h span.lock{color:#cfe0ff;opacity:.55}
.dn-ky-h span.lock b{background:rgba(255,255,255,.25);color:#fff}
.dn-ky-h span.lock em{font-style:normal;margin-left:auto;font-family:'Lilita One';font-size:12px;letter-spacing:.04em}
.dn-ky-h span.open{animation:flq-pop .4s cubic-bezier(.3,1.5,.5,1)}
.dn-ky-h span.open::after{content:'';position:absolute;inset:0;background:linear-gradient(100deg,transparent 30%,rgba(255,230,150,.45) 50%,transparent 70%);transform:translateX(-100%);animation:dnKySheen .9s ease-out forwards}
@keyframes dnKySheen{to{transform:translateX(100%)}}
@keyframes dnShrink{from{transform:scaleX(1)}to{transform:scaleX(0)}}
.dn-tag.ky>div{--tc:#ffd25a;box-shadow:0 0 14px rgba(255,200,80,.6),0 3px 0 rgba(0,0,0,.35)}
`;

/** Parlayacak komşu: veride verilen ya da şıklarda olmayan ilk komşu. */
function nbOf(q) {
	if (q.nb) return q.nb;
	const p = PROV[BY_ID.get(q.il)];
	const names = new Set(q.a);
	return p.nb.find((id) => !names.has(PROV[BY_ID.get(id)].name)) ?? p.nb[0];
}

export const kayip = {
	time: 26,
	label: 'Kayıp İl',
	kind: 'exact',
	needsMap: true,
	prepare(q, R) {
		const order = shuffle([0, 1, 2, 3], R);
		const i = BY_ID.get(q.il);
		const p = PROV[i];
		const nb = nbOf(q);
		const v = {
			q,
			opts: order.map((k) => q.a[k]),
			right: order.indexOf(0),
			hedef: i,
			nb,
			hints: [`${REGION[p.region] || ''} Bölgesi’nde`, `${PROV[BY_ID.get(nb)].name} ile komşu`, q.hint],
		};
		stamp(v, q, (q2, k, P, text) => {
			for (const a of q2.a) text(a);
			// ortanca oyuncu ilk ipucunu bekler, okur; boşluğun çevresine bakar
			return { wait: 0.5 + 0.9 + 3, look: LOOK.orient + LOOK.map + LOOK.image + 4 * LOOK.gaze, think: (P.think?.[0] || 0) + (P.think?.[1] || 0) * k };
		});
		// ipucu saatleri: sorunun kendi bütçesinden (galerinin "Sınırsız" kipinde de aynı)
		v.hintAt = HINT_AT.map((f) => Math.round(v.sec * f * 10) / 10);
		return v;
	},
	mount(el, v, api) {
		css('deneme', DENEME_CSS);
		css('kayip', CSS);
		const app = appOf();
		const at = v.hintAt || HINT_AT.map((f) => f * (v.sec || 24));
		const film = at[2] / HINT_AT[2];
		el.innerHTML = `<div class="dn-ky">
			<div class="dn-ky-top"><span class="sc"></span><span>İpuçları açılıyor</span><span class="dn-ky-bar"><i></i>${at.map((s) => `<u style="left:${((s / film) * 100).toFixed(1)}%"></u>`).join('')}</span><b>ERKEN BİL</b></div>
			<div class="dn-ky-h">${['BÖLGE', 'KOMŞU', 'İPUCU'].map((n, k) => `<span class="lock"><b>${n}</b>gizli<em>${Math.round(at[k])} sn</em></span>`).join('')}</div>
			<div data-r="o"></div>
		</div>`;
		rule(el, 'Erken bilen kazanır');
		const c = mountChoice(el.querySelector('[data-r=o]'), v, api, { onPick: () => sfx(app, 'tap') });
		const bar = el.querySelector('.dn-ky-bar i');
		bar.style.setProperty('--t', film + 's');
		const hintEls = [...el.querySelectorAll('.dn-ky-h span')];
		if (!app) return { lock: c.lock, reveal: (r) => c.reveal(r), destroy() {} };
		const b = app.board;
		const i = v.hedef;
		const p = b.provinces[i];
		const g = guard(app);
		g.allActive();
		const lit = [];
		g.dark(lit);
		const unlock = camLock(app);
		const P = pit(app, i);
		const ib = app.boundsOf([i]);
		const size = Math.max(ib.x1 - ib.x0, ib.z1 - ib.z0);
		// kadraj: boşluk ve çevresi (komşular görünsün), ağır bir yörünge
		const m = size * 0.55 + 4;
		const orbit = (dur) => app.cam.fit({ x0: ib.x0 - m, x1: ib.x1 + m, z0: ib.z0 - m, z1: ib.z1 + m }, { pitch: 0.8, pad: 1.05, top: cardTop(el), dur, arc: 3, yawRate: 0.07 });
		queueMicrotask(() => el.isConnected && orbit(1.1));
		const timers = [];
		const open = (k) => {
			const h = hintEls[k];
			if (!h || h.classList.contains('open')) return;
			h.classList.remove('lock');
			h.classList.add('open');
			h.innerHTML = `<b>${['BÖLGE', 'KOMŞU', 'İPUCU'][k]}</b>${esc(v.hints[k])}`;
			sfx(app, 'star');
			buzz(8);
			if (k === 0) {
				// bölge: bölgenin illeri karanlıktan ışığa çıkar (kayıp il kuyuda kalır)
				for (const j of b.region ? b.region(p.region) : []) if (j !== i) lit.push(j);
				g.dark(lit);
			} else if (k === 1) {
				const j = b.byId.get(v.nb)?.index;
				if (j != null) {
					if (!lit.includes(j)) lit.push(j);
					g.dark(lit);
					g.fx(j, 0.35, 1);
					const n = b.provinces[j];
					tag(app, `<b>${esc(n.name)}</b><em>komşu</em>`, n.x, n.z, 'ky big');
					pop(app, n.x, n.z, '', { colors: ['#ffd25a', '#fff'], n: 10, dist: 50 });
				}
			}
		};
		const stopOpen = onOpen(el, () => {
			// il boşluğa düşer: kuyu açılır, altın perde yükselir
			g.fx(i, DROP, 0);
			sfx(app, 'whoosh');
			app.cam.impulse?.(0.25);
			buzz(20);
			bar.classList.add('run');
			at.forEach((s, k) => timers.push(setTimeout(() => el.isConnected && open(k), s * 1000)));
		});
		let raf = 0;
		let landed = false;
		const cleanup = () => {
			stopOpen();
			for (const t of timers) clearTimeout(t);
			cancelAnimationFrame(raf);
			unlock();
			P.dispose();
			g.restore();
		};
		const close = onClose(el, cleanup);
		return {
			lock() {
				c.lock();
				for (const t of timers) clearTimeout(t);
			},
			reveal(results) {
				c.reveal(results);
				for (const t of timers) clearTimeout(t);
				// gökten iniş: hızlanarak düşer, yerine oturur (hafif sekme), sonra altın boya
				const top = cardTop(el);
				app.cam.shot(p.x, p.z, { dist: size * 1.7 + 26, pitch: 0.58, yaw: app.cam.yaw + 0.25, dur: 1.2, arc: 2, yawRate: 0.05, decay: 0.2, lens: top / 2 });
				const H = 7;
				const D = 1.15;
				let t0 = 0;
				const land = () => {
					landed = true;
					holdLift(b, i, -0.05);
					lit.push(i);
					g.dark(lit); // yerine oturan il ışıkta
					g.fx(i, 0, 1);
					P.group.visible = false;
					g.paint(i, '#ffd25a', p.x, p.z);
					tag(app, `<b>${esc(p.name)}</b><em>yerine oturdu</em>`, p.x, p.z, 'ky big');
					pop(app, p.x, p.z, 'YERİNE OTURDU!', { colors: ['#ffd25a', '#fff', '#ffb04a'], n: 24, dist: 110, cls: 'dn dn-gold' });
					app.cam.impulse?.(0.6);
					sfx(app, 'castle');
					buzz(40);
					setTimeout(() => g.fx(i, 0, 0.45), 900);
				};
				const step = () => {
					if (!el.isConnected || landed) return;
					if (!t0) t0 = clock.now();
					const u = Math.min(1, (clock.now() - t0) / 1000 / D);
					holdLift(b, i, H * (1 - u * u));
					if (u >= 1) return land();
					raf = requestAnimationFrame(step);
				};
				// kuyunun içinden yukarıya: bir kare gökte belir, sonra in
				holdLift(b, i, H);
				b.lift[i] = H; // düşüşten göğe geçiş görünmesin
				setTimeout(() => {
					if (el.isConnected) raf = requestAnimationFrame(step);
				}, 450);
				sfx(app, 'whoosh');
				const me = results.find((r) => r.p?.human);
				if (me && me.correct) {
					const k = hintEls.filter((h) => h.classList.contains('open')).length;
					stampLater(app, k === 0 ? 'İPUCUSUZ!' : 'BİLDİN!', 'gold', k === 0 ? `${p.name} · ipucu açılmadan` : `${p.name} · ${k} ipucuyla`);
				} else if (me) stampLater(app, me.value == null ? 'SÜRE DOLDU' : 'BİLEMEDİN', 'bad', `Kayıp il: ${p.name}`);
			},
			destroy: close,
		};
	},
	/** Çevrimiçi görünüm: doğru şık, plaka, komşu ve ipuçları sunucuda (ipuçları saatinde gelir). */
	publicView(v) {
		const o = JSON.parse(JSON.stringify(v));
		delete o.right;
		delete o.hedef;
		delete o.nb;
		delete o.hints;
		delete o.q.a;
		delete o.q.il;
		delete o.q.hint;
		delete o.q.nb;
		return o;
	},
	/** Sınama yardımcısı: bir doğru ve bir yanlış değer (test/deneme*.test.mjs). */
	probe: (v) => ({ good: v.right, bad: (v.right + 1) % 4 }),
	judge(v, value) {
		return { correct: value === v.right, err: value === v.right ? 0 : 1 };
	},
	bot(v, skill, R) {
		// bot ipuçlarıyla bilir: her açılan ipucu bilme şansını artırır; cevap anı ipucu saatlerine yakın
		const p0 = pCorrect(skill, v.q.diff);
		const at = v.hintAt || [5, 10, 15];
		let k = 0;
		while (k < 3 && R() > p0 * 0.55 + 0.1 * k) k++;
		const ok = R() < Math.min(0.97, p0 + 0.12 * k);
		let value = v.right;
		if (!ok) do value = Math.floor(R() * 4); while (value === v.right);
		const base = k === 0 ? botTime(v, R, skill, 0.02, 0.3) : at[k - 1] + 0.8 + R() * 2.2;
		return { value, time: Math.min(v.sec, Math.max(1, base)) };
	},
};
