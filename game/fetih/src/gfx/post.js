// Tilt-shift (minyatür alan derinliği): tek tam ekran geçişi, yalnızca kademe ≥ 1.
//
// Sahne çoklu örneklemeli (MSAA) bir hedefe çizilir, sonra ekranın üst ve alt kenarı yumuşakça
// bulanıklaşır; orta bant keskin kalır (masadaki maketi yakından fotoğraflamak gibi). Bulanıklık
// 12 örnekli altın açılı disk; keskin bantta tek örnek (pikselin çoğu ucuz yoldan geçer).
// Hedef açılışta kurulur, shader açılışta derlenir. q=0'da hiç çalışmaz (render() false döner).
//
// Bağlantı (app.js):
//   this.post = new TiltShift(this.renderer, R.tier);                 // init
//   this.post?.setSize(Math.round(w * pr), Math.round(h * pr));       // resize
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
	vec4 c = texture(uTex, vUv);
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
		vec3 s = texture(uTex, vUv + o).rgb;
		// parlak noktalar hafif öne çıksın (bokeh hissi)
		float w = 1.0 + dot(s, vec3(0.3, 0.59, 0.11)) * 0.6;
		acc += s * w;
		wsum += w;
	}
	gl_FragColor = vec4(acc / wsum, 1.0);
}`;

export class TiltShift {
	constructor(renderer, tier) {
		this.enabled = tier.id >= 1;
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
			// odak bandı: ekranın ortası; kenarda en çok ~7 piksel (yüksek çözünürlükte ölçeklenir)
			uTilt: { value: new THREE.Vector4(0.52, 0.24, 0.3, 5) },
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
	}

	/** Çizim çözünürlüğü (cihaz pikseli). */
	setSize(w, h) {
		if (!this.enabled) return;
		this.rt.setSize(Math.max(1, w), Math.max(1, h));
		this.uniforms.uPx.value.set(1 / Math.max(1, w), 1 / Math.max(1, h));
		this.uniforms.uTilt.value.w = 5 * Math.max(1, h / 900) * this.strength;
	}

	/** Odak bandının dikey yeri (0 alt, 1 üst) ve bulanıklık gücü (0 kapalı). */
	focus(y = 0.52, strength = 1) {
		if (!this.enabled) return;
		this.uniforms.uTilt.value.x = y;
		this.strength = strength;
		this.uniforms.uTilt.value.w = 5 * Math.max(1, this.rt.height / 900) * strength;
	}

	/** Sahneyi çizer; tilt-shift kapalıysa false döner (çağıran eski yoldan çizer). */
	render(renderer, scene, camera) {
		if (!this.enabled || this.strength <= 0) return false;
		// üst katman (il adları, userData.overlay): bulanıklaşmasın, en son ekrana çizilir
		if (this._scene !== scene) {
			this._scene = scene;
			this.overlays = [];
			scene.traverse((o) => {
				if (o.userData && o.userData.overlay) this.overlays.push(o);
			});
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
