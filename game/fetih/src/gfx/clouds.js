// Bulutlar: haritanın çevresinde (Karadeniz üstü, Akdeniz, Ege ve doğu ufku) süzülen tombul, oyuncak
// bulutlar. Örneklemeli tek çizim; rüzgârla kayma ve sarmalama köşe shader'ında (her kare CPU işi yok).
// Kameraya yaklaşan bulut saydamlaşır, görüşü kapatmaz. Gölge yapmaz (karadaki bulut gölgeleri
// harita shader'ında ucuz gürültüyle).

import * as THREE from 'three';
import { COMMON, LIGHT, FINISH } from './shaderlib.js';

const VS = /* glsl */ `
${COMMON}
attribute vec4 iP; // x, y, z, ölçek
attribute float iR;
varying vec3 vW;
varying vec3 vN;
varying float vA;
varying float vY;
void main() {
	float c = cos(iR), s = sin(iR);
	vec3 p = position * iP.w;
	p = vec3(p.x * c + p.z * s, p.y, -p.x * s + p.z * c);
	// rüzgâr: doğuya ağır kayma, 160 birimlik bantta sarmal
	float x = mod(iP.x + uTime * 0.35 + 80.0, 160.0) - 80.0;
	vec3 w = p + vec3(x, iP.y, iP.z);
	vW = w;
	vN = vec3(normal.x * c + normal.z * s, normal.y, -normal.x * s + normal.z * c);
	vY = position.y;
	// kameraya yakın ve bant kenarında saydam
	float dc = distance(cameraPosition, vec3(x, iP.y, iP.z));
	vA = smoothstep(9.0, 22.0, dc) * smoothstep(80.0, 70.0, abs(x));
	gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}`;

const FS = /* glsl */ `
${COMMON}
${LIGHT}
${FINISH}
varying vec3 vW;
varying vec3 vN;
varying float vA;
varying float vY;
void main() {
	if (vA < 0.01) discard;
	vec3 N = normalize(vN);
	vec3 V = normalize(cameraPosition - vW);
	float ndl = dot(N, uSunDir);
	float w = clamp(ndl * 0.5 + 0.5, 0.0, 1.0);
	// pamuk beyazı, altı serin mavi-lila
	vec3 base = mix(vec3(0.62, 0.68, 0.86), vec3(1.0), smoothstep(-0.3, 0.6, vY));
	vec3 c = base * (uSkyTop * 1.3 + uSunCol * 0.42 * w * w);
	c += uSunCol * pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0) * 0.18;
	// şafak: bulutların güneşe bakan yüzü pembe-altın
	if (uNight.z > 0.001) c += DAWN * uNight.z * (0.25 + 0.5 * w) * 0.6;
	if (uNight.x > 0.001) {
		// gece: ay ışığında hacimli bulut. Tepesi lavanta-gümüş, altı derin mor; kenarı ay ışığıyla
		// parlar; altından ve aralarından sıcak altın ışık sızar (aşağıdaki şehirlerin ışığı gibi)
		float mw = clamp(dot(N, N_MOON) * 0.5 + 0.5, 0.0, 1.0);
		float top = smoothstep(-0.3, 0.9, vY);
		// hacim: ay tarafı gümüş-lavanta, gölge tarafı derin çivit; tombul kısımlar arasında koyu oyuklar
		float lit = pow(mw, 3.0) * (0.3 + 0.7 * top);
		vec3 n = mix(vec3(0.03, 0.018, 0.085), vec3(0.34, 0.31, 0.7), lit);
		n = mix(n, vec3(0.1, 0.06, 0.24), (1.0 - lit) * 0.5 * smoothstep(0.2, -0.3, vY));
		float ndv = clamp(dot(N, V), 0.0, 1.0);
		n += N_RIM * pow(1.0 - ndv, 3.0) * 0.5 * (0.3 + 0.7 * mw);
		float under = 1.0 - smoothstep(-0.38, 0.2, vY);
		float flick = 0.65 + 0.35 * sin(vW.x * 0.9 + vW.z * 1.3 + uTime * 0.6);
		n += N_WARM * (under * 0.8 + pow(1.0 - ndv, 4.0) * (1.0 - top) * 0.6) * flick * 0.38;
		c = mix(c, n, uNight.x);
		gRelit = 1.0;
	}
	c = applyFog(c, vW);
	gl_FragColor = finish(c, vA);
}`;

function puffGeo(detail, R) {
	const parts = [];
	const n = 6;
	for (let i = 0; i < n; i++) {
		const a = (i / n) * Math.PI * 2 + R() * 0.5;
		const r = i === 0 ? 0 : 0.9 + R() * 0.5;
		const s = i === 0 ? 1.5 : 0.85 + R() * 0.5;
		const g = new THREE.IcosahedronGeometry(s, detail);
		g.translate(Math.cos(a) * r * 1.3, (i === 0 ? 0.35 : R() * 0.3), Math.sin(a) * r * 0.7);
		parts.push(g);
	}
	// düz taban: altı kesik
	const pos = [];
	const nor = [];
	for (const g of parts) {
		const p = g.getAttribute('position');
		for (let i = 0; i < p.count; i++) {
			const y = Math.max(-0.35, p.getY(i));
			pos.push(p.getX(i), y * (y < 0 ? 0.5 : 1), p.getZ(i));
		}
	}
	const out = new THREE.BufferGeometry();
	out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	out.computeVertexNormals();
	// yumuşak bulut: normalleri küre merkezinden ver (alçak çokgen ama tombul)
	const P = out.getAttribute('position');
	const Nn = out.getAttribute('normal');
	for (let i = 0; i < P.count; i++) {
		const v = new THREE.Vector3(P.getX(i), P.getY(i) * 1.6, P.getZ(i)).normalize();
		Nn.setXYZ(i, Nn.getX(i) * 0.4 + v.x * 0.6, Nn.getY(i) * 0.4 + v.y * 0.6, Nn.getZ(i) * 0.4 + v.z * 0.6);
	}
	return out;
}

export class Clouds {
	constructor(G, tier) {
		let s = 11;
		const R = () => ((s = (s * 16807) % 2147483647) / 2147483647);
		const count = tier.id === 0 ? 8 : tier.id === 1 ? 12 : 16;
		const geo = puffGeo(1, R);
		const g = new THREE.InstancedBufferGeometry();
		g.setAttribute('position', geo.getAttribute('position'));
		g.setAttribute('normal', geo.getAttribute('normal'));
		const P = new Float32Array(count * 4);
		const Rr = new Float32Array(count);
		// çevre bantları: kuzey (Karadeniz üstü), güney (Akdeniz), batı ve doğu ufku
		const bands = [
			[-27, 5],
			[25, 5],
			[-33, 4],
			[31, 4],
		];
		for (let i = 0; i < count; i++) {
			const b = bands[i % bands.length];
			P[i * 4] = -78 + ((i * 37) % 160) + R() * 6;
			P[i * 4 + 1] = 6.5 + R() * 3.5;
			P[i * 4 + 2] = b[0] + (R() - 0.5) * b[1] * 2;
			P[i * 4 + 3] = 1.1 + R() * 1.3;
			Rr[i] = R() * 6.28;
		}
		g.setAttribute('iP', new THREE.InstancedBufferAttribute(P, 4));
		this.P = P; // gece ışıkları bulut arası sızıntıyı aynı konumlardan kurar
		g.setAttribute('iR', new THREE.InstancedBufferAttribute(Rr, 1));
		g.instanceCount = count;
		this.mesh = new THREE.Mesh(g, new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms: { ...G }, transparent: true, depthWrite: false }));
		this.mesh.frustumCulled = false;
		this.mesh.renderOrder = 10;
		this.count = count;
		this.triangles = (geo.getAttribute('position').count / 3) * count;
	}
}
