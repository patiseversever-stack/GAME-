// Kalite, kare hızı ve pil yönetimi.
//
// İlke: oyun sırasında hiçbir zaman shader yeniden derlenmez, render hedefi yeniden kurulmaz.
// Kademe (tier) açılışta bir kez seçilir: gölge haritası boyutu, gölge örnek sayısı, süs nesnesi yoğunluğu
// ve parçacık sınırı ondan gelir. Oyun sırasında yalnızca ekran çözünürlüğü ölçeği ve kare hızı
// sınırı değişir; bunlar takılma yaratmaz.

import { clamp } from './math.js';

export const TIERS = [
	{
		id: 0, name: 'Düşük',
		maxPixels: 1.15e6, maxDpr: 2, minScale: 0.7,
		// gölge kapsamı 1,35 kat geniş (shadow.js MARGIN: kaydırmada yeniden çizilmez): doku 1024 → 1536, netlik aynı
		shadowSize: 1536, shadowTaps: 1, shadowHalf: 60,
		props: 0.5, particles: 300,
	},
	{
		id: 1, name: 'Orta',
		maxPixels: 1.9e6, maxDpr: 2.4, minScale: 0.7,
		shadowSize: 2048, shadowTaps: 4, shadowHalf: 60,
		props: 0.8, particles: 700,
	},
	{
		id: 2, name: 'Yüksek',
		maxPixels: 3.0e6, maxDpr: 3, minScale: 0.7,
		shadowSize: 2560, shadowTaps: 4, shadowHalf: 60,
		props: 1, particles: 1200,
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
 * Kare hızı yöneticisi (v1.4: "yağ gibi").
 * - Hedef ekranın kendi yenileme hızıdır: 60 Hz ekranda 60, 90'da 90, 120'de 120 kare. rAF aralıklarından ölçülür.
 * - Kareler gecikirse önce yüksek yenilemeli ekranda yarı hıza (120 → 60) iner; 60'ta çözünürlük basamak basamak kısılır;
 *   o da yetmezse 30. Her zaman eşit aralık (bölen tam sayı): 90 Hz ekranda 60 yerine 45 (titremesiz).
 * - Ekranda hiçbir şey kıpırdamıyorsa (kamera durgun, canlandırma yok: app.active false) 30 kare: GPU ve ısı yarıya
 *   iner, telefon ısınıp kendini yavaşlatmaz. En ufak harekette (kamera, dokunuş, efekt) aynı karede tam hıza döner.
 * - Çözünürlük değişimi (çizim tamponu yeniden kurulur, bir kare takılır) yalnızca durgunken uygulanır.
 * - Pil %20'nin altına iner ve şarjda değilse pil koruma moduna geçer.
 * - Bulduğu ayarı ekran kartına göre kaydeder; bir sonraki açılış doğru ayarla başlar.
 */
export class Governor {
	constructor({ tier, gpu, store, power = 'auto', mobile = false }) {
		this.T = TIERS[tier];
		this.mobile = mobile;
		this.gpu = gpu;
		this.store = store;
		this.power = power; // 'auto' | 'saver' | 'performance'
		this.battery = { saver: false, level: 1, charging: true };

		const mem = store.get('perf') || {};
		const known = mem.gpu === gpu && mem.v === 2;
		this.scale = known ? clamp(mem.scale ?? 1, this.T.minScale, 1) : 1;
		this.cap = known ? mem.cap ?? 120 : 120; // en yüksek kare hızı (ekran izin verirse)
		this.ceil = known ? mem.ceil ?? 1 : 1; // bu cihazda denenip kaldırılamayan en yüksek ölçek

		this.vsync = 16.67;
		this._deltas = new Float32Array(30);
		this._di = 0;
		this._count = 0;
		this._lastRender = 0;
		this._ema = 0;
		this._slow = 0;
		this._good = 0;
		this._cool = 0;
		this._probe = null;
		this._ups = 0;
		this._dirty = false;
		this._pend = null; // durgunluğu bekleyen ölçek değişimi
		this.onScale = null; // çözünürlük değişince çağrılır
		this.menu = false;
		this.idle = false; // ekranda hareket yok (app._loop her karede yazar)
		this._watchBattery();
	}

	/** Ekranın yenileme hızı (Hz): ölçülen vsync aralığından, bilinen değerlere yuvarlanır. */
	get hz() {
		const f = 1000 / this.vsync;
		for (const h of [30, 48, 50, 60, 72, 75, 90, 100, 120, 144, 165]) if (Math.abs(f - h) < h * 0.06) return h;
		return Math.round(f);
	}

	get targetFps() {
		const hz = this.hz;
		if (this.menu || this.idle) return Math.min(30, hz); // durgun ekran: 30 yeter (hareket başlayınca anında tam hız)
		if (this.power === 'saver' || (this.power === 'auto' && this.battery.saver)) return Math.min(30, hz);
		return Math.min(this.cap, hz);
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
			// vsync: GPU yetişemeyince rAF aralığı uzar (kaçan kareler); ekranın gerçek hızını durgun pencerelerden
			// (çoğu vsync çizilmeden geçer) öğreniriz. Çizilen pencerede yalnız aşağı düzeltilir (daha hızlı aralık görüldüyse).
			if (this._count % 30 === 0) {
				const lq = low(this._deltas);
				const quiet = (this._wn || 0) <= 10; // pencerede 30 rAF'tan en çok 10'u çizildi
				this.vsync = quiet ? lq : Math.min(this.vsync, lq);
				this._wn = 0;
			}
		}
		const n = this._divisor();
		// ölçüm (duraklatma ekranı): son 1 sn'de çizilen kare sayısı
		if (!this._fs || now - this._fs > 1000) {
			this.fps = this._fn || 0;
			this._fn = 0;
			this._fs = now;
		}
		// zamana göre: son çizimden bu yana n vsync geçtiyse çiz (yarım vsync pay). Çağrı saymak yanlıştı: vsync'ten
		// uzun süren kare sonraki rAF'ı geciktirince bir vsync daha boşa gidiyordu (120 Hz'de 60 yerine 40 kare).
		// Hareket başladı: beklemeden çiz.
		const due = this._lastRender ? this._lastRender + (n - 0.5) * this.vsync : 0;
		if (now < due && !(this._wasIdle && !this.idle && !this.menu)) return false;
		this._wasIdle = this.idle || this.menu;
		this._wn = (this._wn || 0) + 1;
		this._fn = (this._fn || 0) + 1;
		const period = this._lastRender ? now - this._lastRender : n * this.vsync;
		this._lastRender = now;
		if (!this.idle && !this.menu) this._adapt(now, period, n * this.vsync);
		if (this._pend != null && (this.idle || now > this._pendAt)) {
			const s = this._pend;
			this._pend = null;
			this.scale = s;
			if (this.onScale) this.onScale();
		}
		return true;
	}

	/** Duraklatma ekranı için kısa özet: ekran kartı, kademe, Hz, son saniyenin kare hızı, çözünürlük ölçeği. */
	summary() {
		const g = String(this.gpu || '?').replace(/^ANGLE \(|\)$/g, '').slice(0, 42);
		return `${g} · q${this.T.id} · ${this.hz} Hz · ${this.fps ?? 0} kare · ölçek ${this.effScale.toFixed(2)}`;
	}

	/** Kaç vsync'te bir çizileceği: hep tam sayı ve yukarı yuvarlanır (eşit aralık, hedefi aşmaz). */
	_divisor() {
		return Math.max(1, Math.ceil(this.hz / this.targetFps - 0.05));
	}

	/** Sekme gizlenip geri gelince ölçümler sıfırlanır (uzun aradan sahte "yavaşlık" çıkmasın). */
	reset() {
		this._lastRender = 0;
		this._slow = 0;
		this._good = 0;
	}

	_adapt(now, period, expected) {
		if (period > expected * 4) return; // tek seferlik takılma (sekme değişimi vb.)
		this._ema = this._ema ? this._ema + (period - this._ema) * 0.08 : period;
		const dt = period / 1000;
		if (now < this._cool) return;

		const late = this._ema > expected * 1.2;
		if (late) {
			this._slow += dt;
			this._good = 0;
		} else {
			this._slow = Math.max(0, this._slow - dt * 0.5);
			this._good += dt;
		}

		// Deneme amaçlı yükseltme geri tepti: geri al ve tavanı işaretle.
		if (this._probe && late && this._slow > 1.2) {
			if (this._probe.cap) this.cap = this._probe.cap;
			else {
				this.ceil = this._probe.from;
				this._setScale(this._probe.from);
			}
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

		const hz = this.hz;
		if (this._slow > 1.5) {
			// Basamaklar: yüksek yenilemede önce yarı hız (120 → 60, keskinlik korunur); 60'ta çözünürlük biraz, sonra
			// en alta; en son 30 kare.
			this._slow = 0;
			this._cool = now + 2200;
			const s = this.effScale;
			const fps = Math.min(this.cap, hz);
			if (fps > 60) this.cap = 60;
			else if (s > 0.81) this._setScale(Math.max(0.8, s - 0.1));
			else if (s > this.T.minScale + 0.01) this._setScale(Math.max(this.T.minScale, s - 0.1));
			else if (fps > 30) this.cap = 30;
			this._dirty = true;
		} else if (this._good > 8 && this._ups < 4) {
			this._good = 0;
			const fps = Math.min(this.cap, hz);
			if (this.scale < this.maxScale - 0.01) {
				// önce keskinlik geri gelir
				this._probe = { from: this.scale, t: now };
				this._setScale(Math.min(this.maxScale, this.scale + 0.08));
				this._ups++;
				this._cool = now + 2500;
			} else if (fps < hz && this.power !== 'saver' && !this.battery.saver) {
				// rahatsa bir üst kare hızını dene (30 → 60 → ekranın hızı)
				this._probe = { cap: this.cap, t: now };
				this.cap = fps < 60 ? 60 : 120;
				this._ups++;
				this._cool = now + 3000;
			}
		}
		if (this._dirty && now > this._cool) this.save();
	}

	/** Ölçek değişimi durgun ana ertelenir (çizim tamponu yeniden kurulurken kare takılır); en geç 3 sn sonra. */
	_setScale(s) {
		this._pend = Math.round(s * 100) / 100;
		this._pendAt = (globalThis.performance?.now?.() ?? 0) + 3000;
	}

	save() {
		this._dirty = false;
		this.store.set('perf', { v: 2, gpu: this.gpu, scale: this._pend ?? this.scale, cap: this.cap, ceil: this.ceil });
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
		// telefonda piksel tavanı biraz aşağıda: 6 inçte 2,0 ile 2,6 kat çözünürlük gözle ayırt edilmez, doldurma maliyeti
		// alanla orantılı (MSAA açık: kenarlar zaten pürüzsüz)
		const cap = this.mobile ? this.T.maxPixels * (this.T.id >= 1 ? 0.8 : 1) : this.T.maxPixels;
		if (w * h * pr * pr > cap) pr = Math.sqrt(cap / (w * h));
		return Math.max(0.75, pr * this.effScale);
	}
}

/** Ekranın vsync aralığı: ölçülen rAF aralıklarının alt çeyreği (kaçan kareler ortalamayı şişirmesin). */
function low(arr) {
	const a = Array.from(arr).filter((x) => x > 0).sort((x, y) => x - y);
	return a.length ? a[a.length >> 2] : 16.67;
}
