// Tilt-shift (minyatür alan derinliği): tek tam ekran geçişi, yalnızca kademe ≥ 1.
//
// Sahne çoklu örneklemeli (MSAA) bir hedefe çizilir, sonra ekranın üst ve alt kenarı yumuşakça
// bulanıklaşır; orta bant keskin kalır (masadaki maketi yakından fotoğraflamak gibi). Bulanıklık
// 12 örnekli altın açılı disk; keskin bantta tek örnek (pikselin çoğu ucuz yoldan geçer).
// v0.4: okunurluk önce. Bulanıklık hafif (kenarda en çok ~2,5 piksel), keskin bant geniş; gece odağında
// (seçim, düello, fetih) tamamen kapanır ve geçiş hiç çalışmaz (strength 0 → render() false).
// Parlama (bloom) kaldırıldı: aydınlık iller çevresine ışık saçmaz.
// Hedef açılışta kurulur, shader açılışta derlenir. q=0'da hiç çalışmaz (render() false döner).
//
// Bağlantı (app.js):
//   this.post = new TiltShift(this.renderer, R.tier);                 // init
//   this.post?.setSize(Math.round(w * pr), Math.round(h * pr), pr);   // resize
//   this.post?.focus(0.52, 1 - gece);                                 // her karede (gece: 0 → geçiş çalışmaz)
//   if (!this.post?.render(r, this.scene, this.camera)) { …eski çizim… } // render

import * as THREE from 'three';

const VS = /* glsl */ `
varying vec2 vUv;
void main() {
	vUv = position.xy * 0.5 + 0.5;
	gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const FS = /* glsl */ `
uniform sampler2D uTex;
uniform vec2 uPx;      // 1 / çözünürlük
uniform vec4 uTilt;    // x odak bandı merkezi (0..1, aşağıdan), y keskin yarı genişlik, z geçiş, w en büyük yarıçap (piksel)
varying vec2 vUv;
void main() {
	float d = abs(vUv.y - uTilt.x);
	float k = smoothstep(uTilt.y, uTilt.y + uTilt.z, d);
	vec4 c = textureLod(uTex, vUv, 0.0);
	if (k < 0.02) {
		gl_FragColor = c;
		return;
	}
	float r = k * uTilt.w;
	vec3 acc = c.rgb;
	float wsum = 1.0;
	// altın açılı disk (12 örnek)
	for (int i = 0; i < 12; i++) {
		float fi = float(i) + 0.5;
		float a = fi * 2.39996;
		float rr = sqrt(fi / 12.0) * r;
		vec2 o = vec2(cos(a), sin(a)) * rr * uPx;
		vec3 s = textureLod(uTex, vUv + o, 0.0).rgb;
		// parlak noktalar hafif öne çıksın (bokeh hissi)
		float w = 1.0 + dot(s, vec3(0.3, 0.59, 0.11)) * 0.6;
		acc += s * w;
		wsum += w;
	}
	gl_FragColor = vec4(acc / wsum, 1.0);
}`;

// kenarda en büyük bulanıklık yarıçapı (css pikseli) ve keskin bant: okunurluk için hafif (v0.4)
const BLUR_PX = 1.8; // v0.5: keskinlik önce (kenarda en çok ~1,8 css px)
const SHARP = 0.3; // ekran yüksekliğinin ortasında bu yarı genişlik kadar tam keskin

export class TiltShift {
	constructor(renderer, tier, G = null) {
		this.enabled = tier.id >= 1;
		this.G = G;
		this.renderer = renderer;
		if (!this.enabled) return;
		const attrs = renderer.getContext().getContextAttributes() || {};
		this.rt = new THREE.WebGLRenderTarget(4, 4, {
			samples: attrs.antialias ? 4 : 0,
			type: THREE.UnsignedByteType,
			depthBuffer: true,
			stencilBuffer: false,
			generateMipmaps: false,
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter,
		});
		this.rt.texture.colorSpace = THREE.NoColorSpace;
		this.uniforms = {
			uTex: { value: this.rt.texture },
			uPx: { value: new THREE.Vector2(1 / 4, 1 / 4) },
			// odak bandı: ekranın ortası geniş ve keskin; kenarda en çok ~2,4 css pikseli bulanıklık
			uTilt: { value: new THREE.Vector4(0.52, SHARP, 0.34, BLUR_PX) },
		};
		const geo = new THREE.BufferGeometry();
		geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
		this.mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms: this.uniforms, depthTest: false, depthWrite: false });
		this.quad = new THREE.Mesh(geo, this.mat);
		this.quad.frustumCulled = false;
		this.scene = new THREE.Scene();
		this.scene.add(this.quad);
		this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
		renderer.compile(this.scene, this.cam);
		this.strength = 1;
		this._dpr = 1;
	}

	/** Çizim çözünürlüğü (cihaz pikseli); dpr: cihaz pikseli / css pikseli (yarıçap css pikseline göre). */
	setSize(w, h, dpr = 1) {
		if (!this.enabled) return;
		this.rt.setSize(Math.max(1, w), Math.max(1, h));
		this._dpr = dpr;
		this.uniforms.uPx.value.set(1 / Math.max(1, w), 1 / Math.max(1, h));
		this._radius();
	}

	_radius() {
		this.uniforms.uTilt.value.w = BLUR_PX * Math.max(1, this._dpr) * this.strength;
	}

	/**
	 * Odak bandının dikey yeri (0 alt, 1 üst) ve bulanıklık gücü (0 kapalı: geçiş hiç çalışmaz).
	 * Her karede çağrılabilir (yalnızca uniform yazar).
	 */
	focus(y = 0.52, strength = 1) {
		if (!this.enabled) return;
		this.uniforms.uTilt.value.x = y;
		this.strength = strength;
		this._radius();
	}

	/** Sahneyi çizer; tilt-shift kapalıysa false döner (çağıran eski yoldan çizer). */
	render(renderer, scene, camera) {
		// çok hafif bulanıklık (yarım pikselden az) göze görünmez: geçişi hiç çalıştırma
		if (!this.enabled || this.uniforms.uTilt.value.w < 0.5) return false;
		// üst katman (il adları, oklar; userData.overlay): bulanıklaşmasın, en son ekrana çizilir
		if (this._scene !== scene) {
			this._scene = scene;
			this.overlays = [];
			scene.traverse((o) => {
				if (o.userData && o.userData.overlay) this.overlays.push(o);
			});
			this.overlays.sort((a, b) => a.renderOrder - b.renderOrder); // oklar önce, adlar en üstte
		}
		const ov = this.overlays;
		for (let i = 0; i < ov.length; i++) {
			ov[i].userData._vis = ov[i].visible;
			ov[i].visible = false;
		}
		renderer.setRenderTarget(this.rt);
		renderer.clear();
		renderer.render(scene, camera);
		// istatistik: sahne + son geçiş + üst katman birlikte görünsün
		const auto = renderer.info.autoReset;
		renderer.info.autoReset = false;
		renderer.setRenderTarget(null);
		renderer.render(this.scene, this.cam);
		for (let i = 0; i < ov.length; i++) {
			ov[i].visible = ov[i].userData._vis;
			if (ov[i].visible) renderer.render(ov[i], camera);
		}
		renderer.info.autoReset = auto;
		return true;
	}

	dispose() {
		if (!this.enabled) return;
		this.rt.dispose();
		this.mat.dispose();
	}
}
