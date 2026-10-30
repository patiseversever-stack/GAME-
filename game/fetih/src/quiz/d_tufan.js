// TUFAN (deneme): "Deniz yükselirse hangisi EN SON batar?" (ya da ÖNCE). Dört il, il merkezi rakımları. Soru
// anında harita gecede, dört il kaidesinde ışıkta. Cevapta gün doğar ve deniz 3B haritada GERÇEKTEN yükselir: su
// yüzeyi kabartmaya göre kıyıdan içeri yürür (kıyı çizgisi köpüklü), ovalar, yaylalar sırayla sular altında kalır;
// seçenek iller rakımlarının sırasıyla tek tek batar (etiketinde rakım yazar), kamera alçak açıdan süzülür; sonunda
// en yüksek il su üstünde kalan son ada gibi ışıkta.
//
// Veri: mode: 'son' | 'once', ils: [[plaka, rakım m], …] (dört il). Doğru şık mode'a göre en yüksek ya da en alçak.
//       Rakımlar: il merkezi rakımı (Harita Genel Komutanlığı il merkezi rakımları tablosu; ansiklopedik kaynaklarla
//       aynı); seçenekler arası en az 150 m fark (sınama denetler).
// Değer: şık indeksi. Tür 'exact'.
// Su: haritanın kendi deniz malzemesinin (board.sea) bir kopyası, bir kabartma dokusuyla (relief ızgarası, il
// içi = kara yüksekliği, dışı = derin) yükselen bir düzlemde çizilir: kıyı köpüğü ve sığlık yeni kıyıda oluşur.
// Kopya ilk Tufan sorusunda bir kez kurulur ve derlenir (soru anında, cevaptan önce); tufan bitince asıl deniz
// geri gelir. Harita koduna kanca yok: board.sea.visible ve il yükselme dizileri (lift/liftTo) kullanılır.
// Çevrimiçi: publicView doğru şıkkı, il plakalarını ve rakımları taşımaz (illerin yeri istemciye kart kapanınca
// cevapla gelir; soru anındaki etiketler yalnız ad ve konum).

import * as THREE from 'three';
import { css, esc, shuffle, pCorrect, mountChoice, buzz } from './util.js';
import { botTime } from './timing.js';
import { appOf, stamp, guard, camLock, onClose, onOpen, cardTop, tag, pop, sfx, rule, stampLater, LOOK, DENEME_CSS } from './d_ortak.js';
import { clock, setTimeout } from '../core/clock.js';
import { BASE, VS } from '../map/terrain.js';
import DATA from '../data/turkiye.json';

const PROV = DATA.provinces;
const BY_ID = new Map(PROV.map((p, i) => [p.id, i]));
const fmtM = (m) => Number(m).toLocaleString('tr-TR') + ' m';

/** Metre → su düzleminin yüksekliği (birim): 0 m'de deniz (y 0), ~30 m'de kıyı kara yüksekliği (BASE). */
const levelY = (m) => (m <= 0 ? 0 : BASE * Math.min(1, m / 30) + m * VS);
const PED = 0.3; // seçenek illerin kaidesi (lift): kendi rakımına kadar su üstünde kalsın
const SINK = 1.1; // batış süresi (sn)

// ---------------------------------------------------------------- tufan suyu (bir kez kurulur)

const inPoly = (x, y, r) => {
	let c = false;
	for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) if (r[i + 1] > y !== r[j + 1] > y && x < ((r[j] - r[i]) * (y - r[i + 1])) / (r[j + 1] - r[i + 1]) + r[i]) c = !c;
	return c;
};

let FL = null;
/** Tufan suyu: { mesh, on(), off(), level(y), tick } (tahta başına bir kez). */
export function floodOf(app) {
	const b = app?.board;
	if (!b?.sea?.material?.fragmentShader || !b.relief) return null;
	if (FL && FL.b === b) return FL;
	// kabartma dokusu: il içindeki ızgara noktaları kara yüksekliği, dışı (deniz, komşu ülke) derin
	const rel = b.relief;
	const m = rel.m;
	const W = m.w;
	const H = m.h;
	const st = m.step;
	const h = new Float32Array(W * H).fill(-0.4);
	for (const p of b.provinces) {
		const [bx0, bz0, bx1, bz1] = p.box;
		const i0 = Math.max(0, Math.floor((bx0 - m.x0) / st));
		const i1 = Math.min(W - 1, Math.ceil((bx1 - m.x0) / st));
		const j0 = Math.max(0, Math.floor((-bz1 - m.y0) / st));
		const j1 = Math.min(H - 1, Math.ceil((-bz0 - m.y0) / st));
		for (let j = j0; j <= j1; j++)
			for (let i = i0; i <= i1; i++) {
				const x = m.x0 + i * st;
				const y = m.y0 + j * st;
				for (const r of p.rings)
					if (inPoly(x, y, r)) {
						h[j * W + i] = rel.height(x, y);
						break;
					}
			}
	}
	const hd = new Uint16Array(W * H);
	for (let k = 0; k < hd.length; k++) hd[k] = THREE.DataUtils.toHalfFloat(h[k]);
	const tex = new THREE.DataTexture(hd, W, H, THREE.RedFormat, THREE.HalfFloatType);
	tex.minFilter = tex.magFilter = THREE.LinearFilter;
	tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
	tex.colorSpace = THREE.NoColorSpace;
	tex.generateMipmaps = false;
	tex.needsUpdate = true;
	// denizin kendi malzemesi: kıyıya uzaklık artık su derinliğinden (yükselen suyun yeni kıyısında köpük, sığlık)
	const src = b.sea.material;
	let fs = src.fragmentShader;
	const re = /float dist = \(1\.0 - coast\) \* ([0-9.]+);/;
	if (re.test(fs)) {
		fs = fs.replace('void main() {', 'uniform sampler2D uFH;\nuniform vec4 uFHBox;\nvoid main() {');
		fs = fs.replace(
			re,
			(_, rc) => `float fhg = texture(uFH, vec2((vW.x - uFHBox.x) * uFHBox.z, (-vW.z - uFHBox.y) * uFHBox.w)).r;
	float dist = min((1.0 - coast) * ${rc} + max(vW.y, 0.0) * 120.0, max(vW.y - fhg, 0.0) * 26.0 + 0.004);`,
		);
		// gece: yeni kıyıda soğuk ışıklı yaka (karanlıkta da kıyı okunsun)
		fs = fs.replace('c = applyFog(c, vW);', 'c += vec3(0.3, 0.75, 0.95) * smoothstep(0.14, 0.0, dist) * uNight.x * 0.3;\n\tc = applyFog(c, vW);');
	}
	const mat = new THREE.ShaderMaterial({
		vertexShader: src.vertexShader,
		fragmentShader: fs,
		uniforms: { ...src.uniforms, uFH: { value: tex }, uFHBox: { value: new THREE.Vector4(m.x0 - st / 2, m.y0 - st / 2, 1 / (W * st), 1 / (H * st)) } },
	});
	const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400, 1, 1).rotateX(-Math.PI / 2), mat);
	mesh.renderOrder = 2;
	mesh.matrixAutoUpdate = false;
	mesh.frustumCulled = false;
	mesh.visible = false;
	b.group.add(mesh);
	const fl = {
		b,
		mesh,
		tick: null,
		level(y) {
			mesh.position.y = y;
			mesh.updateMatrix();
		},
		on() {
			fl.level(0);
			mesh.visible = true;
			b.sea.visible = false;
		},
		off() {
			fl.tick = null;
			mesh.visible = false;
			b.sea.visible = true;
		},
	};
	// kare sürücüsü: yalnız su görünürken çalışır (kare başına nesne yok)
	mesh.onBeforeRender = () => fl.tick?.();
	// derleme: soru anında (cevaptan önce), paralel derleme varsa beklemeden
	try {
		mesh.visible = true;
		const r = app.renderer;
		if (r?.compileAsync) r.compileAsync(mesh, app.camera, app.scene).catch(() => {});
		else r?.compile?.(mesh, app.camera, app.scene);
	} catch {
		/* ilk çizimde derlenir */
	}
	mesh.visible = false;
	FL = fl;
	return fl;
}

/** İlin yükselmesini doğrudan sür (kolaylaştırma gecikmesi olmadan): tahta lift'ten liftTo'ya bir kare yaklaşır. */
export function holdLift(b, i, y) {
	b.liftTo[i] = y;
	b.lift[i] = y + 0.01;
}

const smooth = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

// ---------------------------------------------------------------- tip

const CSS = /* css */ `
.dn-tf{display:flex;flex-direction:column;gap:8px}
.dn-tf .fl-opt{min-height:46px}
.fl-q.dn-tf-rv .fl-jk{display:none}
.dn-tf.flood .fl-opt{min-height:42px}
.dn-tf .fl-opt span{display:flex;flex-direction:column;gap:1px}
.dn-tf .fl-opt em{font-style:normal;font-family:'Lilita One';font-weight:400;font-size:13px;letter-spacing:.03em;color:#2a6fd0;opacity:0;transform:translateY(4px);transition:opacity .3s,transform .3s}
.dn-tf .fl-opt.alt em{opacity:1;transform:none}
.dn-tf .fl-opt.sunk{background:linear-gradient(180deg,#bfe6ff,#7cc0f0);border-color:#4aa0e8;color:#0b2a52}
.dn-tf .fl-opt.sunk::before{content:'';position:absolute;inset:auto 0 0 0;height:42%;border-radius:0 0 14px 14px;background:linear-gradient(180deg,rgba(40,120,220,.0),rgba(40,120,220,.45));
  -webkit-mask:radial-gradient(9px 6px at 9px 0,transparent 98%,#000) 0 0/18px 100% repeat-x;mask:radial-gradient(9px 6px at 9px 0,transparent 98%,#000) 0 0/18px 100% repeat-x;animation:dnTfWave 1.6s linear infinite}
.dn-tf .fl-opt.isle{box-shadow:0 0 0 3px #ffd25a,0 0 22px rgba(255,210,90,.75),0 5px 0 rgba(0,0,0,.3)}
.dn-tf-g{display:flex;align-items:center;gap:8px;height:0;overflow:hidden;opacity:0;transition:height .35s,opacity .35s;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#cfe0ff}
.dn-tf.flood .dn-tf-g{height:30px;opacity:1}
.dn-tf-g i{flex:none;width:26px;height:26px;border-radius:50%;background:radial-gradient(circle at 50% 120%,#3aa8ff 0 48%,#0a1534 50%);border:2px solid #7cc8ff;overflow:hidden;position:relative}
.dn-tf-g i::after{content:'';position:absolute;left:-50%;right:-50%;bottom:30%;height:60%;border-radius:45%;background:rgba(124,200,255,.55);animation:dnTfSpin 2.2s linear infinite}
.dn-tf-g s{flex:1;height:8px;border-radius:6px;background:rgba(255,255,255,.14);overflow:hidden;position:relative;text-decoration:none}
.dn-tf-g s u{position:absolute;inset:0;border-radius:6px;background:linear-gradient(90deg,#2f6bff,#62e3d4);transform-origin:0 50%;transform:scaleX(0)}
.dn-tf-g b{text-transform:none;font-family:'Lilita One';font-weight:400;font-size:20px;letter-spacing:.02em;color:#9fe6ff;min-width:84px;text-align:right;text-shadow:0 2px 0 rgba(0,0,0,.4)}
.dn-tag.tf>div{--tc:#ffd25a}
.dn-tag.tf.sunk>div{--tc:#6fc8ff;background:rgba(8,40,80,.9)}
.dn-tag.tf.isle>div{--tc:#ffd25a;background:linear-gradient(180deg,#3a2a00,#1a1200);box-shadow:0 0 18px rgba(255,210,90,.7),0 3px 0 rgba(0,0,0,.35)}
@keyframes dnTfWave{to{-webkit-mask-position:18px 0;mask-position:18px 0}}
@keyframes dnTfSpin{to{transform:rotate(360deg)}}
`;

export const tufan = {
	time: 24,
	label: 'Tufan',
	kind: 'exact',
	needsMap: true,
	prepare(q, R) {
		const order = shuffle([0, 1, 2, 3], R);
		const alts = q.ils.map((x) => x[1]);
		const best = q.mode === 'once' ? alts.indexOf(Math.min(...alts)) : alts.indexOf(Math.max(...alts));
		const names = q.ils.map(([id]) => PROV[BY_ID.get(id)]?.name || String(id));
		const v = { q, opts: order.map((i) => names[i]), ils: order.map((i) => q.ils[i][0]), alt: order.map((i) => q.ils[i][1]), right: order.indexOf(best) };
		return stamp(v, q, (q2, k, P, text) => {
			for (const n of names) text(n);
			return { wait: 0.5 + 0.9, look: LOOK.orient + LOOK.map + 4 * LOOK.gaze };
		});
	},
	mount(el, v, api) {
		css('deneme', DENEME_CSS);
		css('tufan', CSS);
		const app = appOf();
		el.innerHTML = `<div class="dn-tf">
			<div class="dn-tf-g"><i></i><span>Deniz</span><s><u></u></s><b>+0 m</b></div>
			<div data-r="o"></div>
		</div>`;
		const root = el.firstElementChild;
		const c = mountChoice(el.querySelector('[data-r=o]'), v, api, { onPick: () => sfx(app, 'tap') });
		rule(el, v.q.mode === 'once' ? 'İlk batanı bul' : 'Son adayı bul');
		if (!app) return { lock: c.lock, reveal: (r) => c.reveal(r), destroy() {} };
		const b = app.board;
		const idx = v.ils.map((id) => BY_ID.get(id));
		const gQ = guard(app); // soru anı: gece, dört il ışıkta
		const gR = guard(app); // tufan: kaideler ve batış
		gQ.allActive();
		gQ.dark(idx);
		for (const i of idx) gR.fx(i, PED, 0.35);
		const fl = floodOf(app);
		const unlock = camLock(app);
		const tags = idx.map((i, k) => {
			const p = b.provinces[i];
			const t = tag(app, `<b>${'ABCD'[k]}</b>${esc(p.name)}`, p.x, p.z, 'tf');
			t.el.classList.add('tf');
			return t;
		});
		const bb = app.boundsOf(idx);
		const frame = (pitch, dur, extra = {}) =>
			app.cam.fit({ x0: bb.x0 - 3, x1: bb.x1 + 3, z0: bb.z0 - 3, z1: bb.z1 + 2 }, { pitch, pad: 1.18, top: cardTop(el), dur, arc: 3, ...extra });
		queueMicrotask(() => el.isConnected && frame(0.95, 0.9));
		let reveal = false;
		const stopOpen = onOpen(el, () => {
			// düello filmi sahneyi gündüze döndürebilir: gece, kart açılınca (ve az sonra) yeniden kurulur
			gQ.dark(idx);
			setTimeout(() => !reveal && el.isConnected && gQ.dark(idx), 1200);
			frame(0.88, 4, { yawRate: 0.02 });
		});
		let ended = false;
		const end = () => {
			if (ended) return;
			ended = true;
			if (fl) fl.off();
		};
		const close = onClose(el, () => {
			stopOpen();
			end();
			unlock();
			gR.restore(false);
			gQ.restore();
		});
		return {
			lock: c.lock,
			reveal(results) {
				reveal = true;
				c.reveal(results);
				el.closest('.fl-q')?.classList.add('dn-tf-rv'); // joker satırı kalkar: harita daha çok görünsün
				const gauge = root.querySelector('.dn-tf-g b');
				const bar = root.querySelector('.dn-tf-g u');
				root.classList.add('flood');
				gQ.restore(); // şafak: gün doğar, sahip renkleri geri gelir
				gR.allActive(); // tufan bütün ülkede
				for (const i of idx) gR.fx(i, PED, 0.6);
				// suyun planı: her seçeneğin rakımına sırayla, aralarda yavaşlayarak; sonunda son adanın eteğine kadar
				const ord = idx.map((_, k) => k).sort((a, b2) => v.alt[a] - v.alt[b2]);
				const a = ord.map((k) => v.alt[k]);
				const T0 = 0.8;
				const STEP = 1.35;
				const KT = [T0, T0 + STEP, T0 + 2 * STEP, T0 + 3 * STEP, T0 + 4 * STEP];
				const KM = [0, a[0], a[1], a[2], a[2] + (a[3] - a[2]) * 0.72];
				const top = KM[4];
				const sunk = [false, false, false, false];
				const sinkT = [0, 0, 0, 0];
				let final = false;
				let lastM = -1;
				const btns = c.btns;
				const t0 = clock.now();
				const meters = (t) => {
					if (t <= KT[0]) return 0;
					for (let s = 0; s < 4; s++) if (t < KT[s + 1]) return KM[s] + (KM[s + 1] - KM[s]) * smooth((t - KT[s]) / STEP);
					return KM[4];
				};
				const sink = (k, t) => {
					sunk[k] = true;
					sinkT[k] = t;
					const i = idx[k];
					const p = b.provinces[i];
					const first = ord[0] === k;
					const gold = v.q.mode === 'once' && first;
					const e = tags[k].el;
					e.classList.add(gold ? 'isle' : 'sunk');
					e.innerHTML = `<div>${gold ? '<b>İLK BATAN</b>' : ''}<b>${esc(p.name)}</b><em>${fmtM(v.alt[k])}</em></div>`;
					btns[k].classList.add('sunk', 'alt');
					if (gold) btns[k].classList.add('isle');
					btns[k].querySelector('span').insertAdjacentHTML('beforeend', `<em>${gold ? 'İLK BATTI · ' : 'BATTI · '}${fmtM(v.alt[k])}</em>`);
					pop(app, p.x, p.z, gold ? 'İLK!' : '', { colors: gold ? ['#ffd25a', '#bfefff', '#fff'] : ['#bfefff', '#6fc8ff', '#fff'], n: 16, dist: 70, cls: 'dn dn-cold' });
					sfx(app, 'crumble');
					app.cam.impulse?.(0.14);
					// kadraj su üstünde kalanlara daralır, kamera her batışta biraz daha alçalır
					const left = idx.filter((_, j) => !sunk[j] || j === k);
					const lb = app.boundsOf(left);
					const s2 = ord.indexOf(k);
					app.cam.fit({ x0: lb.x0 - 4, x1: lb.x1 + 4, z0: lb.z0 - 4, z1: lb.z1 + 3 }, { pitch: 0.56 - 0.05 * s2, pad: 1.12, top: cardTop(el), dur: 1.3, arc: 2, yawRate: 0.04 });
					buzz(12);
				};
				const isle = () => {
					final = true;
					const k = ord[3];
					const i = idx[k];
					const p = b.provinces[i];
					gR.fx(i, 0.55, 1);
					const e = tags[k].el;
					const win = v.q.mode !== 'once';
					e.classList.add(win ? 'isle' : 'sunk');
					e.classList.add('big');
					e.innerHTML = `<div>${win ? '<b>SON ADA</b>' : ''}<b>${esc(p.name)}</b><em>${fmtM(v.alt[k])}</em></div>`;
					btns[k].classList.add('alt');
					if (win) btns[k].classList.add('isle');
					btns[k].querySelector('span').insertAdjacentHTML('beforeend', `<em>${win ? 'SON ADA · ' : 'KALDI · '}${fmtM(v.alt[k])}</em>`);
					if (win) pop(app, p.x, p.z, 'SON ADA!', { colors: ['#ffd25a', '#fff', '#7dff9a'], n: 22, dist: 100, cls: 'dn dn-gold' });
					sfx(app, win ? 'star' : 'tap');
					buzz(win ? 25 : 8);
					// kamera: son adaya alçak açıdan yaklaşır ve yavaşça etrafında döner
					const ib = app.boundsOf([i]);
					const size = Math.max(ib.x1 - ib.x0, ib.z1 - ib.z0);
					app.cam.shot(p.x, p.z, { dist: size * 1.4 + 9, pitch: 0.36, yaw: app.cam.yaw + 0.4, dur: 1.9, arc: 4, yawRate: 0.05, decay: 0.15, lens: cardTop(el) / 2 });
				};
				if (fl) {
					fl.on();
					fl.tick = () => {
						const t = (clock.now() - t0) / 1000;
						const mm = meters(t);
						fl.level(levelY(mm));
						const r = Math.round(mm / 10) * 10;
						if (r !== lastM) {
							lastM = r;
							gauge.textContent = '+' + fmtM(Math.round(mm));
							bar.style.transform = `scaleX(${(mm / Math.max(1, top)).toFixed(3)})`;
						}
						for (let s = 0; s < 3; s++) {
							const k = ord[s];
							if (!sunk[k] && t >= KT[s + 1] - 0.15) sink(k, t);
							// batış: önce ağır ağır suya gömülür, sonra dibe
							if (sunk[k]) {
								const u = Math.min(1, (t - sinkT[k]) / SINK);
								holdLift(b, idx[k], PED - 0.55 * smooth(Math.min(1, u * 1.6)) - 2.4 * u * u * u);
							}
						}
						if (!final && t >= KT[4] - 0.1) isle();
					};
				} else {
					ord.slice(0, 3).forEach((k, s) => setTimeout(() => sink(k, 0), 400 + s * 700));
					setTimeout(isle, 2600);
				}
				// kamera: alçak açıdan süzülüş (dört il kadrajda, yavaş dönüş)
				frame(0.6, 1.5, { yawRate: 0.035 });
				const me = results.find((r) => r.p?.human);
				if (me) {
					const k = v.right;
					const sub = `${v.opts[k]} · ${fmtM(v.alt[k])}`;
					stampLater(app, me.correct ? (v.q.mode === 'once' ? 'İLK BATANI BİLDİN!' : 'SON ADAYI BİLDİN!') : me.value == null ? 'SÜRE DOLDU' : 'BATTIN!', me.correct ? 'gold' : 'bad', sub);
				}
			},
			destroy: close,
		};
	},
	/** Çevrimiçi görünüm: doğru şık, plakalar ve rakımlar sunucuda (cevapla gelir). */
	publicView(v) {
		const o = JSON.parse(JSON.stringify(v));
		delete o.right;
		delete o.alt;
		delete o.q.ils;
		return o;
	},
	/** Sınama yardımcısı: bir doğru ve bir yanlış değer (test/deneme*.test.mjs). */
	probe: (v) => ({ good: v.right, bad: (v.right + 1) % 4 }),
	judge(v, value) {
		return { correct: value === v.right, err: value === v.right ? 0 : 1 };
	},
	bot(v, skill, R) {
		const ok = R() < Math.min(0.95, pCorrect(skill, v.q.diff) + 0.05);
		let value = v.right;
		if (!ok) {
			// yanılan bot çoğunlukla en yakın rakıma kanar
			const ord = v.alt.map((_, k) => k).sort((a, b) => v.alt[a] - v.alt[b]);
			const near = v.q.mode === 'once' ? ord[1] : ord[2];
			value = R() < 0.6 ? near : ord.filter((k) => k !== v.right)[Math.floor(R() * 3)];
		}
		return { value, time: botTime(v, R, skill, 0.05, 0.85) };
	},
};
