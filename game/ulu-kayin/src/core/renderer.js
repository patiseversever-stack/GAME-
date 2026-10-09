// Çizici kurulumu. Ekran kartını önce küçük bir deneme bağlamıyla tanır, sonra asıl çiziciyi
// donanım kenar yumuşatmalı (MSAA) açar: döşemeli mobil kartlarda MSAA neredeyse bedavadır,
// sonradan ekran efekti geçişi gerektirmez.

import * as THREE from 'three';
import { detectTier, TIERS } from './quality.js';

export function createRenderer(canvas, forcedTier) {
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
	if (forcedTier != null && forcedTier >= 0 && forcedTier <= 2) info.tier = forcedTier;
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
	renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // renk dönüşümü shader'larda yapılır
	renderer.toneMapping = THREE.NoToneMapping;
	renderer.setClearColor(0x16122a, 1);
	renderer.sortObjects = true;
	renderer.shadowMap.enabled = false; // kendi gölge sistemimiz var

	const attrs = renderer.getContext().getContextAttributes() || {};
	const msaa = !!attrs.antialias;
	const maxAniso = renderer.capabilities.getMaxAnisotropy();
	const tier = TIERS[info.tier];
	const aniso = Math.min(maxAniso, tier.id >= 1 ? 8 : 4);
	return { renderer, tier, gpu: info.gpu, mobile: info.mobile, msaa, aniso };
}
