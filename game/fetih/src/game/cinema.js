// Sinematik anlar: kamera çekimleri ve haritadaki savaş/kutlama efektleri. Her yöntem bir Promise döner;
// maç akışı bunları bekler. Hızlı benzetimde (fast) hepsi anında biter. Seçim ve yayılma anları ~1–2 sn;
// her saldırı ise kısa bir savaş filmi (aşağıda "savaş filmi"): soru öncesi ~5–6,5 sn, sonuç ~2,6–4 sn.
// Hepsi ekrana dokununca atlanır (atlanınca kamera ara çekimleri iptal olur; ordular o anın son haline
// yerleşir; kule düşmesi gibi oyun durumuna bağlı olaylar yine de gerçekleşir).
//
//   overview(map)            ilk çağrı: Türkiye üstünden açılış uçuşu → maç bölgesi; maç sonunda: zafer
//   introBadges(players)     başkentler yerleşince her kalenin üstünde oyuncu rozeti (SEN, bot adları)
//   castleDrop(p, i)         kale gökten iner, toz halkası
//   claim(p, i)              boş il alındı: küçük halka ve ışıltı
//   attack(p, d, t, isCap)   savaş filmi: iki ordu dizilir, saldıran sınıra yürür, oklar, çarpışma;
//                            kuşatmada mancınıklar surları döver, surdaki okçular karşılık verir
//   conquer(p, i)            hücum ve bozgun, cephede sancak yükselir, boya dalgası cepheden yayılır
//   towerDown(p, d, i, left) makineler kuleyi vurur, kule yıkılır, enkaz ve toz, saldıranlar sevinir
//   defend(d, i) / shield    kalkan parlar, saldıranlar sendeler ve geri çekilir, savunanlar sevinir
//   nobody(i)                iki ordu da çekilir
//   eliminated(d, by)        kale çöker, topraklar fatihin rengine dalga dalga boyanır
//   victory(m)               kazananın kalesi çevresinde yörünge, havai fişek, konfeti

import * as THREE from 'three';
import { clock, sleep, setTimeout, clearTimeout } from '../core/clock.js';
import { setNightTone } from '../gfx/env.js';
import { planStage, clearView, occlusion, yawOf, yawAt, stageDist, SEL_LIFT } from './stage.js';

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const wrapPi = (a) => a - Math.PI * 2 * Math.round(a / (Math.PI * 2));
const _v = new THREE.Vector3();
const OFF = [0, 0.12, -0.12, 0.24, -0.24]; // örtülme olursa denenecek küçük açı sapmaları
const STONE = 0xd9c7a4;
const STONE2 = 0x8b7a66;

export class Cinema {
	constructor(app) {
		this.app = app;
		this.fast = false;
		this.tempo = 1; // anların süre çarpanı (iki botun savaşında Match.filmTempo kısaltır)
		this._skip = null;
		this._t0 = 0;
		this._cur = null;
		this.a = new THREE.Vector3();
		this.b = new THREE.Vector3();
		this.c = new THREE.Vector3();
		this.d = new THREE.Vector3();
		// dokununca atla (çekimi başlatan dokunuştan hemen sonrakini sayma)
		app.container?.addEventListener(
			'pointerdown',
			() => {
				if (this._skip && !clock.paused && clock.now() - this._t0 > 160) this._skip(); // duraklatma ekranına dokunuş atlatmaz
			},
			true,
		);
		// kamera ataleti: parmak kalkınca kayma sürer
		app.canvas?.addEventListener('pointerdown', () => app.cam?.grab?.());
		const up = () => app.cam?.release?.();
		window.addEventListener('pointerup', up);
		window.addEventListener('pointercancel', up);
	}

	get fx() {
		return this.app.fx;
	}

	// ---------------------------------------------------------------- gece odağı

	/**
	 * Arayüzün seçim adımlarına bağlan: insan seçerken kamera bütün seçeneklerini çerçeveler; bot
	 * seçerken önce seçenekleri gecede aydınlık gösterilir, sonra seçimi. Harita sorusunda gündüz.
	 */
	bind(ui) {
		const app = this.app;
		const pick = ui.pickProvince.bind(ui);
		ui.pickProvince = (m, options, text, sec) => {
			setNightTone(app.G, m.phase === 'baskent' ? 'baskent' : 'normal');
			const pr = pick(m, options, text, sec);
			// kadraj: seçenekler; başkent seçiminde kamera yükselip bütün maç haritasına tepeden bakar
			if (!ui.fast && !this.fast) {
				if (m.phase === 'baskent') this.frameTop(m.map);
				else this.frameList(options, this._tails());
			}
			return pr;
		};
		const bot = ui.botPick.bind(ui);
		ui.botPick = async (m, p, i) => {
			if (ui.fast || this.fast) return bot(m, p, i);
			const b = app.board;
			const opts = this._options(m, p, i);
			const attack = b.provinces[i].owner >= 0;
			const capital = m.phase === 'baskent';
			setNightTone(app.G, capital ? 'baskent' : 'normal');
			const me = m.players?.find((q) => q.human);
			m.turn = p.i; // oyuncu kartlarındaki SIRA işareti rozetle aynı anda
			ui.hud?.(m);
			// seçenekler gecede ışık adası; sırası gelen botun toprağı net, okları ve rozeti kendi renginde,
			// hedeflerin adı ve sahibi etiketlerde
			b.select?.(opts, { attack, me: me ? me.i : null, act: p.i });
			ui.selNames(opts, capital ? [] : ui.homeBadges(m, p, opts));
			const frame = opts.slice();
			if (p.capital >= 0 && opts.length < 9) frame.push(p.capital);
			if (capital) this.frameTop(m.map);
			else this.frameList(frame);
			ui.caption?.(`SIRA · ${p.name}`, capital ? 'Başkentini seçiyor' : attack ? 'Hedefini seçiyor' : 'Bir il seçiyor', null, { p, tone: attack ? 'red' : '' });
			await sleep(880);
			b.select?.([i], { attack, me: me ? me.i : null, act: p.i });
			ui.selNames([i], capital ? [] : ui.homeBadges(m, p, [i]));
			ui.caption?.(`${p.name} · ${capital ? 'BAŞKENT' : attack ? 'SALDIRI' : 'YAYILMA'}`, b.provinces[i].name, capital ? 'KALE KURULUYOR' : attack ? 'SAVAŞ BAŞLIYOR' : 'YENİ TOPRAK', { p, tone: attack ? 'red' : '' });
			await bot(m, p, i);
			b.cues?.hide(); // seçim bitti: oklar söner (fetih ve düello oksuz)
		};
		const q = ui.question.bind(ui);
		ui.question = async (m, ctx) => {
			ui.caption?.(null);
			const map = !ui.fast && !!ctx?.T?.needsMap;
			if (map) {
				app.board.night?.(false, null, { hold: 0 });
				ui.tagsOff?.();
				this.clues(false); // "Sinop nerede?": il adları ve yapı maketleri cevabı ele vermesin
			}
			try {
				return await q(m, ctx);
			} finally {
				if (map) this.clues(true); // cevap açıklanırken geri gelir
			}
		};
	}

	/**
	 * Haritadaki ipuçları: il adları (3B ad katmanı yumuşakça söner) ve ünlü yapı maketleri. Harita
	 * sorusunda kapanır. Maketler fade(on) destekliyorsa yere gömülerek kaybolur, yoksa gizlenir.
	 */
	clues(on) {
		const b = this.app.board;
		b.labelLayer?.suspend?.(!on);
		const lm = this.app.props?.landmarks;
		if (!lm) return;
		if (lm.fade) lm.fade(on);
		else lm.mesh.visible = lm.caster.visible = on;
	}

	/** Kamera listedeki illerin hepsini çerçeveler (çok küçükse en az ~14 birim). */
	frameList(list, pts = null) {
		const app = this.app;
		if (!list || !list.length) return;
		this._spot(null); // seçimde bütün seçenekler aydınlık: ışık havuzu yok
		const b = app.boundsOf(list);
		// ek noktalar (okların çıkış yerleri): rozet için üstte biraz pay
		if (pts) {
			for (const q of pts) {
				b.x0 = Math.min(b.x0, q.x - 2.4);
				b.x1 = Math.max(b.x1, q.x + 2.4);
				b.z0 = Math.min(b.z0, q.z - 3.4);
				b.z1 = Math.max(b.z1, q.z + 1.2);
			}
		}
		const cx = (b.x0 + b.x1) / 2;
		const cz = (b.z0 + b.z1) / 2;
		const w = Math.max(14, b.x1 - b.x0);
		const d = Math.max(12, b.z1 - b.z0);
		const box = (this._fb ||= { x0: 0, x1: 0, z0: 0, z1: 0 });
		box.x0 = cx - w / 2;
		box.x1 = cx + w / 2;
		box.z0 = cz - d / 2;
		box.z1 = cz + d / 2 + 1.5; // alttaki arayüz için biraz pay
		// gece süzülüşü: kamera yolda hafifçe kalkar (kavis), varınca ağır ağır döner ve yaklaşır
		this._drift = -(this._drift || 1);
		app.cam.fit({ ...box }, { pitch: 0.95, pad: 1.2, dur: 0.95, arc: 4.5, yawRate: 0.03 * this._drift, distRate: -0.014, decay: 0.32 });
	}

	/**
	 * Başkent seçimi kadrajı: kamera yükselir, bütün maç haritası ekranı doldurur. Alttaki istem yazısı
	 * haritayı örtmesin diye kutu aşağı uzatılır (harita yukarıda, yazının üstünde ortalanır); eğim
	 * hafif kalır ki harita düz atlas değil, kabartmalı minyatür gibi görünsün.
	 */
	frameTop(list) {
		this._spot(null);
		const b = this.app.boundsOf(list);
		b.z1 += (b.z1 - b.z0) * 0.45;
		this.app.cam.fit(b, { pitch: 1.02, pad: 1.0, dur: 1.1, arc: 6 });
	}

	/** Okların çıkış noktaları (dünya x/z): kadraj bunları da içersin. */
	_tails() {
		const c = this.app.board.cues;
		return c?.on && c.tails.size ? [...c.tails.values()] : null;
	}

	/** Botun bu seçimdeki seçenekleri (maç akışıyla aynı kural). */
	_options(m, p, i) {
		const b = this.app.board;
		if (!m?.neighbors) return [i];
		if (m.phase === 'baskent') return m.capitalOptions();
		if (b.provinces[i].owner < 0) {
			const free = m.free();
			const adj = free.filter((j) => m.neighbors(j).some((k) => m.owner(k) === p.i));
			return adj.length ? adj : free;
		}
		const set = new Set();
		for (const j of m.owned(p.i)) for (const k of m.neighbors(j)) if (m.owner(k) >= 0 && !m.ally(m.owner(k), p.i)) set.add(k);
		return set.size ? [...set] : [i];
	}

	/**
	 * Gece ışık havuzu (yakın çekim): aydınlık il(ler) ekranın ortasında yumuşak bir ışıkta kalır,
	 * çevresi geceye karışır. p: dünya noktası (null → kapalı), r: yarıçap (dünya birimi).
	 */
	_spot(p, r = 4, k = 0.95, max = 0.17, ref = null) {
		const nl = this.app.nightLights;
		if (!nl?.focus) return;
		if (!p) nl.focus(null);
		else nl.focus(p.x, p.y, p.z, r, k, max, ref);
	}

	/** Gündüze dön (adlar genel kipe). */
	_day(hold = 0.3) {
		const b = this.app.board;
		this._spot(null);
		b.night?.(false, null, { hold });
		this.app.ui?.tagsOff?.();
		this.app.ui?.caption?.(null);
	}

	wait(ms) {
		return this.fast ? Promise.resolve() : sleep(ms);
	}

	/** Atlanabilir an: ms sonra ya da dokununca biter; bitince bu anın ara çekimleri (at) iptal. */
	beat(ms) {
		const tok = this._cur || { alive: true };
		this._cur = null;
		if (this.fast) {
			tok.alive = false;
			return Promise.resolve();
		}
		return new Promise((res) => {
			const done = () => {
				clearTimeout(id);
				if (this._skip === done) this._skip = null;
				tok.alive = false;
				res();
			};
			const id = setTimeout(done, ms * this.tempo);
			this._skip = done;
			this._t0 = clock.now();
		});
	}

	/** Bu anın içinde t sn sonra (an atlanırsa çalışmaz). Bir sonraki beat() bu anı kapatır. */
	at(t, fn) {
		const fx = this.fx;
		if (!fx) return;
		const tok = (this._cur ||= { alive: true });
		fx.after(t, () => tok.alive && fn());
	}

	_hold() {
		const s = this.app.cam.sh;
		if (s) {
			s.yawRate = 0;
			s.distRate = 0;
		}
	}

	/** İlin yer noktası (y: arazi + şimdiki/varsayılan yükselme). */
	_center(i, out, lift = null) {
		const b = this.app.board;
		const p = b.provinces[i];
		b.labelAt ? b.labelAt(i, out, true) : out.set(p.x, p.y, p.z);
		out.z -= 0.25;
		out.y = b.heightAt(out.x, out.z) + (lift != null ? lift * (b.liftUnit || 1.2) : b.liftOf(i));
		return out;
	}

	/** Saldıranın hedefe komşu ili (en yakını). */
	_source(p, target) {
		const b = this.app.board;
		const t = b.provinces[target];
		let best = -1;
		let bd = Infinity;
		for (const id of t.nb) {
			const q = b.byId.get(id);
			if (!q || q.owner !== p.i) continue;
			const d = Math.hypot(q.x - t.x, q.z - t.z);
			if (d < bd) {
				bd = d;
				best = q.index;
			}
		}
		if (best < 0) {
			// komşu yoksa saldıranın en yakın ili
			for (const q of b.provinces) {
				if (q.owner !== p.i) continue;
				const d = Math.hypot(q.x - t.x, q.z - t.z);
				if (d < bd) {
					bd = d;
					best = q.index;
				}
			}
		}
		return best;
	}

	// ---------------------------------------------------------------- açılış ve zafer

	async overview(map) {
		const app = this.app;
		const cam = app.cam;
		app.board.clearFx();
		app.board.night?.(false, null, { hold: 0 });
		const b = app.boundsOf(map);
		cam.setLimit?.(b);
		const m = app.match;
		if (!this.fast && m && m.round > 0 && m.map === map) return this.victory(m);
		if (this.fast || !cam.path || !m || m.round > 0) {
			cam.fit(b, { pitch: 0.98 });
			await this.wait(900);
			return;
		}
		// açılış uçuşu: Türkiye'nin öbür ucundan alçak geçiş, yükselerek maç bölgesine yerleş
		const all = (this._all ||= app.boundsOf(app.board.provinces.map((p) => p.index)));
		const cx = (b.x0 + b.x1) / 2;
		const cz = (b.z0 + b.z1) / 2;
		const ax = (all.x0 + all.x1) / 2;
		const az = (all.z0 + all.z1) / 2;
		const fd = cam.fitDist(b, 0.98);
		const whole = b.x1 - b.x0 > (all.x1 - all.x0) * 0.8;
		const side = whole ? -1 : cx > ax ? -1 : 1; // bölge doğudaysa batıdan başla
		const sx = side < 0 ? all.x0 + 7 : all.x1 - 7;
		const y0 = -side * 0.95;
		cam.path(
			[
				{ x: sx, z: az + 3, dist: 30, yaw: y0, pitch: 0.5 },
				{ x: sx + (ax - sx) * 0.55, z: az + 1, dist: 46, yaw: y0 * 0.55, pitch: 0.62 },
				{ x: (ax + cx) / 2, z: (az + cz) / 2, dist: Math.max(fd * 1.25, 55), yaw: y0 * 0.2, pitch: 0.82 },
				{ x: cx, z: cz, dist: fd, yaw: 0, pitch: 0.98 },
			],
			2.0,
		);
		app.sfx?.play?.('banner', { title: 'FETİH' });
		await this.beat(2000);
		cam.fit(b, { pitch: 0.98, dur: 0.45 });
	}

	async victory(m) {
		const app = this.app;
		const fx = this.fx;
		const st = m.standings();
		const w = st[0];
		const team = w.players || [w];
		const champ = team.find((p) => p.alive) || team[0];
		const k = app.castles[champ.i];
		const pos = this.a;
		if (k.group.visible) pos.copy(k.group.position);
		else {
			const b = app.boundsOf(m.map);
			pos.set((b.x0 + b.x1) / 2, 0, (b.z0 + b.z1) / 2);
			pos.y = app.board.heightAt(pos.x, pos.z);
		}
		const colors = [...team.map((p) => p.color), 0xffd34d, 0xffffff, 0xff7ad9];
		app.cam.orbitAt(pos.x, pos.z - 1, { dist: 22, pitch: 0.48, yaw: app.cam.yaw - 0.3, rate: 0.18, dur: 1.2 });
		if (fx) {
			_v.copy(pos);
			_v.y += 1.2;
			fx.fireworks(_v, colors, 8, 5, 4.8);
			fx.burst(pos, champ.color, { banner: false, big: 1.3 });
			fx.confetti(pos, colors, app.tier.id === 0 ? 90 : 160, 6, 5);
			const p2 = pos.clone();
			fx.after(1.6, () => fx.confetti(p2, colors, app.tier.id === 0 ? 60 : 110, 7, 6));
		}
		await this.beat(2000);
	}

	// ---------------------------------------------------------------- yayılma

	/**
	 * Başkentler yerleşince kısa tanıtım: her kalenin üstünde oyuncunun rozeti ("SEN", botların adı).
	 * Yeni oyuncu "hangisi benim?" sorusunun cevabını maçın en başında görür. Dokununca geçilir.
	 */
	async introBadges(players) {
		const ui = this.app.ui;
		if (this.fast || !ui || ui.fast || !ui.tagsOn) return;
		const badges = players.filter((p) => p.alive && p.capital >= 0).map((p) => ({ p, i: p.capital, castle: true }));
		if (!badges.length) return;
		ui.tagsOn([], { badges });
		await this.beat(1700);
		ui.tagsOff();
	}

	async castleDrop(p, i) {
		const app = this.app;
		const k = app.castles[p.i];
		const top = app.board.topAt(i, _v);
		app.board.fx(i, 0.25, 1);
		// kale yukarıdan iner
		if (!this.fast) {
			const y0 = top.y + 8;
			const tx = top.x;
			const tz = top.z;
			const ty = top.y;
			const fall = (t) => k.group.position.set(tx, y0 + (ty - y0) * t * t * t, tz); // hızlanarak düşer
			if (this.fx) await new Promise((res) => this.fx.anim(0.52, fall, res));
			else fall(1);
			const fx = this.fx;
			if (fx) {
				const g = this.b.set(tx, ty + 0.1, tz);
				fx.dust(g, 22, 1.6, 0xd8c8a6, 0.5);
				fx.ring(tx, ty + 0.15, tz, 0.8, 3.6, p.color, 0.7, 1.3, 0.14);
				fx.debris(g, 6, 2.4, 0.07, STONE2, STONE);
			}
			app.cam.impulse ? app.cam.impulse(0.5) : (app.cam.shake = 0.35);
			app.sfx?.play?.('castle');
		}
		k.place(app.board.topAt(i, _v));
		await this.wait(250);
		app.board.fx(i, 0, 0);
	}

	async claim(p, i) {
		const b = this.app.board;
		b.fx(i, 0.6, 1);
		this.app.sfx?.play?.('claim');
		if (!this.fast) {
			if (b.uAct) b.uAct.value = p.i;
			b.night?.(true, [i]); // boya dalgası gecede, sonra gündüz
			this.app.ui?.tagsOn?.(this.app.ui.tagSpecs(this.app.match, [i], 'pick'));
		}
		if (!this.fast && this.fx) {
			const c = this._center(i, this.c, 0.6);
			this.fx.ring(c.x, c.y + 0.1, c.z, 0.2, 1.6, p.color, 0.5, 1.1, 0.22);
			this.fx.twinkle(c, 8, 0.8, 0xfff1b0, 2);
		}
		await this.wait(380);
		b.fx(i, 0, 0);
		if (!this.fast) this._day(0.35);
	}

	// ---------------------------------------------------------------- savaş filmi
	//
	// Her saldırı kısa bir film. Sahne planı (stage.js) iki ilin ortak sınırında (kuşatmada kale kapısının
	// önünde) dizilişlerin sığdığı, yapılardan uzak yeri seçer. Kamera hep eylem ekseninin aynı yanında kalır
	// (180° kuralı) ve her çekimin açısı arazi, kale ve yapılar sahneyi örtmeyecek şekilde seçilir.
	// Sahra savaşı (~5–6 sn):
	//   0,0  kuruluş (vinç): kamera saldıranın ili üstünden alçalarak sahneye iner; ordular belirir;
	//        SALDIRAN / SAVUNAN etiketleri ve ok
	//   0,6  savunan safını kurar (geriden öne çıkar)
	//   1,2  izleme: yukarıdan (~56°) iki orduyu birlikte tutan, yürüyüşle kayan ve yavaşça dönen kamera
	//        (paralaks), ordular yaklaştıkça yaklaşır; davullar, ayak tozu; okçular yaylım ateşi açar
	//   ~3,0 çarpışma: kamera cepheye dalar ve yana süzülür (yörünge); mızraklar iner, kıvılcım ve toz
	//   ~4,4 bekleyiş: kamera geri çekilir; sahne çark ve soru boyunca kartın üstünde görünür
	// Kamera eğimi bütün çekimlerde yukarıdan (~50–65°): saflar tepeden okunur, ufuk az.
	// Kuşatma (~5,5–6,5 sn): mancınıklar ordunun gerisinde yürür, varınca sırayla ateş eder; taşlar alevli iz
	// bırakarak surlara çarpar; iki taraf ok atar. Sonuç anları ~2,6–3,8 sn: hücum ve bozgun + cephede
	// yükselen sancak ve cepheden yayılan boya dalgası; kalkan ve geri çekilme; kule yıkılışı. Hepsi
	// dokununca atlanır: ordular o anın son haline yerleşir, kamera son kadraja geçer.

	get battle() {
		return this.fx?.battle;
	}

	/** Sahne planı (geliştirme denetimi için: tools/savas.mjs --plan bütün komşu illeri dener). */
	stagePlan(src, target, isCap = false) {
		return planStage(this.app, src, target, isCap);
	}

	/** Savaş ışığı: kameranın baktığı yerde geniş ışık havuzu (yakın çekimde bütün sahne aydınlık, kenarlar gece). */
	_stageSpot(plan, r = null) {
		this._spot(plan.mid, r ?? plan.span * 0.55 + 2.4, 0.92, 0.42, this.app.cam.target);
	}

	/** Planın bir noktası, dünya yüksekliğiyle (aydınlık il kalkık). */
	_pt(x, z, out = new THREE.Vector3()) {
		return out.set(x, this.app.board.groundAt(x, z) + SEL_LIFT, z);
	}

	/** Kameranın kalacağı yan (eylem ekseninin solu ya da sağı): izleme ve çarpışma çekimlerinde örtülmeyen. */
	_side(plan) {
		const app = this.app;
		let best = 1;
		let bs = Infinity;
		for (const s of [1, -1]) {
			const a = occlusion(app, plan, plan.mid.x, plan.mid.y, plan.mid.z, yawAt(plan, s, 0.62), 0.98, 13);
			const c = occlusion(app, plan, plan.mid.x, plan.mid.y, plan.mid.z, yawAt(plan, s, 0.95), 0.9, 10);
			const e = occlusion(app, plan, plan.mid.x, plan.mid.y, plan.mid.z, yawAt(plan, s, 0.45), 1.02, 14);
			const sc = a + c + e * 0.5;
			if (sc < bs - 0.05) {
				bs = sc;
				best = s;
			}
		}
		return best;
	}

	/** Örtülmeyen açıdan çekim (p: odak, base: eksen yönü, offs: denenecek sapmalar). */
	_view(p, base, offs, pitch, dist, opt = {}) {
		const v = clearView(this.app, this.plan, p, base, offs, pitch, dist);
		this.app.cam.shot(p.x, p.z, { y: p.y, dist, pitch: v.pitch, yaw: v.yaw, arc: 0, ...opt });
		return v;
	}

	/** Bekleyiş kadrajı (çark ve soru boyunca): sahne kartın üstünde kalan alanda, ağır sürüklenme. */
	_settle(plan, side, quick = false) {
		const p = plan.siege ? this._pt(plan.mid.x + (plan.castle.x - plan.mid.x) * 0.3, plan.mid.z + (plan.castle.z - plan.mid.z) * 0.3) : plan.mid;
		const y = yawAt(plan, side, 0.45);
		const dist = stageDist(this.app, plan, p, y, 1.02, 'both', { pad: 1.5, min: 11, max: 20 });
		this._view(p, y, OFF, 1.02, dist, { dur: quick ? 0.55 : 1.2, lens: -0.17, yawRate: -side * 0.012, decay: 0.15 });
		if (this._tags) this.app.ui?.tagsOn?.(this._tags, {});
	}

	/**
	 * Vinç çekimi: şimdiki kadrajdan p1 (yüksek, geniş) üstünden geçip p2'ye alçalan tek akıcı hareket
	 * (Catmull-Rom yolu, baştan sona yumuşak hızlanma ve yavaşlama; ara durak yok).
	 */
	_crane(p1, y1, pitch1, d1, p2, y2, pitch2, d2, dur) {
		const cam = this.app.cam;
		const t = cam.target;
		const yaw0 = cam.yaw;
		const ya = yaw0 + wrapPi(y1 - yaw0);
		const yb = ya + wrapPi(y2 - ya);
		cam.path(
			[
				{ x: t.x, y: t.y, z: t.z, dist: cam.dist, yaw: yaw0, pitch: cam.pitch },
				{ x: p1.x, y: p1.y, z: p1.z, dist: d1, yaw: ya, pitch: pitch1 },
				{ x: p2.x, y: p2.y, z: p2.z, dist: d2, yaw: yb, pitch: pitch2 },
			],
			dur,
		);
	}

	/** Atlanabilir savaş anı: atlanırsa ordular o anın son haline yerleşir, sonra end() (son kadraj). */
	async _battleBeat(ms, end = null) {
		const t0 = clock.now();
		await this.beat(ms);
		if (!this.fast && clock.now() - t0 < ms - 40) {
			this.battle?.skip();
			end?.();
		}
	}

	/** Mancınık taşı sura çarptı: toz, taş parçaları, gümbürtü (çarpma ışığı ve sarsıntı fx.stone'da). */
	_wallHit(pt) {
		const fx = this.fx;
		fx.dust(pt, 7, 0.7, 0xd5c4a2, 0.7);
		fx.debris(pt, this.app.tier.id === 0 ? 4 : 7, 2.4, 0.07, STONE, STONE2);
		this.app.sfx?.play?.('tower', { soft: true });
	}

	async attack(p, d, target, isCap) {
		const app = this.app;
		const b = app.board;
		const cam = app.cam;
		b.fx(target, 0, 1); // hedef kalkmaz (iki il aynı yükseklikte: sahne kesintisiz), yalnızca parlar
		app.sfx?.play?.(isCap ? 'siege' : 'attack');
		if (this.fast) return;
		const t = b.provinces[target];
		const src = this._source(p, target);
		const bt = this.battle;
		if (src < 0 || !bt || !cam.shot) {
			cam.focus(t.x, t.z + 1.5, { dist: isCap ? 20 : 26, pitch: isCap ? 0.62 : 0.8 });
			await this.beat(900);
			return;
		}
		if (b.uAct) b.uAct.value = p.i;
		b.night?.(true, [src, target]);
		// kim kime: saldıranın ilinden hedefe saldıranın renginde ok; iki ilin etiketinde sahipleri (SALDIRAN / SAVUNAN)
		b.cues?.show([target], p.i, { attack: true });
		const ui = app.ui;
		this._tags = [
			{ i: src, kind: 'src', p, role: 'SALDIRAN' },
			{ i: target, kind: 'attack', p: d, role: isCap ? 'KALE' : 'SAVUNAN' },
		];
		ui?.tagsOn?.(this._tags, {});
		ui?.caption?.(isCap ? 'KUŞATMA' : 'SALDIRI', t.name, `${p.name} · ${d.name}`, { p, tone: 'red' });
		// sahne: nerede, hangi yönde, hangi dizilişle; ordular görünmez başlar
		const plan = (this.plan = planStage(app, src, target, isCap));
		bt.setup(plan, p.color, d.color);
		if (isCap) app.castles[d.i]?.aim?.(plan.attC.x, plan.attC.z); // kazanırsa taşların dövdüğü kule yıkılır
		bt.appear(1, 2.2);
		bt.cue(0.2, () => bt.appear(0, 2.4));
		this._stageSpot(plan);
		const u = plan.u;
		const side = (this.side = this._side(plan));
		// kuruluş (vinç): saldıranın ili üstünden yüksekten alçalarak sahneye; saldıranın arkasından 3/4 bakış
		const e = this._pt((plan.startC.x + (isCap ? plan.castle.x : plan.defC.x)) / 2, (plan.startC.z + (isCap ? plan.castle.z : plan.defC.z)) / 2, this.c);
		const yE = clearView(app, plan, e, yawAt(plan, side, 0.32), OFF, 1.0, 16).yaw;
		const dE = stageDist(app, plan, e, yE, 1.0, 'all', { pad: 1.32, min: 12, max: 22 });
		this._crane(plan.startC, yawAt(plan, side, 0.08), 1.2, dE * 1.4, e, yE, 1.0, dE, 1.25);
		// savunan safını kurar
		bt.cue(0.55, () => bt.march(1, 1.45));
		// yürüyüş: ordu kendi ilinden sınıra (yamuk hız; arka saflar biraz gecikir); davullar
		const Tm = clamp(plan.march / (isCap ? 0.8 : 0.92), 1.4, 2.5);
		const t0 = 1.2;
		bt.cue(t0, () => {
			bt.march(0, Tm);
			app.sfx?.play?.('march', { dur: Tm });
		});
		// izleme: iki orduyu birlikte tutan nokta (yürüdükçe kayar), yukarıdan; kamera yana süzülerek döner
		// (paralaks) ve ordular yaklaştıkça yaklaşır
		this.at(1.15, () => {
			ui?.tagsOff?.();
			b.labelLayer?.suspend?.(true); // yakın çekimde il adları da susar (ordunun ortasında yazı olmasın)
			b.cues?.hide();
			const y = yawAt(plan, side, 0.6);
			const d0 = stageDist(app, plan, bt.focus[2], y, 0.98, 'all', { pad: 1.1, min: 9, max: 18 });
			const d1 = stageDist(app, plan, plan.mid, y, 0.98, 'both', { pad: 1.1, min: 8, max: 16 });
			const v = clearView(app, plan, plan.mid, y, OFF, 0.98, d0);
			cam.shot(0, 0, { follow: bt.focus[2], dist: d0, pitch: v.pitch, yaw: v.yaw, dur: 0.95, arc: 0, yawRate: -side * 0.13, distRate: -0.07, distMin: d1, decay: 0.35 });
		});
		const tA = t0 + Tm + 0.1; // ordu vardı
		const L = this._pt(plan.line.x, plan.line.z, this.d);
		if (!isCap) {
			bt.cue(t0 + Tm * 0.45, () => bt.volley(0, 10));
			bt.cue(t0 + Tm * 0.78, () => bt.volley(1, 7));
			// çarpışma: kamera cepheye dalar, sonra yana süzülerek yörüngede yaklaşır (iki cephe hep kadrajda)
			this.at(tA - 0.3, () => {
				const y = yawAt(plan, side, 0.85);
				const d = stageDist(app, plan, L, y, 0.9, 'both', { pad: 1.12, min: 8 });
				this._view(L, y, OFF, 0.9, d, { dur: 0.75, yawRate: -side * 0.16, distRate: -0.05, distMin: d * 0.86, decay: 0.55 });
			});
			bt.cue(tA + 0.1, () => bt.engage(1.35, plan.engage));
			bt.cue(tA + 1.5, () => bt.standoff());
			this.at(tA + 1.35, () => this._settle(plan, side));
			await this._battleBeat((tA + 2.2) * 1000, () => this._settle(plan, side, true));
		} else {
			// kuşatma: makineler sırayla ateş eder (önce karşı ağırlıklı), taşlar surun saldırana bakan yüzüne
			const K = plan.castle;
			const C = this._pt(plan.attC.x + (K.x - plan.attC.x) * 0.45, plan.attC.z + (K.z - plan.attC.z) * 0.45);
			// makinelerin yanından kaleye: önde mancınıklar, arkada surlar; ağır yörünge
			this.at(tA - 0.25, () => {
				const y = yawAt(plan, side, 0.72);
				const d = stageDist(app, plan, C, y, 0.88, 'all', { pad: 1.08, min: 9, max: 17 });
				this._view(C, y, OFF, 0.88, d, { dur: 0.9, yawRate: -side * 0.08, distRate: -0.025, distMin: d * 0.9, decay: 0.3 });
			});
			const n = plan.machines.length;
			for (let k = 0; k < n; k++)
				bt.cue(tA + 0.15 + k * 0.42, () => {
					const s = (Math.random() - 0.5) * 1.3;
					const w = new THREE.Vector3(K.x - u.x * 1.05 + plan.v.x * s, K.y + 0.7 + Math.random() * 0.45, K.z - u.z * 1.05 + plan.v.z * s);
					bt.fire(k, w, (pt) => this._wallHit(pt), 1.0);
				});
			bt.cue(tA + 0.5, () => bt.volley(0, 10));
			bt.cue(tA + 1.25, () => bt.volley(1, 6));
			bt.cue(tA + 2.0, () => bt.standoff());
			this.at(tA + 1.9, () => this._settle(plan, side));
			await this._battleBeat((tA + 2.7) * 1000, () => this._settle(plan, side, true));
		}
		b.cues?.hide(); // yürüyüş bitti: ok söner (çark ve düello oksuz; etiketler kalır)
	}

	async conquer(p, i) {
		const app = this.app;
		const b = app.board;
		b.cues?.hide();
		if (this.fast) {
			b.fx(i, 0.6, 1);
			b.fx(i, 0, 0);
			return;
		}
		const fx = this.fx;
		const cam = app.cam;
		const bt = this.battle;
		const plan = bt?.on && this.plan?.target === i ? this.plan : null;
		app.sfx?.play?.('conquer');
		// boya dalgası her zaman gecede (harita sorusundan gündüzde gelinse bile)
		if (b.uAct) b.uAct.value = p.i;
		b.night?.(true, [i], { fast: (b.nightAmt ?? 1) < 0.5 });
		app.ui?.tagsOn?.(app.ui.tagSpecs(app.match, [i], 'conq'));
		app.ui?.caption?.('FETİH', b.provinces[i].name, `${p.name} topraklarına katıldı`, { p });
		const c = this._center(i, this.a, 0.6);
		if (!plan || !fx) {
			b.fx(i, 0.6, 1);
			if (fx) {
				const cc = c.clone();
				this.at(0.22, () => {
					fx.burst(cc, p.color);
					fx.shake(0.45);
				});
			}
			this._spot(c, 3.6);
			if (cam.shot) cam.shot(c.x, c.z + 0.6, { dist: 30, pitch: 0.86, yaw: cam.yaw * 0.5, dur: 1.2 });
			await this.beat(1400);
			b.fx(i, 0, 0);
			this._day(0);
			await this.wait(b.nightOut ? b.nightOut * 1000 : 900);
			return;
		}
		b.fx(i, 0.14, 1);
		const u = plan.u;
		const base = yawOf(u.x, u.z);
		const side = this.side || 1;
		const L = this._pt(plan.line.x, plan.line.z, this.b);
		this._stageSpot(plan, plan.span * 0.6 + 3);
		// hücum ve bozgun; boya dalgası cepheden, ordunun ardından yayılır
		bt.charge(plan.charge);
		b.paint?.(i, p.color, L.x, L.z);
		const yC = yawAt(plan, side, 0.75);
		const dC = stageDist(app, plan, L, yC, 0.95, 'both', { pad: 1.2, min: 8.5 });
		const v = clearView(app, plan, L, yC, OFF, 0.95, dC);
		cam.shot(0, 0, { follow: bt.focus[0], fx: u.x * 0.6, fz: u.z * 0.6, dist: dC, pitch: v.pitch, yaw: v.yaw, dur: 0.6, arc: 0, yawRate: -side * 0.12, decay: 0.4 });
		// zafer sancağı cephede yükselir
		const fp = this._pt(L.x + u.x * 1.35, L.z + u.z * 1.35, new THREE.Vector3());
		fx.after(1.0, () => {
			fx.standard(fp, p.color, 3.6);
			fx.burst(fp, p.color, { banner: false, big: 0.7 });
			fx.shake(0.4);
		});
		// kamera yükselir: sancak ve ilin boyanışı birlikte
		const P = b.provinces[i];
		const span = Math.max(P.box[2] - P.box[0], P.box[3] - P.box[1]);
		this.at(1.5, () => {
			const q = this._pt(fp.x + (c.x - fp.x) * 0.4, fp.z + (c.z - fp.z) * 0.4);
			cam.shot(q.x, q.z, { y: q.y, dist: clamp(span * 1.6 + 6, 15, 26), pitch: 1.08, yaw: cam.yaw + wrapPi(base - cam.yaw) * 0.35, dur: 1.3, arc: 0, ease: (s) => 1 - Math.pow(1 - s, 3) });
		});
		await this._battleBeat(2850);
		bt.fade(-1, 1.4);
		b.fx(i, 0, 0);
		// şafak: gece sıcak bir ufukla aydınlanır, kamera hafifçe geri çekilir; sonra sıradaki tur
		this._day(0);
		const t = cam.target;
		cam.shot(t.x, t.z + 0.4, { y: t.y, dist: cam.dist * 1.08, pitch: Math.min(0.95, cam.pitch + 0.04), yaw: cam.yaw, dur: 1.1, arc: 0, ease: (s) => 1 - Math.pow(1 - s, 3) });
		await this.wait(b.nightOut ? b.nightOut * 1000 : 900);
	}

	async towerDown(p, d, i, left) {
		const app = this.app;
		const cam = app.cam;
		const fx = this.fx;
		const k = app.castles[d.i];
		if (this.fast || !fx) {
			app.sfx?.play?.('tower');
			cam.shake = 0.8;
			await this.wait(900);
			app.board.fx(i, 0, 0);
			return;
		}
		const bt = this.battle;
		const plan = bt?.on && this.plan?.siege && this.plan.target === i ? this.plan : null;
		const ti = k.lastHit ?? 1;
		const tw = k.towers?.[ti];
		// kule taş değene kadar ayakta kalsın
		if (tw) tw.alive = 1;
		const tp = k.towerPos(ti, new THREE.Vector3());
		const c = k.group.position;
		const ox = tp.x - c.x;
		const oz = tp.z - c.z;
		// kamera kuleyi yandan görsün (düşüşü donjon örtmesin); kuşatmada saldıranlar ve makineler de kadrajda
		if (plan) {
			const on = Math.hypot(ox, oz) || 1;
			const tx = ox / on;
			const tz = oz / on;
			// saldıranların yanından, makineler önde, kule kadrajın içinde ve donjonun önünde (düşüşü görünsün)
			const s0 = this.side || 1;
			const K = plan.castle;
			const f = this._pt(K.x + (plan.attC.x - K.x) * 0.42, K.z + (plan.attC.z - K.z) * 0.42);
			f.y = Math.max(f.y, c.y + 0.3);
			let best = null;
			for (const s of [s0, -s0])
				for (const phi of [0.6, 0.85, 1.1, 1.35]) {
					const y = yawAt(plan, s, phi);
					const dot = Math.sin(y) * tx - Math.cos(y) * tz; // kulenin bakış yönündeki payı (+: donjonun arkasında)
					const sc = (dot > 0.25 ? 2 + dot : 0) + (s !== s0 ? 0.8 : 0) + Math.abs(phi - 0.85) * 0.5 + occlusion(app, plan, f.x, f.y, f.z, y, 0.75, 13) * 0.5;
					if (!best || sc < best.sc) best = { sc, y };
				}
			// kule yıkılışı yandan okunsun diye eğim biraz daha alçak (~43°); ağır yaklaşma
			const d = stageDist(app, plan, f, best.y, 0.75, 'all', { pad: 1.08, min: 11, max: 17 });
			cam.shot(f.x, f.z, { y: f.y, dist: d, pitch: 0.75, yaw: best.y, dur: 0.6, arc: 0, distRate: -0.03, distMin: d * 0.9, decay: 0.4 });
		} else {
			const ol = Math.hypot(ox, oz) || 1;
			const s1 = (-oz / ol) * ox + (ox / ol) * oz > 0 ? 1 : -1;
			const vx = (-oz / ol) * s1 * 0.6 + (ox / ol) * 0.4;
			const vz = (ox / ol) * s1 * 0.6 + (oz / ol) * 0.4;
			const focus = this._pt(c.x + ox * 0.7, c.z + oz * 0.7);
			cam.shot(focus.x, focus.z, { y: c.y + 0.6, dist: 13, pitch: 0.42, yaw: Math.atan2(-vx, vz), dur: 0.55, arc: 1 });
		}
		this._spot(c, 3.6, 0.95, 0.4);
		let fallen = false;
		const collapse = () => {
			if (fallen) return;
			fallen = true;
			if (tw) tw.alive = 0;
			const base = c.clone().add(new THREE.Vector3(ox * 1.2, 0.2, oz * 1.2));
			fx.debris(tp, app.tier.id === 0 ? 12 : 18, 3.4, 0.11, STONE, STONE2);
			fx.dust(base, 26, 1.3, 0xd5c4a2, 0.9);
			fx.ring(base.x, base.y, base.z, 0.4, 2.6, 0xe8dcc0, 0.7, 0.8, 0.25);
			fx.smokeColumn(tp, 3.2, 12);
			fx.shake(0.95);
			app.sfx?.play?.('tower');
			bt?.cheer(0);
		};
		const low = tp.clone();
		low.y -= 0.6;
		if (plan) {
			// önce oklar, sonra makineler sırayla kuleye: ilk taş kuleyi yıkar
			this.at(0.05, () => {
				const a = bt.centroid(0, new THREE.Vector3(), 2);
				if (a) fx.arrows(a.setY(a.y + 0.3), low, 10, 0.75, 0.35);
			});
			const n = plan.machines.length;
			for (let m = 0; m < n; m++) bt.cue(0.12 + m * 0.3, () => bt.fire(m, m ? low.clone().setY(low.y + Math.random() * 0.5) : tp, m ? (pt) => this._wallHit(pt) : collapse, 0.85));
		} else {
			const camp = c.clone().add(new THREE.Vector3(ox * 4, 0.4, oz * 4));
			fx.stone(camp, tp, 0.75, 3, collapse);
		}
		fx.after(1.9, collapse); // taş havuzu doluysa da yıkılsın
		await this._battleBeat(3300, collapse);
		this._hold();
		bt?.withdraw();
		app.board.fx(i, 0, 0);
		this._day();
	}

	/** Savunma kazandı: kalkan parlar, saldıranlar sendeler, bir kısmı düşer, ordu geri çekilir; savunanlar sevinir. */
	async defend(d, i, { shield = false } = {}) {
		const app = this.app;
		const b = app.board;
		b.fx(i, 0, 0.6);
		app.sfx?.play?.(shield ? 'shield' : 'defend');
		if (this.fast || !this.fx) {
			await this.wait(600);
			b.fx(i, 0, 0);
			return;
		}
		const fx = this.fx;
		const bt = this.battle;
		const cam = app.cam;
		const k = app.castles[d.i];
		const isCap = d.capital === i && k.group.visible;
		const plan = bt?.on && this.plan?.target === i ? this.plan : null;
		if (!plan) {
			const c = isCap ? this.a.copy(k.group.position) : this._center(i, this.a, 0.15);
			const P = b.provinces[i];
			const r = isCap ? 2.9 : clamp(Math.max(P.box[2] - P.box[0], P.box[3] - P.box[1]) * 0.32, 1.6, 3);
			this._spot(c, r + 1.6);
			fx.shield(c.x, c.y - 0.1, c.z, r, d.color, 1.1);
			fx.ring(c.x, c.y + 0.1, c.z, r * 0.9, r * 1.6, d.color, 0.6, 1, 0.2);
			if (cam.shot) cam.shot(c.x, c.z, { dist: isCap ? 17 : 20, pitch: 0.7, yaw: cam.yaw, dur: 0.8, arc: 0 });
			await this.beat(1050);
			b.fx(i, 0, 0);
			this._day();
			return;
		}
		const side = this.side || 1;
		// kalkan: savunanların safını (kuşatmada kaleyi) örter
		const dc = this._pt(plan.defC.x, plan.defC.z, this.a);
		const sc = isCap ? this.c.copy(k.group.position) : dc;
		const r = isCap ? 2.9 : plan.def.W * 0.5 + 0.7;
		fx.shield(sc.x, sc.y - 0.1, sc.z, r, d.color, shield ? 1.5 : 1.15);
		fx.ring(sc.x, sc.y + 0.1, sc.z, r * 0.9, r * 1.6, d.color, 0.6, 1, 0.2);
		const L = this._pt(plan.line.x, plan.line.z, this.b);
		L.y += 0.25;
		fx.sparks(L, 18, 2.6, 0xbfe0ff, 2.6, 0.06, 4);
		bt.repel();
		this._stageSpot(plan);
		// kalkan cephede parlar: kamera cepheye yaklaşıp süzülür; sonra geri çekilen orduyu yukarıdan izler
		const yD = yawAt(plan, side, 0.8);
		const dD = stageDist(app, plan, L, yD, 0.92, isCap ? 'all' : 'both', { pad: 1.15, min: 9 });
		this._view(L, yD, OFF, 0.92, dD, { dur: 0.8, yawRate: -side * 0.1, distRate: -0.03, distMin: dD * 0.9, decay: 0.5 });
		this.at(1.3, () => {
			const q = this._pt((plan.mid.x + plan.attC.x) / 2, (plan.mid.z + plan.attC.z) / 2);
			const y = yawAt(plan, side, 0.5);
			this._view(q, y, OFF, 1.0, stageDist(app, plan, q, y, 1.0, 'all', { pad: 1.35, min: 11 }), { dur: 1.2, yawRate: -side * 0.03, decay: 0.3 });
		});
		await this._battleBeat(2600);
		bt.fade(-1, 1.5);
		b.fx(i, 0, 0);
		this._day();
	}

	/** Kalkan jokeri saldırıyı savuşturdu: savunma anı, kalkan daha uzun parlar. */
	shield(d, i) {
		return this.defend(d, i, { shield: true });
	}

	async nobody(i) {
		const bt = this.battle;
		if (!this.fast && bt?.on) {
			bt.withdraw();
			const cam = this.app.cam;
			const t = cam.target;
			cam.shot(t.x, t.z, { y: t.y, dist: cam.dist * 1.15, pitch: Math.min(1, cam.pitch + 0.08), yaw: cam.yaw, dur: 1.2, arc: 0 });
		}
		await this._battleBeat(1500);
		bt?.fade(-1, 1.5);
		this.app.board.fx(i, 0, 0);
		if (!this.fast) this._day();
	}

	async eliminated(d, by) {
		const app = this.app;
		const fx = this.fx;
		app.sfx?.play?.('eliminate');
		if (this.fast || !fx) {
			app.cam.shake = 1;
			await this.wait(1200);
			return;
		}
		const k = app.castles[d.i];
		const c0 = k.group.position.clone();
		const cam = app.cam;
		cam.shot(c0.x, c0.z, { y: c0.y + 0.5, dist: 16, pitch: 0.82, yaw: cam.yaw, dur: 0.5, arc: 0.5 });
		// kale bir an daha görünür, sarsılarak toprağa gömülür
		k.group.visible = true;
		this.battle?.fade(-1, 1.2);
		let puff = 0;
		fx.anim(
			1.3,
			(t) => {
				const e = t * t;
				k.group.position.set(c0.x + Math.sin(t * 70) * 0.05 * (1 - t), c0.y - e * 3.2, c0.z + Math.cos(t * 61) * 0.05 * (1 - t));
				if (t * 6 > puff) {
					puff++;
					const p = this.b.set(c0.x + (Math.random() - 0.5) * 2.4, c0.y + 0.4 + Math.random() * 1.2, c0.z + (Math.random() - 0.5) * 2.4);
					fx.debris(p, app.tier.id === 0 ? 5 : 8, 3, 0.1, STONE, STONE2);
					fx.dust(p, 4, 0.8, 0xd5c4a2, 0.6);
					fx.shake(0.7);
				}
			},
			() => {
				k.group.visible = false;
				k.group.position.copy(c0);
			},
		);
		fx.dust(this.c.copy(c0).setY(c0.y + 0.2), 22, 1.6, 0xd8c8a6, 0.7);
		fx.ring(c0.x, c0.y + 0.2, c0.z, 1, 5, 0xe8dcc0, 1, 0.9, 0.2);
		fx.smokeColumn(this.d.copy(c0).setY(c0.y + 0.6), 3, 16);
		// yenilenin toprakları fatihin rengine kaleden dışa dalga dalga boyanır
		const b = app.board;
		const S = b.S;
		const N = b.count;
		if (S && b.paint) {
			for (const p of b.provinces) {
				if (p.owner !== by.i || S[(N + p.index) * 4 + 3] !== d.i) continue;
				b.paint(p.index, by.color, c0.x, c0.z);
			}
		}
		this.at(1.2, () => fx.burst(c0, by.color, { big: 1.2 }));
		await this.beat(1900);
		this._day();
	}
}
