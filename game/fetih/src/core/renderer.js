// Çizici kurulumu. Ekran kartını önce küçük bir deneme bağlamıyla tanır, sonra asıl çiziciyi
// donanım kenar yumuşatmalı (MSAA) açar: döşemeli mobil kartlarda MSAA neredeyse bedavadır,
// sonradan ekran efekti geçişi gerektirmez.

import * as THREE from 'three';
import { detectTier, TIERS } from './quality.js';

/** forcedTier: oyuncunun seçtiği kademe; adjust(info): otomatikte ölçülmüş düzeltmeyi uygular (quality.launchTier). */
export function createRenderer(canvas, forcedTier, adjust = null) {
	let info = { tier: 0, gpu: '', mobile: true };
	try {
		const probe = document.createElement('canvas').getContext('webgl2');
		if (probe) {
			info = detectTier(probe);
			const lose = probe.getExtension('WEBGL_lose_context');
			if (lose) lose.loseContext();
		}
	} catch (e) {
		/* tanınamadı: düşük kademe */
	}
	const base = info.tier;
	if (forcedTier != null && forcedTier >= 0 && forcedTier <= 2) info.tier = forcedTier;
	else if (adjust) info.tier = adjust(info);
	const swiftshader = /swiftshader|llvmpipe/i.test(info.gpu);

	const renderer = new THREE.WebGLRenderer({
		canvas,
		antialias: !swiftshader,
		alpha: false,
		stencil: false,
		depth: true,
		powerPreference: 'high-performance',
		preserveDrawingBuffer: false,
	});
	// yayında gölgelendirici hata denetimi kapalı: her programın ilk kullanımında derlemenin bitmesi eşzamanlı beklenmez
	// (açılışta ~0,3 sn masaüstünde, zayıf telefonda daha çok; KHR_parallel_shader_compile ile derleme arkada sürer)
	renderer.debug.checkShaderErrors = !!import.meta.env.DEV;
	renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // renk dönüşümü shader'larda yapılır
	renderer.toneMapping = THREE.NoToneMapping;
	renderer.setClearColor(0x1b2a4a, 1);
	renderer.sortObjects = true;
	renderer.shadowMap.enabled = false; // gölge haritası yok: ışık ve gölge shader içinde boyanır

	const attrs = renderer.getContext().getContextAttributes() || {};
	const msaa = !!attrs.antialias;
	const maxAniso = renderer.capabilities.getMaxAnisotropy();
	const tier = TIERS[info.tier];
	const aniso = Math.min(maxAniso, tier.id >= 1 ? 8 : 4);
	return { renderer, tier, base: forcedTier != null && forcedTier >= 0 && forcedTier <= 2 ? info.tier : base, gpu: info.gpu, mobile: info.mobile, msaa, aniso };
}
