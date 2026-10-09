// Kalite, kare hızı ve pil yönetimi.
//
// İlke: oyun sırasında hiçbir zaman shader yeniden derlenmez, render hedefi yeniden kurulmaz.
// Kademe (tier) açılışta bir kez seçilir; oyun sırasında yalnızca çözünürlük ölçeği,
// parçacık sayısı ve kare hızı sınırı değişir. Bunlar takılma yaratmaz.

import { clamp } from './math.js';

export const TIERS = [
	{
		id: 0, name: 'Düşük',
		maxPixels: 1.15e6, maxDpr: 2, minScale: 0.62,
		shadowSize: 1024, shadowTaps: 1,
		particles: 150, leafDensity: 0.62, clouds: 7, birds: 8, shafts: 3,
	},
	{
		id: 1, name: 'Orta',
		maxPixels: 1.9e6, maxDpr: 2.4, minScale: 0.62,
		shadowSize: 2048, shadowTaps: 4,
		particles: 340, leafDensity: 0.85, clouds: 11, birds: 18, shafts: 5,
	},
	{
		id: 2, name: 'Yüksek',
		maxPixels: 3.0e6, maxDpr: 3, minScale: 0.62,
		shadowSize: 2048, shadowTaps: 4,
		particles: 640, leafDensity: 1, clouds: 16, birds: 30, shafts: 6,
	},
];

/**
 * Ekran kartını adından tanır. Realme / Oppo / Xiaomi'de yaygın kartlar (Mali-G52/G57/G68,
 * Adreno 610-619, PowerVR GE8xxx) özellikle listelidir. Bilinmeyen mobil kart düşükten başlar;
 * yönetici yeterli güç görürse bir sonraki açılışta kademeyi yükseltir.
 */
export function detectTier(gl) {
	let gpu = '';
	try {
		const ext = gl.getExtension('WEBGL_debug_renderer_info');
		gpu = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || '');
	} catch (e) {
		gpu = '';
	}
	const g = gpu.toLowerCase();
	const mobile = matchMedia('(pointer: coarse)').matches || /android|iphone|ipad/i.test(navigator.userAgent);
	let tier = mobile ? 0 : 1;

	if (/swiftshader|llvmpipe|software|microsoft basic/.test(g)) tier = 0;
	else if (/mali-[234]\d\d|mali-t\d|mali-g(31|51|52|57)\b|powervr|ge8\d{3}|sgx|img bxm|adreno \(tm\) ([2-5]\d\d|60\d|61[0-6])\b/.test(g)) tier = 0;
	else if (/mali-g(68|71|72|76|610|615)\b|adreno \(tm\) (61[7-9]|62\d|63\d|64\d)\b/.test(g)) tier = 1;
	else if (/mali-g(77|78|710|715|720|725|620|625|9\d\d)\b|immortalis|xclipse|adreno \(tm\) (6[5-9]\d|7\d\d|8\d\d)\b/.test(g)) tier = 2;
	else if (/apple/.test(g)) tier = mobile ? 2 : 2;
	else if (!mobile && /nvidia|geforce|radeon|rtx|gtx|\barc\b/.test(g)) tier = 2;
	else if (!mobile && /intel/.test(g)) tier = 1;

	const mem = navigator.deviceMemory || 0;
	if (mem && mem <= 2) tier = 0;
	else if (mem && mem <= 4) tier = Math.min(tier, 1);
	return { tier, gpu, mobile };
}

/**
 * Kare hızı yöneticisi.
 * - Ekran yenileme hızını ölçer (60/90/120 Hz) ve kareleri eşit aralıkla çizer:
 *   120 Hz ekranda 60 kare, gerektiğinde 30 kare. Boşa kare çizilmez, telefon ısınmaz.
 * - Kareler gecikirse önce çözünürlüğü kısar; o da yetmezse sabit 30 kareye geçer.
 * - Pil %20'nin altına iner ve şarjda değilse pil koruma moduna geçer.
 * - Bulduğu ayarı ekran kartına göre kaydeder; bir sonraki açılış doğru ayarla başlar.
 */
export class Governor {
	constructor({ tier, gpu, store, power = 'auto' }) {
		this.T = TIERS[tier];
		this.gpu = gpu;
		this.store = store;
		this.power = power; // 'auto' | 'saver' | 'performance'
		this.battery = { saver: false, level: 1, charging: true };

		const mem = store.get('perf') || {};
		const known = mem.gpu === gpu;
		this.scale = known ? clamp(mem.scale ?? 1, this.T.minScale, 1) : 1;
		this.cap = known && mem.cap === 30 ? 30 : 60;
		this.ceil = known ? mem.ceil ?? 1 : 1; // bu cihazda denenip kaldırılamayan en yüksek ölçek
		this.half = known ? !!mem.half : tier === 0;

		this.vsync = 16.67;
		this._deltas = new Float32Array(24);
		this._di = 0;
		this._count = 0;
		this._frame = 0;
		this._lastRender = 0;
		this._ema = 0;
		this._slow = 0;
		this._good = 0;
		this._cool = 0;
		this._probe = null;
		this._ups = 0;
		this._dirty = false;
		this.onScale = null; // çözünürlük değişince çağrılır
		this.menu = false;
		this._watchBattery();
	}

	get targetFps() {
		if (this.menu) return 30; // menüler ve başlık ekranı: 30 kare yeter
		if (this.power === 'saver' || (this.power === 'auto' && this.battery.saver)) return 30;
		return this.cap;
	}

	get maxScale() {
		if (this.power === 'saver' || (this.power === 'auto' && this.battery.saver)) return Math.min(this.ceil, 0.8);
		return this.ceil;
	}

	get effScale() {
		return Math.min(this.scale, this.maxScale);
	}

	/** Her requestAnimationFrame çağrısında: bu vsync'te çizilmeli mi? */
	tick(now, rafDelta) {
		if (rafDelta > 4 && rafDelta < 40) {
			this._deltas[this._di] = rafDelta;
			this._di = (this._di + 1) % this._deltas.length;
			this._count++;
			if (this._count % 24 === 0) this.vsync = median(this._deltas);
		}
		const interval = 1000 / this.targetFps;
		const n = this._divisor(interval);
		this._frame++;
		if (this._frame < n) return false;
		this._frame = 0;
		const period = this._lastRender ? now - this._lastRender : interval;
		this._lastRender = now;
		this._adapt(now, period, n * this.vsync);
		return true;
	}

	/**
	 * Kaç vsync'te bir çizileceği. 90 Hz ekranda 60 kare eşit dağıtılamaz: güçlü cihaz 90,
	 * zayıf cihaz eşit aralıklı 45 çizer (titreşimli 60'tan daha akıcı görünür).
	 */
	_divisor(interval) {
		const r = interval / this.vsync;
		return Math.max(1, this.half ? Math.ceil(r - 0.05) : Math.round(r - 0.15));
	}

	/** Sekme gizlenip geri gelince ölçümler sıfırlanır (uzun aradan sahte "yavaşlık" çıkmasın). */
	reset() {
		this._lastRender = 0;
		this._frame = 0;
		this._slow = 0;
		this._good = 0;
	}

	_adapt(now, period, expected) {
		if (period > expected * 4) return; // tek seferlik takılma (sekme değişimi vb.)
		this._ema = this._ema ? this._ema + (period - this._ema) * 0.08 : period;
		const dt = period / 1000;
		if (now < this._cool) return;

		const late = this._ema > expected * 1.22;
		if (late) {
			this._slow += dt;
			this._good = 0;
		} else {
			this._slow = Math.max(0, this._slow - dt * 0.5);
			this._good += dt;
		}

		// Deneme amaçlı yükseltme geri tepti: geri al ve tavanı işaretle.
		if (this._probe && late && this._slow > 1.2) {
			this.ceil = this._probe.from;
			this._setScale(this._probe.from);
			this._probe = null;
			this._cool = now + 4000;
			this._slow = 0;
			this._dirty = true;
			return;
		}
		if (this._probe && now - this._probe.t > 6000) {
			this._probe = null;
			this._dirty = true;
		}

		if (this._slow > 1.6) {
			// Basamaklar: önce çözünürlük biraz, sonra yüksek yenilemeli ekranda yarı hız,
			// sonra çözünürlük en alta, en son sabit 30 kare.
			this._slow = 0;
			this._cool = now + 2200;
			const s = this.effScale;
			if (s > 0.81) this._setScale(Math.max(0.8, s - 0.1));
			else if (!this.half && this.vsync < 14) this.half = true;
			else if (s > this.T.minScale + 0.01) this._setScale(Math.max(this.T.minScale, s - 0.1));
			else if (this.cap === 60) this.cap = 30;
			this._dirty = true;
		} else if (this._good > 9 && this._ups < 3) {
			this._good = 0;
			if (this.cap === 30 && this.power !== 'saver' && !this.battery.saver && this.effScale >= 0.8) {
				// 30'da rahatsa 60'ı bir kez dene
				this.cap = 60;
				this._ups++;
				this._cool = now + 3000;
			} else if (this.scale < this.maxScale - 0.01) {
				this._probe = { from: this.scale, t: now };
				this._setScale(Math.min(this.maxScale, this.scale + 0.08));
				this._ups++;
				this._cool = now + 2500;
			}
		}
		if (this._dirty && now > this._cool) this.save();
	}

	_setScale(s) {
		this.scale = Math.round(s * 100) / 100;
		if (this.onScale) this.onScale();
	}

	save() {
		this._dirty = false;
		this.store.set('perf', { gpu: this.gpu, scale: this.scale, cap: this.cap, ceil: this.ceil, half: this.half });
	}

	_watchBattery() {
		if (!navigator.getBattery) return;
		navigator
			.getBattery()
			.then((b) => {
				const upd = () => {
					this.battery.level = b.level;
					this.battery.charging = b.charging;
					// Yükselen/alçalan eşik farkı: %20'de girer, %25'te çıkar (sürekli gidip gelmesin).
					const was = this.battery.saver;
					this.battery.saver = !b.charging && (was ? b.level <= 0.25 : b.level <= 0.2);
					if (was !== this.battery.saver && this.onBattery) this.onBattery(this.battery.saver);
				};
				upd();
				b.addEventListener('levelchange', upd);
				b.addEventListener('chargingchange', upd);
			})
			.catch(() => {});
	}

	/** Çizim çözünürlüğü (cihaz pikseli / CSS pikseli). */
	pixelRatio(w, h) {
		let pr = Math.min(window.devicePixelRatio || 1, this.T.maxDpr);
		if (w * h * pr * pr > this.T.maxPixels) pr = Math.sqrt(this.T.maxPixels / (w * h));
		return Math.max(0.75, pr * this.effScale);
	}
}

function median(arr) {
	const a = Array.from(arr).filter((x) => x > 0).sort((x, y) => x - y);
	return a.length ? a[a.length >> 1] : 16.67;
}
