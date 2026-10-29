// Sinematik anlar: kamera çekimleri ve haritadaki savaş/kutlama efektleri. Her yöntem bir Promise döner;
// maç akışı bunları bekler. Hızlı benzetimde (fast) hepsi anında biter. Her an en çok ~2 sn sürer ve
// ekrana dokununca atlanır (atlanınca kamera ara çekimleri iptal olur; kule düşmesi gibi oyun durumuna
// bağlı olaylar yine de gerçekleşir).
//
//   overview(map)            ilk çağrı: Türkiye üstünden açılış uçuşu → maç bölgesi; maç sonunda: zafer
//   introBadges(players)     başkentler yerleşince her kalenin üstünde oyuncu rozeti (SEN, bot adları)
//   castleDrop(p, i)         kale gökten iner, toz halkası
//   claim(p, i)              boş il alındı: küçük halka ve ışıltı
//   attack(p, d, t, isCap)   ordu saldıranın sınırından hedefe yürür; kuşatmada mancınık ve oklar
//   conquer(p, i)            hücum, fetih patlaması, sancak yükselir, kamera geri çekilir
//   towerDown(p, d, i, left) mancınık taşları kuleyi vurur, kule yıkılır, enkaz ve toz
//   defend(d, i)             kalkan parlar, ordu geri çekilir
//   nobody(i)                ordu geri çekilir
//   eliminated(d, by)        kale çöker, topraklar fatihin rengine dalga dalga boyanır
//   victory(m)               kazananın kalesi çevresinde yörünge, havai fişek, konfeti

import * as THREE from 'three';
import { clock, sleep, setTimeout, clearTimeout } from '../core/clock.js';

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const wrapPi = (a) => a - Math.PI * 2 * Math.round(a / (Math.PI * 2));
const _v = new THREE.Vector3();
const STONE = 0xd9c7a4;
const STONE2 = 0x8b7a66;

export class Cinema {
	constructor(app) {
		this.app = app;
		this.fast = false;
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
		ui.question = (m, ctx) => {
			ui.caption?.(null);
			if (!ui.fast && ctx?.T?.needsMap) {
				app.board.night?.(false, null, { hold: 0 });
				ui.tagsOff?.();
			}
			return q(m, ctx);
		};
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

	/** Kamera yükselir ve listedeki illere neredeyse tepeden bakar (başkent seçimi: bütün harita görünsün). */
	frameTop(list) {
		this._spot(null);
		this.app.cam.fit(this.app.boundsOf(list), { pitch: 1.22, pad: 1.08, dur: 1.1, arc: 6 });
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
	_spot(p, r = 4, k = 0.95) {
		const nl = this.app.nightLights;
		if (!nl?.focus) return;
		if (!p) nl.focus(null);
		else nl.focus(p.x, p.y, p.z, r, k);
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
			const id = setTimeout(done, ms);
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

	// ---------------------------------------------------------------- fetih

	async attack(p, d, target, isCap) {
		const app = this.app;
		const b = app.board;
		const cam = app.cam;
		const fx = this.fx;
		b.fx(target, 0.35, 1);
		app.sfx?.play?.(isCap ? 'siege' : 'attack');
		if (this.fast) return;
		const t = b.provinces[target];
		const src = this._source(p, target);
		if (src < 0 || !fx || !cam.shot) {
			cam.focus(t.x, t.z + 1.5, { dist: isCap ? 20 : 26, pitch: isCap ? 0.62 : 0.8 });
			await this.beat(900);
			return;
		}
		// yol: saldıranın ilinden ortak sınıra, oradan hedefe (kuşatmada kalenin önüne)
		if (b.uAct) b.uAct.value = p.i;
		b.night?.(true, [src, target]);
		// kim kime: saldıranın ilinden hedefe saldıranın renginde ok; iki ilin etiketinde sahipleri (SALDIRAN / SAVUNAN)
		b.cues?.show([target], p.i, { attack: true });
		const ui = app.ui;
		ui?.tagsOn?.(
			[
				{ i: src, kind: 'src', p, role: 'SALDIRAN' },
				{ i: target, kind: 'attack', p: d, role: isCap ? 'KALE' : 'SAVUNAN' },
			],
			{},
		);
		ui?.caption?.(isCap ? 'KUŞATMA' : 'SALDIRI', t.name, `${p.name} · ${d.name}`, { p, tone: 'red' });
		const S = b.provinces[src];
		const border = b.borderPoint ? b.borderPoint(src, target, this.a) : this.a.set((S.x + t.x) / 2, 0, (S.z + t.z) / 2);
		const from = this.b.set(S.x + (border.x - S.x) * 0.35, 0, S.z + (border.z - S.z) * 0.35);
		const to = this.c;
		const k = app.castles[d.i];
		if (isCap) to.copy(k.group.position);
		else this._center(target, to, 0.35).lerp(border, 0.4);
		from.y = b.heightAt(from.x, from.z);
		const dx = to.x - from.x;
		const dz = to.z - from.z;
		const span = Math.hypot(dx, dz);
		// ışık havuzu: saldıranın ili ile hedef birlikte, çevreleri gece
		const sc = this._center(src, this.d, 0);
		const tc = this._center(target, _v, 0);
		this._spot(sc.lerp(tc, 0.55), Math.hypot(tc.x - sc.x, tc.z - sc.z) * 0.5 + 1.8);
		fx.march(from, to, p.color, { siege: isCap, dur: isCap ? 1.1 : 1.2, stopShort: isCap ? 2.5 : 0 });
		// kamera: saldıranın arkasından, yürüyüş yönüne bakarak; sonra hedefe yaklaş
		const yaw = clamp(wrapPi(Math.atan2(dx, -dz)) * 0.45, -0.55, 0.55);
		const mx = (from.x + to.x) / 2;
		const mz = (from.z + to.z) / 2;
		const d0 = clamp(span * 2 + 14, 20, 32); // gece bağlamı görünsün: iki ışık adası ve çevresindeki gece
		cam.shot(mx, mz, { dist: d0, pitch: isCap ? 0.66 : 0.78, yaw, dur: 0.6 });
		const tx = to.x;
		const tz = to.z;
		if (isCap) {
			// kuşatma: mancınıkların arkasından 3/4 bakış, alçak ağır yörünge; oklar ve iki taş surları döver
			const ux = dx / span;
			const uz = dz / span;
			const wall = new THREE.Vector3(tx - ux * 1.1, to.y + 0.9, tz - uz * 1.1);
			const camp = from.clone();
			const full = Math.atan2(dx, -dz) + 0.55;
			this._siegeYaw = full;
			const kp = k.group.position.clone();
			this.at(0.55, () => {
				cam.orbitAt(tx - ux * 2.3, tz - uz * 2.3, { dist: 16, pitch: 0.52, yaw: full, rate: 0.1, dur: 0.85 });
				this._spot(kp, 3.4);
			});
			this.at(0.75, () => fx.arrows(camp, wall, 12, 0.6, 0.8));
			this.at(1.0, () => fx.catapult(0, wall, () => app.sfx?.play?.('tower', { soft: true })));
			this.at(1.3, () => fx.catapult(1, wall.clone().setY(wall.y + 0.4), null));
			await this.beat(1900);
		} else {
			// hedefe yaklaş ama ikisi ve çevrelerindeki gece kadrajda kalsın (ışık havuzu ortada)
			const fx2 = mx + (tx - mx) * 0.6;
			const fz2 = mz + (tz - mz) * 0.6;
			this.at(0.6, () => cam.shot(fx2, fz2, { dist: Math.max(21, d0 * 0.9), pitch: 0.74, yaw, dur: 0.95, arc: 0, distRate: -0.015, distMin: 19 }));
			await this.beat(1600);
		}
		b.cues?.hide(); // yürüyüş bitti: ok söner (çark ve düello oksuz; etiketler kalır)
		this._hold();
	}

	async conquer(p, i) {
		const app = this.app;
		const b = app.board;
		b.cues?.hide();
		b.fx(i, 0.6, 1);
		if (this.fast) {
			b.fx(i, 0, 0);
			return;
		}
		const fx = this.fx;
		const cam = app.cam;
		const c = this._center(i, this.a, 0.6);
		if (fx) {
			fx.armyCharge(c);
			const cc = c.clone();
			this.at(0.22, () => {
				fx.burst(cc, p.color);
				fx.shake(0.45);
			});
		} else cam.shake = 0.5;
		app.sfx?.play?.('conquer');
		// boya dalgası her zaman gecede (harita sorusundan gündüzde gelinse bile)
		if (b.uAct) b.uAct.value = p.i;
		b.night?.(true, [i], { fast: (b.nightAmt ?? 1) < 0.5 });
		app.ui?.tagsOn?.(app.ui.tagSpecs(app.match, [i], 'conq'));
		app.ui?.caption?.('FETİH', b.provinces[i].name, `${p.name} topraklarına katıldı`, { p });
		this._spot(c, 3.6);
		// uzaktan geliniyorsa (harita sorusundan) hızlı kesme: boya dalgası kaçmasın
		const far = cam.target ? Math.hypot(cam.target.x - c.x, cam.target.z - c.z) > 8 : false;
		if (cam.shot) cam.shot(c.x, c.z + 0.6, { dist: 30, pitch: 0.86, yaw: cam.yaw * 0.5, dur: far ? 0.55 : 1.2, arc: far ? 2 : 0 });
		await this.beat(1400);
		b.fx(i, 0, 0);
		// şafak: gece sıcak bir ufukla aydınlanır, kamera hafifçe geri çekilir; sonra sıradaki tur
		this._day(0);
		if (cam.shot) cam.shot(c.x, c.z + 0.8, { dist: 33, pitch: 0.9, yaw: 0, dur: 1.1, arc: 0, ease: (t) => 1 - Math.pow(1 - t, 3) });
		await this.wait(b.nightOut ? b.nightOut * 1000 : 900);
	}

	async towerDown(p, d, i, left) {
		const app = this.app;
		const cam = app.cam;
		const fx = this.fx;
		const k = app.castles[d.i];
		app.sfx?.play?.('tower');
		if (this.fast || !fx) {
			cam.shake = 0.8;
			await this.wait(900);
			app.board.fx(i, 0, 0);
			return;
		}
		const ti = k.lastHit ?? 1;
		const tw = k.towers?.[ti];
		// kule taşlar değene kadar ayakta kalsın
		if (tw) tw.alive = 1;
		const tp = k.towerPos(ti, new THREE.Vector3());
		const c = k.group.position;
		const ox = tp.x - c.x;
		const oz = tp.z - c.z;
		// kamera kuleyi yandan görsün (düşüşü donjon örtmesin), ordunun bulunduğu yana yakın
		const ol = Math.hypot(ox, oz) || 1;
		const A = fx.army.on ? fx.army.p0 : null;
		let ax = A ? A.x - c.x : ox;
		let az = A ? A.z - c.z : oz;
		const al = Math.hypot(ax, az) || 1;
		ax /= al;
		az /= al;
		const s1 = (-oz / ol) * ax + (ox / ol) * az > 0 ? 1 : -1;
		const vx = ((-oz / ol) * s1) * 0.65 + ax * 0.35;
		const vz = ((ox / ol) * s1) * 0.65 + az * 0.35;
		const yaw = Math.atan2(-vx, vz);
		cam.shot(c.x + ox * 0.75, c.z + oz * 0.75, { dist: 13, pitch: 0.42, yaw, dur: 0.55, arc: 1 });
		this._spot(c, 3.4);
		const low = tp.clone();
		low.y -= 0.6;
		const camp = A ? A.clone() : c.clone().add(new THREE.Vector3(vx * 5, 0, vz * 5));
		this.at(0.1, () => fx.arrows(camp, low, 10, 0.5, 0.35));
		this.at(0.2, () => fx.catapult(1, tp, null));
		this.at(0.32, () => fx.catapult(0, low, null));
		const base = c.clone().add(new THREE.Vector3(ox * 1.2, 0.2, oz * 1.2));
		// yıkılış (atlanırsa da olur)
		fx.after(1.02, () => {
			if (tw) tw.alive = 0;
			fx.debris(tp, app.tier.id === 0 ? 12 : 18, 3.4, 0.11, STONE, STONE2);
			fx.dust(base, 26, 1.3, 0xd5c4a2, 0.9);
			fx.ring(base.x, base.y, base.z, 0.4, 2.6, 0xe8dcc0, 0.7, 0.8, 0.25);
			fx.smokeColumn(tp, 3.2, 12);
			fx.shake(0.95);
		});
		this.at(1.45, () => fx.armyCheer(1.0));
		await this.beat(1900);
		this._hold();
		app.board.fx(i, 0, 0);
		this._day();
	}

	async defend(d, i) {
		const app = this.app;
		const b = app.board;
		b.fx(i, 0.15, 0.6);
		app.sfx?.play?.('defend');
		if (this.fast || !this.fx) {
			await this.wait(600);
			b.fx(i, 0, 0);
			return;
		}
		const fx = this.fx;
		const k = app.castles[d.i];
		const isCap = d.capital === i && k.group.visible;
		const c = isCap ? this.a.copy(k.group.position) : this._center(i, this.a, 0.15);
		const P = b.provinces[i];
		const r = isCap ? 2.9 : clamp(Math.max(P.box[2] - P.box[0], P.box[3] - P.box[1]) * 0.32, 1.6, 3);
		this._spot(c, r + 1.6);
		fx.shield(c.x, c.y - 0.1, c.z, r, d.color, 1.1);
		fx.ring(c.x, c.y + 0.1, c.z, r * 0.9, r * 1.6, d.color, 0.6, 1, 0.2);
		if (fx.army.on) {
			const f = fx.army.p2.clone();
			f.y = fx.ground(f.x, f.z) + 0.3;
			fx.sparks(f, 16, 2.6, 0xbfe0ff, 2.6, 0.06, 4);
		}
		this.at(0.3, () => fx.armyRetreat());
		const cam = app.cam;
		if (cam.shot) cam.shot(c.x, c.z, { dist: isCap ? 17 : 20, pitch: 0.7, yaw: cam.yaw, dur: 0.8, arc: 0 });
		await this.beat(1050);
		b.fx(i, 0, 0);
		this._day();
	}

	async nobody(i) {
		this.fx?.armyRetreat();
		await this.beat(500);
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
		cam.shot(c0.x, c0.z, { dist: 15, pitch: 0.5, yaw: cam.yaw, dur: 0.5, arc: 0.5 });
		// kale bir an daha görünür, sarsılarak toprağa gömülür
		k.group.visible = true;
		fx.armyFade();
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
