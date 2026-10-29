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
		// (yüzey yönü yarı yarıya yükseklikle karışır: alçak çokgen yüzleri gecede seçilmesin)
		float lit = mix(smoothstep(0.35, 0.95, mw), top, 0.7) * (0.25 + 0.75 * top);
		vec3 n = mix(vec3(0.016, 0.01, 0.055), vec3(0.27, 0.25, 0.6), lit * lit);
		n = mix(n, vec3(0.1, 0.06, 0.24), (1.0 - lit) * 0.5 * smoothstep(0.2, -0.3, vY));
		float ndv = clamp(dot(N, V), 0.0, 1.0);
		n += N_RIM * pow(1.0 - ndv, 3.0) * 0.5 * (0.3 + 0.7 * mw);
		float under = 1.0 - smoothstep(-0.38, 0.2, vY);
		float flick = 0.65 + 0.35 * sin(vW.x * 0.9 + vW.z * 1.3 + uTime * 0.6);
		n += N_WARM * (under * 0.8 + pow(1.0 - ndv, 3.0) * (1.0 - top) * 0.9) * flick * 0.42;
		c = mix(c, n, uNight.x);
		gRelit = 1.0;
	}
	c = applyFog(c, vW);
	// gecede yarı saydam, hayalet gibi (çerçeve bulutları öne çıksın, alçak çokgen yüzleri seçilmesin)
	gl_FragColor = finish(c, vA * (1.0 - smoothstep(0.0, 0.55, uNight.x))); // gecede hızla söner (sakin, karanlık gök)
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

// ---------------------------------------------------------------------------------------------
// Gece bulut çerçevesi: gece odağında ekranın üst ve alt kenarından (ve yanlardan ince tutamlarla)
// süzülen, ay ışığında hacimli bulutlar; ay tarafı gümüş-lavanta, sahneye bakan ince kenarlarından
// sıcak altın ışık sızar (Gündönümü'nün "Gece Düştü" çerçevesi). Ekrana bağlı birkaç dörtgen, tek
// örneklemeli çizim; tam ekran geçişi değil (yalnızca kenar şeritleri), derinlik testi yok.
// Gece gelirken dışarıdan içeri kayar ve yoğunlaşır; gündüz hiç çizilmez (board.update görünürlüğü
// yönetir). Kamera kayınca bulut dokusu hafifçe kayar (paralaks), ışık tozu gibi canlı durur.

const FVS = /* glsl */ `
${COMMON}
attribute vec2 corner;
attribute vec4 iQ; // merkez x (yarım genişlik oranı), merkez y (NDC), yarım en, yarım boy (NDC-y birimi)
attribute vec4 iS; // tohum, dışa doğru yön (x, y), paralaks
varying vec2 vUv;
varying vec2 vS;
varying vec4 vSeed;
varying vec2 vExt;
void main() {
	float asp = uRes.x / uRes.y;
	vExt = iQ.zw;
	float k = 1.0 - uNight.x;
	vec2 cen = vec2(iQ.x * asp, iQ.y) + iS.yz * k * k * 0.35;
	cen += vec2(sin(uTime * 0.07 + iS.x * 6.0), cos(uTime * 0.05 + iS.x * 4.0)) * 0.015;
	vec2 p = cen + corner * iQ.zw;
	vUv = corner;
	vS = p;
	vSeed = iS;
	gl_Position = uNight.x < 0.002 ? vec4(2.0, 2.0, 2.0, 1.0) : vec4(p.x / asp, p.y, 0.0, 1.0);
}`;

const FFS = /* glsl */ `
${COMMON}
${FINISH}
varying vec2 vUv;
varying vec2 vS;
varying vec4 vSeed;
varying vec2 vExt; // dörtgenin yarım boyu (NDC-y birimi)
// Tombul kümülüs: birkaç kürenin yükseklik alanı (en öndeki küre kazanır, normali ondan). Doku yok,
// yalnızca kenarı yumuşatan tek gürültü okuması.
void main() {
	vec2 up = -vSeed.yz;                 // bulut tabanı ekran kenarında, tepeleri sahneye doğru
	vec2 rt = vec2(up.y, -up.x);
	bool vert = abs(up.y) > 0.5;
	float ew = vert ? vExt.x : vExt.y;
	float eh = vert ? vExt.y : vExt.x;
	vec2 p = vUv * vExt;
	vec2 nz = texture(uNoise, vS * 0.5 + vSeed.x * 5.3 + vec2(uTime * 0.006, 0.0)).ra - 0.5;
	p += nz * eh * 0.22;
	vec2 cs = vec2(dot(p, rt), dot(p, up));
	float grow = 0.35 + 0.65 * uNight.x;
	float H = -1.0;
	float H2 = -1.0; // ikinci en öndeki küre (iki tepecik arasındaki oyuk)
	float md = 9.0; // en yakın küreye uzaklık (dışarıdaki sıcak hale için)
	vec3 n = vec3(0.0, 0.0, 1.0);
	for (int k = 0; k < 8; k++) {
		float fk = float(k);
		float h1 = hash12(vec2(vSeed.x * 97.0, fk * 13.1));
		float h2 = hash12(vec2(fk * 7.7, vSeed.x * 41.0));
		// iki sıra: altta iri gövde, üstte ona oturan küçük tepecikler (kümülüs)
		float top = step(4.5, fk);
		float x = mix((fk / 4.0 - 0.5) * 1.6, ((fk - 5.0) / 2.0 - 0.5) * 1.1, top) * ew + (h1 - 0.5) * 0.25 * ew;
		float r = min(eh * mix(0.55 + 0.4 * h2, 0.3 + 0.25 * h2, top), ew * 0.6) * (1.0 - 0.3 * abs(x / ew)) * grow;
		vec2 c = vec2(x + sin(uTime * 0.11 + fk * 2.0 + vSeed.x * 9.0) * 0.012, -eh * 0.72 + r * 0.6 + top * eh * (0.38 + 0.12 * h1));
		vec2 q = (cs - c) / r;
		float d2 = dot(q, q);
		md = min(md, d2);
		if (d2 < 1.0) {
			float z = sqrt(1.0 - d2);
			float hh = r * z + h1 * 0.12 * eh;
			if (hh > H) {
				H2 = H;
				H = hh;
				n = vec3(q, z);
			} else H2 = max(H2, hh);
		}
	}
	vec3 warm = mix(N_WARM, DAWN, uNight.z);
	float fade = smoothstep(0.0, 0.35, uNight.x);
	if (H <= 0.0) {
		// bulutun sahneye bakan yanında sıcak ışık sızıntısı (q≥1'de ışıltı bunu büyütür)
		vec2 qe = abs(vUv);
		float g = smoothstep(2.4, 1.0, md) * smoothstep(-0.2, 0.6, dot(normalize(cs + 1e-4), vec2(0.0, 1.0)));
		g *= (1.0 - smoothstep(0.55, 0.98, qe.x)) * (1.0 - smoothstep(0.55, 0.98, qe.y)); // dörtgen kenarı görünmesin
		if (g < 0.01) discard;
		gRelit = 1.0;
		gLit = 1.0;
		gl_FragColor = finish(warm * 0.9, g * 0.28 * fade);
		return;
	}
	// normal ekran uzayına
	vec3 N = vec3(n.x * rt + n.y * up, n.z);
	// ay sol üstte, biraz önde
	vec3 L = normalize(vec3(-0.5, 0.75, 0.5));
	float dif = clamp(dot(N, L) * 0.6 + 0.4, 0.0, 1.0);
	float ao = mix(0.35, 1.0, smoothstep(-eh * 0.9, eh * 0.35, cs.y));
	float edge = pow(1.0 - n.z, 2.2);
	vec3 col = mix(vec3(0.012, 0.01, 0.045), vec3(0.34, 0.3, 0.7), dif * dif * ao);
	col += vec3(0.62, 0.56, 1.0) * edge * max(dot(N.xy, L.xy), 0.0) * 0.8 * ao;
	// sahneye bakan kenarlardan ve kürelerin arasından sıcak altın ışık sızar
	float flick = 0.85 + 0.15 * sin(uTime * 0.9 + vSeed.x * 11.0 + cs.x * 6.0);
	float inw = max(dot(N.xy, up), 0.0);
	col += warm * edge * inw * 2.0 * flick;
	// tepecikler arası oyuk: gölgede kalır, içinden sıcak ışık sızar
	float crev = H2 > 0.0 ? 1.0 - smoothstep(0.0, eh * 0.14, H - H2) : 0.0;
	col = col * (1.0 - 0.45 * crev) + warm * crev * 0.5 * flick;
	col += warm * (1.0 - smoothstep(0.0, eh * 0.28, H)) * 0.35 * smoothstep(-eh * 0.4, eh * 0.2, cs.y) * flick;
	gRelit = 1.0;
	gLit = 1.0; // finish() bulutu ikinci kez geceye çekmesin
	vec2 qe = abs(vUv);
	float a = smoothstep(0.0, eh * 0.09, H) * fade * (1.0 - smoothstep(0.82, 1.0, qe.x)) * (1.0 - smoothstep(0.82, 1.0, qe.y));
	gl_FragColor = finish(col, a);
}`;

export class CloudFrame {
	constructor(G, tier) {
		// [merkez x (yarım genişlik oranı), merkez y (NDC), yarım en, yarım boy, tohum, dış x, dış y, paralaks]
		const Q = [
			[-0.78, 1.0, 0.66, 0.34, 0.11, -0.35, 1, 1],
			[0.85, 0.95, 0.58, 0.32, 0.53, 0.4, 1, 0.6],
			[-0.8, -0.94, 0.74, 0.48, 0.29, -0.3, -1, 1],
			[0.9, -0.98, 0.66, 0.46, 0.71, 0.35, -1, 0.7],
			[0.05, 1.08, 0.5, 0.18, 0.87, 0, 1, 0.3],
			[-1.1, 0.36, 0.24, 0.22, 0.37, -1, 0.2, 0.5],
			[1.1, -0.34, 0.24, 0.22, 0.91, 1, -0.2, 0.8],
		];
		const n = tier.id === 0 ? 5 : Q.length;
		const g = new THREE.InstancedBufferGeometry();
		g.setAttribute('corner', new THREE.Float32BufferAttribute([-1, -1, 1, -1, 1, 1, -1, 1], 2));
		g.setIndex([0, 1, 2, 0, 2, 3]);
		const A = new Float32Array(n * 4);
		const B = new Float32Array(n * 4);
		for (let i = 0; i < n; i++) {
			const q = Q[i];
			A.set(q.slice(0, 4), i * 4);
			const l = Math.hypot(q[5], q[6]) || 1;
			B.set([q[4], q[5] / l, q[6] / l, q[7]], i * 4);
		}
		g.setAttribute('iQ', new THREE.InstancedBufferAttribute(A, 4));
		g.setAttribute('iS', new THREE.InstancedBufferAttribute(B, 4));
		g.instanceCount = n;
		this.mat = new THREE.ShaderMaterial({
			vertexShader: FVS,
			fragmentShader: FFS,
			defines: { TIER: tier.id },
			uniforms: { ...G },
			transparent: true,
			depthTest: false,
			depthWrite: false,
		});
		this.mesh = new THREE.Mesh(g, this.mat);
		this.mesh.frustumCulled = false;
		this.mesh.renderOrder = 30; // sahnenin en önünde (gökten sonra); açılışta görünür: derlensin
		this.triangles = n * 2;
	}

	/** Kare başına: yalnızca gecede çizilir. */
	update(night) {
		this.mesh.visible = night > 0.002;
	}
}
