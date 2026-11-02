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
 * Ekran kartını adından tanır. Realme / Oppo / Xiaomi / Samsung'da yaygın kartlar (Mali-G52/G57/G68/G71/G72,
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
	else if (/mali-[234]\d\d|mali-t\d|mali-g(31|51|52|57|71|72)\b|powervr|ge8\d{3}|sgx|img bxm|adreno \(tm\) ([2-5]\d\d|60\d|61[0-6])\b/.test(g)) tier = 0;
	else if (/mali-g(68|76|610|615)\b|adreno \(tm\) (61[7-9]|62\d|63\d|64\d)\b/.test(g)) tier = 1;
	else if (/mali-g(77|78|710|715|720|725|620|625|9\d\d)\b|immortalis|xclipse|adreno \(tm\) (6[5-9]\d|7\d\d|8\d\d)\b/.test(g)) tier = 2;
	else if (/apple/.test(g)) {
		// iPhone/iPad: Safari kartın adını yalnız "Apple GPU" verir, belleği hiç vermez (deviceMemory yok): iPhone 7 de
		// iPhone 15 de aynı görünür. Eskiden hepsi Yüksek başlıyordu (2 GB'lık eski telefonda ağır). Küçük ekranlı
		// modeller (6s/7/8/SE: kısa kenar ≤ 375, uzun ≤ 667) Düşük, ötekiler Orta başlar; yönetici gücü görünce bir
		// sonraki açılışta yükseltir (launchTier). Mac (dokunmatik değil) Yüksek.
		const W = Math.min(screen.width, screen.height);
		const H = Math.max(screen.width, screen.height);
		tier = !mobile ? 2 : W <= 375 && H <= 667 ? 0 : 1;
	}
	else if (!mobile && /nvidia|geforce|radeon|rtx|gtx|\barc\b/.test(g)) tier = 2;
	else if (!mobile && /intel/.test(g)) tier = 1;

	const mem = navigator.deviceMemory || 0;
	if (mem && mem <= 2) tier = 0;
	else if (mem && mem <= 4) tier = Math.min(tier, 1);
	return { tier, gpu, mobile };
}

/** Ölçek tavanı: piksel bütçesinin üstüne en çok bu kat (cihaz kanıtlarsa; ekranın kendi çözünürlüğünü aşmaz). */
export const HI = 1.35;

/**
 * Açılışta kullanılacak kademe: ekran kartından tanınan kademe + bu cihazda ölçülerek bulunan düzeltme
 * (yönetici önceki oturumlarda yükseltti ya da düşürdü). Kademe oyun sırasında değişmez (shader ve geometri ona göre
 * kurulur): düzeltme bir sonraki açılışta uygulanır.
 */
export function launchTier(detected, store, gpu) {
	const m = store?.get?.('perf');
	if (!m || m.v !== 3 || m.gpu !== gpu) return detected;
	return clamp(detected + (m.adj | 0), 0, Math.max(0, Math.min(2, m.top ?? 2)));
}

/**
 * Kare hızı ve kalite yöneticisi (v1.5: "cihaz neyse onun en iyisi").
 * - Hedef ekranın kendi yenileme hızıdır: 60 Hz ekranda 60, 90'da 90, 120'de 120 kare. rAF aralıklarından ölçülür.
 * - Kareler gecikirse sırayla: süper örnekleme (ölçek > 1) bırakılır → yüksek yenilemede yarı hız (120 → 60) →
 *   çözünürlük basamak basamak → 30 kare. Her zaman eşit aralık (bölen tam sayı): 90 Hz ekranda 60 yerine 45.
 *   İşlemci darboğazında (kare JS süresi bütçeyi yiyor) çözünürlük boşuna kısılmaz, doğrudan kare sınırı iner.
 * - Rahatsa sırayla geri alır: önce akıcılık (kare sınırı), sonra keskinlik; ekran hızını tutuyorsa ölçek 1'in üstüne
 *   (piksel bütçesinin üstüne, ekranın kendi çözünürlüğüne kadar) çıkar. Tutmayan deneme geri alınır ve bir süre
 *   (her başarısızlıkta iki katı) tekrar denenmez: gidip gelme yok, ısınıp yavaşlayan telefon sonradan toparlanır.
 * - Kademe (gölge, ağaç yoğunluğu, geometri): ekran hızını süper örneklemede ya da GPU süresi bütçenin yarısının altında
 *   uzun süre tutan cihaz bir sonraki açılışta bir üst kademeyle başlar; en düşük çözünürlükte bile tutamayan bir alt
 *   kademeyle (ve o kademe bir daha denenmez). launchTier.
 * - Durgunken de tam hız (su, bulut, sürüler hep oynar; 30 karede takılıyor gibi görünüyordu). Durgun karelerde yalnız
 *   aşağı yönlü uyum yapılır (yetişemezse iner); yükseltme kanıtı yalnız hareketli karelerden toplanır.
 * - 30 kare son çaredir: önce çözünürlük bir basamak daha iner (0,6), sonra ekranın bir alt eşit böleni (120 Hz'de 40,
 *   90 Hz'de 45); 30'a yalnız 60 Hz ekranda hiçbir şey yetmezse inilir.
 * - Çözünürlük değişimi (çizim tamponu yeniden kurulur, bir kare takılır) yalnızca durgunken uygulanır.
 * - Pil %20'nin altına iner ve şarjda değilse pil koruma moduna geçer (en çok 60 kare, keskinlik 0,8).
 * - Bulduğunu ekran kartı ve kademe başına kaydeder; bir sonraki açılış doğru ayarla başlar.
 */
export class Governor {
	constructor({ tier, gpu, store, power = 'auto', mobile = false, base = tier, fixed = false }) {
		this.T = TIERS[tier];
		this.base = base; // ekran kartından tanınan kademe (düzeltmesiz)
		this.mobile = mobile;
		this.gpu = gpu;
		this.store = store;
		this.power = power; // 'auto' | 'saver' | 'performance'
		this.battery = { saver: false, level: 1, charging: true };

		const mem = store.get('perf') || {};
		let q = null;
		if (mem.gpu === gpu && mem.v === 3) q = mem.q?.[tier] || null;
		else if (mem.gpu === gpu && mem.v === 2) q = { scale: mem.scale, cap: mem.cap };
		this.adj = mem.gpu === gpu && mem.v === 3 ? mem.adj | 0 : 0;
		this.top = mem.gpu === gpu && mem.v === 3 ? mem.top ?? 2 : 2; // tutmadığı görülen kademenin bir altı
		this._q = mem.gpu === gpu && mem.v === 3 ? { ...mem.q } : {};
		this.scale = q ? clamp(q.scale ?? 1, Math.max(0.6, this.T.minScale - 0.1), HI) : 1;
		this.cap = q ? q.cap ?? 120 : 120; // en yüksek kare hızı (ekran izin verirse)
		this.hi = 1; // ölçeğin üst sınırı: pixelRatio() ekranın kendi çözünürlüğünden hesaplar

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
		this._back = { cap: 0, scale: 0 }; // bu ana kadar o tür yükseltme denenmez
		this._backMs = { cap: 20000, scale: 15000 };
		this._upT = 0; // kademe yükseltme kanıtı (sn)
		this._tierSet = fixed; // kademeyi oyuncu seçtiyse kendiliğinden değişmez
		this._dnT = 0; // kademe düşürme kanıtı (sn)
		this.cpuMs = 0; // kare başına JS süresi (app ölçer)
		this.gpuMs = 0; // GPU süresi (zaman sorgusu varsa; yoksa 0)
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

	get saver() {
		return this.power === 'saver' || (this.power === 'auto' && this.battery.saver);
	}

	get targetFps() {
		const hz = this.hz;
		// durgunken de tam hız (eskiden 30): soru, menü ve beklemede su, bulut, sürüler, balonlar hep oynuyor; 30 karede
		// takılıyor gibi görünüyordu. Cihaz neyi tutuyorsa (kare sınırı hareketli karelerden öğrenilir) onda kalır.
		// Pil koruma (pil %20 altı, şarjda değil): 60 (120 Hz ekranda yarı enerji, yine akıcı)
		if (this.saver) return Math.min(60, this.cap, hz);
		return Math.min(this.cap, hz);
	}

	/** Bir alt eşit aralıklı kare hızı (ekran hızının tam böleni): 120 Hz'de 60 → 40 → 30, 90'da 45 → 30, 60'ta 30. */
	_lowerCap(fps) {
		const hz = this.hz;
		for (let k = 2; k < 8; k++) {
			const r = hz / k;
			if (r < fps - 0.5) return Math.max(30, Math.round(r));
		}
		return 30;
	}

	/** Son çare çözünürlük tabanı (kare sınırını 30'a indirmeden önce bir basamak daha). */
	get deepScale() {
		return Math.max(0.6, this.T.minScale - 0.1);
	}

	get maxScale() {
		if (this.saver) return Math.min(0.8, this.hi);
		// ekran hızını tutamayan cihazda süper örnekleme yok (önce akıcılık)
		return Math.min(this.cap, this.hz) >= this.hz ? this.hi : 1;
	}

	get effScale() {
		return Math.min(this.scale, Math.max(this.maxScale, this.T.minScale));
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
		this._adapt(now, period, n * this.vsync, this.idle || this.menu);
		if (this._pend != null && (this.idle || now > this._pendAt)) {
			const s = this._pend;
			this._pend = null;
			this.scale = s;
			if (this._probe && this._probe.from != null) this._probe.t = now; // deneme, ölçek uygulandığı andan sayılır
			if (this.onScale) this.onScale();
		}
		return true;
	}

	/** Duraklatma ekranı için kısa özet: ekran kartı, kademe, Hz, son saniyenin kare hızı, çözünürlük ölçeği. */
	summary() {
		const g = String(this.gpu || '?').replace(/^ANGLE \(|\)$/g, '').slice(0, 42);
		const t = this.T.id !== this.base ? `q${this.base}→${this.T.id}` : `q${this.T.id}`;
		const nx = this.adj + this.base !== this.T.id ? ` (sonraki q${clamp(this.base + this.adj, 0, 2)})` : '';
		return `${g} · ${t}${nx} · ${this.hz} Hz · ${this.fps ?? 0} kare · ölçek ${this.effScale.toFixed(2)}${this.gpuMs ? ` · gpu ${this.gpuMs.toFixed(1)} ms` : ''}`;
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

	_adapt(now, period, expected, still = false) {
		if (period > expected * 4) return; // tek seferlik takılma (sekme değişimi vb.)
		this._ema = this._ema ? this._ema + (period - this._ema) * 0.08 : period;
		const dt = period / 1000;
		const late = this._ema > expected * 1.2;
		// durgun kareler hafiftir (gölge önbellekte): yükseltme ve kademe kanıtı yalnız hareketten; yetişemezse iner
		if (!still) this._tierEvidence(dt, late, expected);
		if (now < this._cool) return;

		if (late) {
			// ağır yük (bütçenin 1,6 katı): iki kat çabuk tepki
			this._slow += this._ema > expected * 1.6 ? dt * 2 : dt;
			this._good = 0;
		} else {
			this._slow = Math.max(0, this._slow - dt * 0.5);
			if (!still) this._good += dt;
		}

		// Deneme amaçlı yükseltme geri tepti: geri al, tavanı işaretle, bir süre o tür deneme yok.
		if (this._probe && late && this._slow > 1.2) {
			const k = this._probe.cap != null ? 'cap' : 'scale';
			if (k === 'cap') this.cap = this._probe.cap;
			else this._setScale(this._probe.from);
			this._back[k] = now + this._backMs[k];
			this._backMs[k] = Math.min(240000, this._backMs[k] * 2);
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
			this._slow = 0;
			this._cool = now + 2200;
			const s = this.effScale;
			const fps = Math.min(this.cap, hz);
			// işlemci darboğazı: çizim süresinin çoğu JS; çözünürlük kısmak işe yaramaz, keskinlik korunur
			const cpu = this.cpuMs > expected * 0.7;
			// sıra: süper örnekleme → 60 kare (yüksek Hz ekranda) → çözünürlük adım adım → son çare taban → bir alt eşit
			// aralıklı kare hızı (120 Hz'de 40, 90'da 45; 30 yalnız 60 Hz ekranda ve hiçbir şey yetmezse)
			if (s > 1.01) this._setScale(1);
			else if (fps > 60) this.cap = 60;
			else if (!cpu && s > 0.81) this._setScale(Math.max(0.8, s - 0.1));
			else if (!cpu && s > this.T.minScale + 0.01) this._setScale(Math.max(this.T.minScale, s - 0.1));
			else if (!cpu && s > this.deepScale + 0.01) this._setScale(this.deepScale);
			else if (fps > 30) this.cap = this._lowerCap(fps);
			this._dirty = true;
		} else if (this._good > 8 && this._ups < 40) {
			this._good = 0;
			const fps = Math.min(this.cap, hz);
			if (fps < hz && !this.saver && now >= this._back.cap) {
				// önce akıcılık: bir üst kare hızı (30 → 60 → ekranın hızı)
				this._probe = { cap: this.cap, t: now };
				this.cap = fps < 60 ? 60 : 120;
				if (this.scale > 1) this._setScale(1); // süper örneklemeyle yeni kare hızı denenmez
				this._ups++;
				this._cool = now + 3000;
			} else if (this.scale < this.maxScale - 0.01 && now >= this._back.scale) {
				// sonra keskinlik: 1'in altındaysa geri gelir, ekran hızını tutuyorsa 1'in üstüne (ekranın çözünürlüğüne)
				this._probe = { from: this.scale, t: now };
				this._setScale(Math.min(this.maxScale, this.scale + (this.scale < 1 ? 0.08 : 0.12)));
				this._ups++;
				this._cool = now + 2500;
			}
		}
		if (this._dirty && now > this._cool) this.save();
	}

	/**
	 * Kademe kanıtı (yalnız hareketli karelerde): ekranın hızını süper örneklemede (ölçek ≥ 1,1 ve tavanında) ya da (masaüstünde) GPU
	 * süresi bütçenin %42'sinin altındayken toplam 20 sn tutan cihaz bir sonraki açılışta bir üst kademe; en düşük
	 * çözünürlükte bile 60 (ya da hedef) tutamayan cihaz 15 sn sonra bir alt kademe.
	 */
	_tierEvidence(dt, late, expected) {
		if (this.saver || this._tierSet) return;
		const hz = this.hz;
		const full = Math.min(this.cap, hz) >= hz && !late;
		const s = this.effScale;
		const ss = this.hi > 1.1 && s >= this.hi - 0.01;
		// GPU saati yalnız masaüstünde: döşemeli mobil kartlarda (Mali, Adreno, PowerVR) iş sunuma ertelenir, ölçüm eksik çıkar
		const gpu = !this.mobile && this.gpuMs > 0 && s >= 0.99 && this.gpuMs < expected * 0.42 && this.cpuMs < expected * 0.5;
		// daha önce tutmadığı görülen kademeye de dönülebilir (ısınma, pil tasarrufu, arka plan yükü geçicidir), ama
		// kanıt üç kat uzun istenir (60 sn): bir kez kötü gün yaşayan cihaz sonsuza dek düşük kademede kalmasın
		if (full && (ss || gpu) && this.T.id < 2) this._upT += this.T.id < this.top ? dt : dt / 3;
		else if (late) this._upT = Math.max(0, this._upT - dt * 2);
		const floor = s <= this.deepScale + 0.01;
		if (floor && (late || this.cap <= 30) && this.T.id > 0) this._dnT += dt;
		else this._dnT = Math.max(0, this._dnT - dt * 0.25);
		if (this._upT > 20) {
			this.adj = this.T.id + 1 - this.base;
			this.top = Math.max(this.top, this.T.id + 1);
			this._tierSet = true;
			this._dirty = true;
		} else if (this._dnT > 15) {
			this.adj = this.T.id - 1 - this.base;
			this.top = Math.min(this.top, this.T.id - 1);
			this._tierSet = true;
			this._dirty = true;
		}
	}

	/** Ölçek değişimi durgun ana ertelenir (çizim tamponu yeniden kurulurken kare takılır); en geç 3 sn sonra. */
	_setScale(s) {
		this._pend = Math.round(s * 100) / 100;
		this._pendAt = (globalThis.performance?.now?.() ?? 0) + 3000;
	}

	save() {
		this._dirty = false;
		this._q[this.T.id] = { scale: this._pend ?? this.scale, cap: this.cap };
		this.store.set('perf', { v: 3, gpu: this.gpu, adj: this.adj, top: this.top, q: this._q });
	}

	_watchBattery() {
		if (typeof navigator === 'undefined' || !navigator.getBattery) return;
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

	/**
	 * Çizim çözünürlüğü (cihaz pikseli / CSS pikseli). Kademenin piksel bütçesi × ölçek; ölçek 1'in üstüne yalnız ekranın
	 * kendi çözünürlüğüne kadar çıkabilir (hi).
	 */
	pixelRatio(w, h) {
		const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
		let pr = Math.min(dpr, this.T.maxDpr);
		// telefonda piksel tavanı biraz aşağıda: 6 inçte 2,0 ile 2,6 kat çözünürlük gözle ayırt edilmez, doldurma maliyeti
		// alanla orantılı (MSAA açık: kenarlar zaten pürüzsüz). Cihaz kanıtlarsa ölçek > 1 ile tavanın üstüne çıkar.
		const cap = this.mobile ? this.T.maxPixels * (this.T.id >= 1 ? 0.8 : 1) : this.T.maxPixels;
		if (w * h * pr * pr > cap) pr = Math.sqrt(cap / (w * h));
		const top = Math.min(dpr, TIERS[2].maxDpr);
		this.hi = clamp(top / pr, 1, HI);
		return Math.max(0.75, Math.min(top, pr * this.effScale));
	}
}

/** Ekranın vsync aralığı: ölçülen rAF aralıklarının alt çeyreği (kaçan kareler ortalamayı şişirmesin). */
function low(arr) {
	const a = Array.from(arr).filter((x) => x > 0).sort((x, y) => x - y);
	return a.length ? a[a.length >> 2] : 16.67;
}
