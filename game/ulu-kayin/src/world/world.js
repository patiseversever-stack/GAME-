// Dünyayı kurar: dokular, malzemeler, ağaç, patika, ada, gökyüzü ve gölge yapanlar.
// Her şey açılışta bir kez üretilir; oyun sırasında yeni geometri ya da malzeme oluşturulmaz.

import * as THREE from 'three';
import * as TX from '../gfx/textures.js';
import { litMaterial, leafMaterial, leafDepthMaterial, depthMaterial, emissiveMaterial, skyMaterial } from '../gfx/materials.js';
import { COMMON, LIGHT, FINISH } from '../gfx/shaderlib.js';
import { PathCurve, buildWalkway } from './path.js';
import { buildTree } from './tree.js';
import { buildIsland } from './island.js';
import { buildSky, buildSunGlare } from './sky.js';
import { THETA_END, LEVELS } from './layout.js';
import { buildCrystals, crystalMaterial } from './crystals.js';
import { seasonParticles, lightShafts, birdFlock } from './ambient.js';

export function createWorld({ G, tier, shadow, aniso, msaa }) {
	const hi = tier.id >= 1;
	const tex = {
		bark: TX.barkTexture(hi ? 1024 : 512, aniso),
		plank: TX.plankTexture(512, 256, aniso),
		leaves: TX.leafAtlas(tier.id >= 2 ? 1024 : 512),
		glow: TX.glowTexture(128),
		ink: TX.inkTexture(128),
		stars: TX.starTexture(1024, 512),
		cloud: TX.cloudTexture(256),
		cloudNoise: TX.cloudNoise(256),
		particles: TX.particleAtlas(128),
		shaft: TX.shaftTexture(128, 256),
		rock: TX.rockTexture(256, aniso),
	};

	const scene = new THREE.Scene();
	scene.matrixWorldAutoUpdate = true;

	const curve = new PathCurve();
	const tree = buildTree(curve, tier);
	const walk = buildWalkway(curve);
	const gateTheta = (THETA_END + 0.3) % (Math.PI * 2);
	const isl = buildIsland(gateTheta);
	const sky = buildSky(G, tex, tier);

	const add = (geo, mat, order = 0, cast = null) => {
		const m = new THREE.Mesh(geo, mat);
		m.matrixAutoUpdate = false;
		m.frustumCulled = geo.boundingSphere ? true : false;
		m.renderOrder = order;
		scene.add(m);
		if (cast) shadow.add(geo, cast);
		return m;
	};

	const depth = depthMaterial();
	const depthWind = depthMaterial({ wind: true });

	// Kar: kış katında (y < ~13) yukarı bakan yüzeylerde
	const SNOW_Y = 12.5;
	const mats = {
		trunk: litMaterial({ map: tex.bark, wrap: 0.38, rim: 0.5, snow: 1, snowY: SNOW_Y }),
		branch: litMaterial({ map: tex.bark, wrap: 0.38, rim: 0.5, snow: 1, snowY: SNOW_Y, wind: true, cutout: true }),
		walk: litMaterial({ map: tex.plank, wrap: 0.22, rim: 0.2, snow: 0.85, snowY: SNOW_Y - 1 }),
		rail: litMaterial({ wrap: 0.3, rim: 0.35, snow: 0.9, snowY: SNOW_Y }),
		glass: emissiveMaterial(0xffc27a, 2.4),
		leaf: leafMaterial(tex.leaves, { a2c: msaa }),
		islandTop: litMaterial({ wrap: 0.3, rim: 0.12 }),
		rock: litMaterial({ map: tex.rock, wrap: 0.3, rim: 0.3 }),
		props: litMaterial({ wrap: 0.3, rim: 0.3, cutout: true }),
		pond: litMaterial({ wrap: 0.2, rim: 0.9 }),
		far: litMaterial({ wrap: 0.5, rim: 0.4 }),
		sky: skyMaterial(tex.stars),
	};

	add(tree.trunk, mats.trunk, 0, depth);
	add(tree.branches, mats.branch, 0, depthWind);
	if (tree.nest) add(tree.nest, mats.rail, 0, depth);
	add(walk.walkway, mats.walk, 0, depth);
	add(walk.rail, mats.rail, 0, depth);
	add(walk.glass, mats.glass, 0);
	const leaves = new THREE.Mesh(tree.leaves, mats.leaf);
	leaves.frustumCulled = false;
	leaves.matrixAutoUpdate = false;
	leaves.renderOrder = 2;
	scene.add(leaves);
	shadow.add(tree.leaves, leafDepthMaterial(tex.leaves));

	add(isl.top, mats.islandTop, 0);
	add(isl.rock, mats.rock, 0);
	add(isl.props, mats.props, 0, depth);
	add(isl.pond, mats.pond, 0);
	add(isl.gateFrame, mats.trunk, 0, depth);
	const gateMat = portalMaterial(G);
	add(isl.gate, gateMat, 1);
	add(sky.farGeo, mats.far, 0);

	// Işık kristalleri ve onları taşıyan ince dallar
	const crystals = buildCrystals(curve, LEVELS);
	const crystalMat = crystalMaterial(G, crystals.list.length);
	if (crystals.twigGeo) add(crystals.twigGeo, mats.branch, 0);
	if (crystals.gemGeo) add(crystals.gemGeo, crystalMat, 0);

	sky.dome.material = mats.sky;
	scene.add(sky.dome);
	scene.add(sky.group);
	const glare = buildSunGlare(tex.glow, G);
	scene.add(glare);

	// Ortam canlılığı
	const particles = seasonParticles(G, tex.particles, tier.particles);
	const shafts = lightShafts(G, tex.shaft, tier.shafts);
	const birds = birdFlock(G, tier.birds);
	scene.add(particles.mesh, shafts.mesh, birds.mesh);

	// Fener haleleri: her fenerde kameraya dönük toplamalı parıltı (tek çizim)
	const lanternGlow = glowSprites(walk.lanterns, tex.glow, G, 0.5, 0xffb060);
	scene.add(lanternGlow.mesh);

	return {
		scene,
		curve,
		tree,
		walk,
		island: isl,
		tex,
		mats,
		gateMat,
		crystals,
		crystalMat,
		glare,
		lanternGlow,
		particles,
		shafts,
		birds,
		occluders: {
			caps: tree.caps.concat(isl.occ.caps),
			ellipsoids: tree.ellipsoids,
			spheres: isl.occ.spheres,
		},
	};
}

/** Kök Kapısı: içinde dönen mürekkep, kenarı mor-altın parlayan kemer. */
function portalMaterial(G) {
	return new THREE.ShaderMaterial({
		vertexShader: /* glsl */ `
			varying vec2 vUv; varying vec3 vW;
			void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
		fragmentShader: /* glsl */ `
			${COMMON}
			${LIGHT}
			${FINISH}
			uniform float uOpen;
			varying vec2 vUv; varying vec3 vW;
			void main() {
				const float GW = 1.25, GH = 2.5;
				float lx = (vUv.x - 0.5) * 2.0 * GW, ly = vUv.y * GH;
				float d = ly < GH - GW ? GW - abs(lx) : GW - length(vec2(lx, ly - (GH - GW)));
				vec2 p = vec2(lx, ly - GH * 0.42);
				float r = length(p);
				float a = atan(p.y, p.x);
				float sw = sin(a * 3.0 + r * 5.5 - uTime * 1.4) * 0.5 + 0.5;
				vec3 c = vec3(0.012, 0.008, 0.03) + vec3(0.22, 0.14, 0.55) * sw * sw * (1.0 - smoothstep(0.0, 1.4, r)) * (0.35 + uOpen);
				float rim = 1.0 - smoothstep(0.0, 0.32, d);
				c += mix(vec3(0.55, 0.42, 1.6), vec3(2.2, 1.5, 0.6), 0.35 + 0.35 * sin(uTime * 2.0 + a * 2.0)) * rim * (0.5 + 1.6 * uOpen);
				float sp = step(0.985, fract(sin(dot(floor(vec2(a * 9.0, r * 14.0 - uTime * 0.8)), vec2(12.9, 78.2))) * 43758.5));
				c += vec3(1.4, 1.3, 2.2) * sp * (1.0 - smoothstep(0.2, 1.2, r)) * 0.6;
				gl_FragColor = finish(applyFog(c, vW), 1.0);
			}`,
		uniforms: { ...G, uOpen: { value: 0 } },
		side: THREE.DoubleSide,
		polygonOffset: true,
		polygonOffsetFactor: -2,
	});
}

/** Konum listesinden kameraya dönük toplamalı parıltılar (örneklemeli tek çizim). */
export function glowSprites(points, glowTex, G, size, color) {
	const geo = new THREE.InstancedBufferGeometry();
	const q = new THREE.PlaneGeometry(1, 1);
	geo.setIndex(q.index);
	geo.setAttribute('position', q.getAttribute('position'));
	const P = new Float32Array(Math.max(1, points.length) * 4);
	points.forEach((p, i) => P.set([p.x, p.y, p.z, size], i * 4));
	const attr = new THREE.InstancedBufferAttribute(P, 4);
	geo.setAttribute('iPos', attr);
	geo.instanceCount = points.length;
	const mat = new THREE.ShaderMaterial({
		vertexShader: /* glsl */ `
			attribute vec4 iPos; varying vec2 vUv; varying vec3 vW;
			uniform float uTime;
			void main() {
				vec3 toCam = normalize(cameraPosition - iPos.xyz);
				vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCam));
				vec3 up = cross(toCam, right);
				float fl = 0.92 + 0.08 * sin(uTime * 9.0 + iPos.x * 3.0) * sin(uTime * 6.3 + iPos.z);
				vec3 w = iPos.xyz + toCam * 0.08 + (right * position.x + up * position.y) * iPos.w * fl;
				vUv = position.xy + 0.5; vW = w;
				gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
			}`,
		fragmentShader: /* glsl */ `
			uniform sampler2D uMap; uniform vec3 uColor; uniform float uK; uniform vec4 uFogP;
			varying vec2 vUv; varying vec3 vW;
			void main() {
				float t = texture2D(uMap, vUv).r;
				float f = exp(-length(vW - cameraPosition) * uFogP.x * 0.8);
				vec3 c = uColor * t * uK * f;
				gl_FragColor = vec4(c / (1.0 + c * 0.3), 1.0);
			}`,
		uniforms: { uTime: G.uTime, uFogP: G.uFogP, uMap: { value: glowTex }, uColor: { value: new THREE.Color(color) }, uK: { value: 1 } },
		transparent: true,
		depthWrite: false,
		blending: THREE.AdditiveBlending,
	});
	const mesh = new THREE.Mesh(geo, mat);
	mesh.frustumCulled = false;
	mesh.renderOrder = 25;
	return { mesh, attr, mat };
}
