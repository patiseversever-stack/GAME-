// Güneş gölgesi: Zifir'in çevresini kapsayan tek bir dik izdüşümlü derinlik haritası.
// Harita dokusal ızgaraya kenetlenir (kamera kayarken gölge kenarları titremez).
// Kapsamın dışında kalan uzak yerlerde (ada, alt katlar) gövde gölgesi shader'da analitik hesaplanır.

import * as THREE from 'three';

export class ShadowSystem {
	constructor(G, size) {
		this.G = G;
		this.size = size;
		this.half = 17; // haritanın yarı genişliği (birim)
		this.scene = new THREE.Scene();
		this.scene.matrixWorldAutoUpdate = false;
		this.cam = new THREE.OrthographicCamera(-this.half, this.half, this.half, -this.half, 1, 300);
		const depth = new THREE.DepthTexture(size, size);
		depth.type = THREE.UnsignedIntType;
		depth.compareFunction = THREE.LessEqualCompare;
		depth.minFilter = THREE.LinearFilter;
		depth.magFilter = THREE.LinearFilter;
		this.rt = new THREE.WebGLRenderTarget(size, size, {
			depthTexture: depth,
			depthBuffer: true,
			stencilBuffer: false,
			format: THREE.RedFormat,
			type: THREE.UnsignedByteType,
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter,
			generateMipmaps: false,
		});
		G.uShadowMap.value = depth;
		G.uShadowP.value.set(1 / size, 0.05, 0.0009, 1);
		this._bias = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
		this._r = new THREE.Vector3();
		this._u = new THREE.Vector3();
		this._f = new THREE.Vector3();
		this._p = new THREE.Vector3();
	}

	/** Gölge yapan bir geometri ekler (dünya koordinatlarında; aynı GPU tamponu paylaşılır). */
	add(geometry, material) {
		const m = new THREE.Mesh(geometry, material);
		m.frustumCulled = false;
		m.matrixAutoUpdate = false;
		m.updateMatrixWorld(true);
		this.scene.add(m);
		return m;
	}

	/** Haritayı odak noktasına ve güneş yönüne göre konumlar. */
	place(focus, sunDir) {
		const f = this._f.copy(sunDir).negate(); // ışığın bakış yönü
		const up = Math.abs(f.y) > 0.98 ? this._u.set(1, 0, 0) : this._u.set(0, 1, 0);
		const r = this._r.crossVectors(f, up).normalize();
		const u = this._u.crossVectors(r, f).normalize();
		// odak noktasını doku ızgarasına kenetle
		const texel = (this.half * 2) / this.size;
		const pr = Math.round(focus.dot(r) / texel) * texel;
		const pu = Math.round(focus.dot(u) / texel) * texel;
		const pf = focus.dot(f);
		const p = this._p.set(0, 0, 0).addScaledVector(r, pr).addScaledVector(u, pu).addScaledVector(f, pf);
		const cam = this.cam;
		cam.position.copy(p).addScaledVector(f, -150);
		cam.up.copy(u);
		cam.lookAt(p);
		cam.updateMatrixWorld(true);
		cam.updateProjectionMatrix();
		this.G.uShadowMat.value.copy(this._bias).multiply(cam.projectionMatrix).multiply(cam.matrixWorldInverse);
	}

	render(renderer) {
		const prev = renderer.getRenderTarget();
		renderer.setRenderTarget(this.rt);
		renderer.clear(false, true, false);
		renderer.render(this.scene, this.cam);
		renderer.setRenderTarget(prev);
	}

	dispose() {
		this.rt.depthTexture.dispose();
		this.rt.dispose();
	}
}
