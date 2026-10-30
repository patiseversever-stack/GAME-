// Haritada ekrandaki boyuna göre ayrıntı (LOD): bir yapı ekranda büyüyünce (saldırı, fetih, düello inişleri,
// kullanıcının yakınlaştırması) yüksek ayrıntılı kahraman maketi kendiliğinden gelir; küçülünce bırakılır.
//
// Neden takas (ve neden hep durmuyorlar): 42 kahramanın q0 toplamı ~570 bin üçgen; haritanın tamamı ~156 bin.
// Hepsi hep dursa (ya da sadeleştirilip dursa) Mali-G52 bütçesi (~150–180 bin) katlanır. Uzaktaki birleşik yalın
// maket tek çizim çağrısı ve ~40 bin üçgen; yakında yalnız ekranı dolduran 1–3 yapı kahraman olur.
//
// Geçiş hissedilmesin:
//   * tamamlayıcı titreşim: kahraman ekran eşiğinin f payında, yalın kopya (1 − f) payında çizilir (aynı eşik
//     dokusu, heroes.js uFade ve landmarks.js vLod): her piksel tam bir kez örtülür, saydamlık ve sıralama yok;
//     f ~0,35 sn'de (kamera dururken ~0,7 sn) 0 → 1.
//   * histerezis: giriş eşiği (ekran boyunun %14'ü) çıkıştan (%10) büyük; sınırda gidip gelme yok.
//   * kurulum boşta ~10 ms dilimlerle (heroes.js), kare donmaz; kamera bir yere yönelince (shot) varış kadrajında
//     büyük görünecek yapı önceden kurulur (önbelleğe; gösterilmez).
//   * gölge: kahraman yarıdan çok gelince gölgeyi o verir, yalın kopyanınki çekilir.
//   * taban: kahraman kendi avlusunu çizmez (uLodMode), yalın kopyanın avlusu kalır: yapı aynı zemine oturur.
//   * uzak = yalın birleşik maket (impostor yok: 42 yapı × açı × renk/normal dokusu telefon belleğini aşar).
// Kademe: aynı anda en çok [1, 2, 3] kahraman (q0/q1/q2); kare süresi 3 sn boyunca 1/26 sn.yi aşarsa bir azalır,
// uzun süre rahatsa geri artar (telefonun gerçek gücüne göre). Kuşbakışı kendi kahramanını açınca (uHide) bu
// yuvalar çekilir. Kare başına iş: yalnız 1–3 yuvanın geçiş değeri; seçim 0,2 sn'de bir (nesne yok).

import * as THREE from 'three';
import { Heroes } from './heroes.js';

const ENTER = 0.14; // yapı yarıçapı / ekran yüksekliği: kahraman gelir
const EXIT = 0.1; // bunun altına inince bırakılır
const STEP = 0.2; // seçim aralığı (sn)
const FADE_MOVE = 0.35; // geçiş süresi, kamera hareket ederken (sn)
const FADE_STILL = 0.7; // kamera dururken (daha yavaş: göze batmasın)

const _p = new THREE.Vector3();
const _last = new THREE.Vector3();

export class HeroLod {
	constructor(lm, G, tier, board, builders) {
		this.lm = lm;
		this.G = G;
		this.tier = tier;
		this.max = [1, 2, 3][tier.id] ?? 1;
		this.limit = this.max;
		this.enabled = true;
		const shared = { cache: lm.heroes.cache, max: this.max + 2, used: (kind) => this._used(kind) };
		// birincil kahraman (Kuşbakışı) da aynı önbelleği kullanır
		lm.heroes.shared = shared;
		this.slots = [];
		for (let i = 0; i < 3; i++) {
			const h = new Heroes(G, tier, board, lm, builders, shared);
			h.uFade.value = 0;
			h.uLodMode.value = 1;
			lm.mesh.add(h.mesh);
			lm.caster.add(h.caster);
			this.slots.push({ h, site: null, fade: 0, want: 0 });
		}
		// ön ısıtma: varış kadrajındaki yapıyı önbelleğe kuran görünmez yuva
		this.warmer = new Heroes(G, tier, board, lm, builders, shared);
		this.size = new Float32Array(lm.sites.length);
		this.t = 0;
		this.moving = false;
		this.slow = 0;
		this.easy = 0;
		this.ema = 1 / 60;
		this.stats = { shown: 0, built: 0 };
	}

	_used(kind) {
		if (this.lm.heroes.active?.kind === kind) return true;
		for (const s of this.slots) if (s.site && s.site.kind === kind) return true;
		return false;
	}

	/** Kare başına: geçişler; STEP'te bir: hangi yapılar kahraman olsun. camera: THREE kamera, cam: kamera denetçisi. */
	update(dt, camera, cam) {
		if (!camera) return;
		// kare süresi: telefon zorlanıyorsa aynı anda daha az kahraman
		this.ema += (dt - this.ema) * 0.05;
		if (this.ema > 1 / 26) {
			this.slow += dt;
			this.easy = 0;
		} else if (this.ema < 1 / 45) {
			this.easy += dt;
			this.slow = 0;
		}
		if (this.slow > 3 && this.limit > 0) {
			this.limit--;
			this.slow = 0;
		} else if (this.easy > 12 && this.limit < this.max) {
			this.limit++;
			this.easy = 0;
		}
		this.t += dt;
		if (this.t >= STEP) {
			this.moving = _last.distanceToSquared(camera.position) > 1e-4 * (1 + cam.dist * cam.dist) * 0.01;
			_last.copy(camera.position);
			this._select(camera, cam, this.t);
			this.t = 0;
		}
		const U = this.lm.uLod;
		for (let i = 0; i < this.slots.length; i++) {
			const s = this.slots[i];
			if (!s.site) {
				U[i].w = 0;
				continue;
			}
			const ready = s.h.active === s.site;
			const to = ready ? s.want : 0;
			const sp = dt / (this.moving ? FADE_MOVE : FADE_STILL);
			s.fade = to > s.fade ? Math.min(to, s.fade + sp) : Math.max(to, s.fade - sp);
			s.h.uFade.value = s.fade;
			s.h.caster.visible = ready && s.fade > 0.5;
			U[i].set(s.site.x, s.site.z, s.fade, 1);
			if (s.fade <= 0 && !s.want) {
				s.h.hide();
				s.site = null;
				U[i].w = 0;
			}
		}
	}

	/** Ekran boyları ve seçim (histerezis), ön ısıtma. */
	_select(camera, cam) {
		const lm = this.lm;
		const sites = lm.sites;
		const off = !this.enabled || lm.uHide.value.w > 0.5 || lm.uFade.value.y < 0.5 || !lm.mesh.visible;
		camera.updateMatrixWorld();
		const m = camera.matrixWorldInverse;
		const e = camera.projectionMatrix.elements;
		const castles = lm.castleU || [];
		for (let i = 0; i < sites.length; i++) {
			const s = sites[i];
			let size = 0;
			if (!off) {
				_p.set(s.x, s.y + s.r * 0.4, s.z).applyMatrix4(m);
				const d = -_p.z;
				if (d > 0.3) {
					const sx = (e[0] * _p.x) / d;
					const sy = (e[5] * _p.y + e[9] * _p.z) / -_p.z;
					const rr = (s.r * e[5]) / d;
					// ekranın ortasındaki yapı önce (kenardaki komşu aynı boyda olsa da)
					if (Math.abs(sx) < 1 + rr && Math.abs(sy) < 1 + rr) size = (rr / 2) / (1 + 0.6 * Math.hypot(sx, sy));
				}
				// başkent kalesinin altına gömülü yapı kahraman olmaz
				for (const c of castles) if (c.w > 0.5 && Math.hypot(c.x - s.x, c.z - s.z) < 2.2 + (s.s || 2) * 0.38 + 0.06) size = 0;
			}
			this.size[i] = size;
		}
		// istenenler: en büyük `limit` yapı (yeni giriş ENTER, kalan EXIT eşiği)
		for (const s of this.slots) s.want = 0;
		let n = 0;
		for (let k = 0; k < this.limit; k++) {
			let best = -1;
			let bs = 0;
			for (let i = 0; i < sites.length; i++) {
				const s = sites[i];
				if (!lm.heroes.has(s.kind)) continue;
				const held = this.slots.find((x) => x.site === s);
				if (held && held.want) continue;
				const need = held ? EXIT : ENTER;
				if (this.size[i] >= need && this.size[i] > bs) {
					bs = this.size[i];
					best = i;
				}
			}
			if (best < 0) break;
			const s = sites[best];
			let slot = this.slots.find((x) => x.site === s);
			if (!slot) slot = this.slots.find((x) => !x.site) || this.slots.find((x) => !x.want && x.fade <= 0.001);
			if (!slot) break;
			if (slot.site !== s) {
				// yuvaya yeni yapı: önbellekteyse hemen, değilse dilimli kurulum (aynı anda tek kurulum)
				const cached = slot.h.cache.has(s.kind);
				if (!cached && this.slots.some((x) => x.h.busy)) continue;
				if (slot.site) slot.h.hide();
				slot.site = s;
				slot.fade = 0;
				slot.h.uFade.value = 0;
				slot.h.request(s, () => this.stats.built++);
				this.stats.shown++;
			}
			slot.want = 1;
			n++;
		}
		// ön ısıtma: kamera bir kadraja yöneliyorsa varışta büyük görünecek yapı önbelleğe
		if (!off && cam.mode === 'shot' && !this.warmer.busy && !this.slots.some((x) => x.h.busy)) {
			const g = cam.goal;
			const dist = Math.max(1, cam.distTo);
			for (let i = 0; i < sites.length; i++) {
				const s = sites[i];
				if (!lm.heroes.has(s.kind) || this.warmer.cache.has(s.kind)) continue;
				if (Math.hypot(s.x - g.x, s.z - g.z) > dist * 0.35) continue;
				if ((s.r * e[5]) / dist / 2 < ENTER * 0.85) continue;
				this.warmer.request(s, null, false, false);
				break;
			}
		}
		return n;
	}
}
