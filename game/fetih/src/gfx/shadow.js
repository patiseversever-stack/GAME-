// Güneş gölgesi: kameranın baktığı bölgeyi kapsayan tek bir dik izdüşümlü derinlik haritası.
// Harita doku ızgarasına kenetlenir (kamera kayarken gölge kenarları titremez). Kapsamın
// dışında gölge yumuşakça söner; uzak yerlerde yapıların altındaki koyuluk köşe renginde boyalıdır.

import * as THREE from 'three';

export class ShadowSystem {
	constructor(G, size, half = 24) {
		this.G = G;
		this.size = size;
		this.half = half; // haritanın yarı genişliği (birim)
		this.maxHalf = half;
		this.minHalf = 14;
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
		G.uShadowP.value.set(1 / size, 0.035, 0.0007, 1);
		this._bias = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
		this._r = new THREE.Vector3();
		this._u = new THREE.Vector3();
		this._f = new THREE.Vector3();
		this._p = new THREE.Vector3();
	}

	/** Gölge yapan bir nesne ekler (aynı geometri tamponu paylaşılır, malzeme yalnızca derinlik yazar). */
	add(object) {
		object.frustumCulled = false;
		this.scene.add(object);
		return object;
	}

	/**
	 * Haritayı odak noktasına ve güneş yönüne göre konumlar. dist (isteğe bağlı): kamera uzaklığı;
	 * verilirse kapsam yakın çekimde daralır (gölgeler keskinleşir). Kapsam basamaklıdır
	 * (1.25 katlar): yakınlaştırırken gölge kenarları sürekli titremesin.
	 */
	place(focus, sunDir, dist) {
		if (dist != null) {
			// minHalf (vars. 14): Kuşbakışı'nın kahraman maketi yakın çekimde daha dar (keskin) kapsam ister
			const want = Math.min(this.maxHalf, Math.max(this.minHalf, dist * 0.8));
			const stepH = 14 * Math.pow(1.25, Math.round(Math.log(want / 14) / Math.log(1.25)));
			const h = Math.min(this.maxHalf, stepH);
			if (h !== this.half) {
				this.half = h;
				// dar kapsamda doku pikseli küçülür: normal kaydırma ve derinlik payı da onunla küçülür (ince ayrıntı gölgesi)
				const k = Math.min(1, h / 14);
				this.G.uShadowP.value.y = 0.035 * k;
				this.G.uShadowP.value.z = 0.0007 * Math.max(0.35, k);
				const c = this.cam;
				c.left = -h;
				c.right = h;
				c.top = h;
				c.bottom = -h;
				c.updateProjectionMatrix();
			}
		}
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
		// gölge geçişinin maliyeti (app.stats ana geçişi sayar; bunu ayrıca raporlamak için)
		this.calls = renderer.info.render.calls;
		this.tris = renderer.info.render.triangles;
		renderer.setRenderTarget(prev);
	}

	dispose() {
		this.rt.depthTexture.dispose();
		this.rt.dispose();
	}
}
