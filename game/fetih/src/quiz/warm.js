// Nadir soru sahnelerinin açılış derlemesi.
//
// Tufan (su, yağmur, şimşek) ve Kayıp İl (altın perde) kendi gölgelendiricilerini ilk soruda kurar. Paralel derleme
// eklentisi (KHR_parallel_shader_compile) olmayan cihazda three.js programı hemen "hazır" sayar; bağlama denetimi
// (getProgramInfoLog) ilk çizimde ana iş parçacığını kilitler: telefonda soru açıkken yüzlerce ms donma (yazılımsal
// GPU'da Tufan 2,1 sn). Burada sahneler oyun açılırken kurulur, haritayla aynı derlemede derlenir ve ilk kullanım
// denetimi yükleme ekranında yapılır; soru anında yalnız hazır program kullanılır.

import * as THREE from 'three';
import { floodOf } from './d_tufan_film.js';
import { mats as kayipMats } from './d_kayip.js';

/** Derlemeden önce: nesneler görünür (derlenir). Dönüş: done(renderer) — gizle, ilk kullanım denetimini yap. */
export function quizWarm(app) {
	const show = [];
	const temp = [];
	try {
		const fl = floodOf(app);
		if (fl) show.push(fl.mesh, fl.rain, fl.bolt.mesh);
	} catch (e) {
		/* ilk soruda kurulur */
	}
	try {
		const M = kayipMats(app);
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3));
		for (const k of ['floor', 'lid', 'curtain']) {
			const m = new THREE.Mesh(g, M[k]);
			m.frustumCulled = false;
			app.scene.add(m);
			temp.push(m);
		}
	} catch (e) {
		/* ilk soruda kurulur */
	}
	const vis = show.map((o) => o.visible);
	for (const o of show) o.visible = true;
	return {
		done(renderer) {
			show.forEach((o, k) => (o.visible = vis[k]));
			const mats = new Set();
			for (const o of [...show, ...temp]) if (o.material) mats.add(o.material);
			for (const m of mats) {
				try {
					renderer.properties.get(m).currentProgram?.getUniforms?.(); // bağlama denetimi şimdi (yükleme ekranında)
				} catch (e) {
					/* ilk çizimde */
				}
			}
			for (const o of temp) o.removeFromParent();
			if (temp[0]) temp[0].geometry.dispose();
		},
	};
}
