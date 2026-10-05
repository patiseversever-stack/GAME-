// Soğutma sıvısı efekti: deliklerden çıkan basınçlı su jetleri, sprey damlaları ve ince sis.
// Tüm parçalar matkabın ölçekli (mm) grubunun içinde yaşar; matkapla birlikte döner.
import * as THREE from 'three';

const JET_LEN = 78; // mm

function jetMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uIntensity: { value: 0 }, uLen: { value: 0 }, uColor: { value: new THREE.Color(0xbfe8ff) } },
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform float uIntensity; uniform float uLen; uniform vec3 uColor;
      varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
      }
      void main() {
        float y = vUv.y;                       // 0 = delik, 1 = jet ucu
        if (y > uLen) discard;
        float tipFade = smoothstep(uLen, uLen - 0.35, y);
        float base = smoothstep(0.0, 0.04, y);
        vec2 q = vec2(vUv.x * 6.0, y * 9.0 - uTime * 7.5);
        float n = noise(q) * 0.6 + noise(q * 2.7 + 3.1) * 0.4;
        float streak = smoothstep(0.35, 0.95, n);
        float ndv = abs(dot(normalize(vN), normalize(vV)));
        float edge = 0.35 + 0.65 * pow(1.0 - ndv, 1.6);   // kenarlarda ışık kırılması
        float core = pow(ndv, 3.0) * 0.5;                  // ortada parlak çekirdek
        float a = (edge * (0.45 + 0.75 * streak) + core) * tipFade * base * uIntensity;
        a *= 1.0 - y * 0.55;
        gl_FragColor = vec4(uColor * (0.85 + streak * 0.6), a * 0.85);
      }`,
  });
}

function pointsMaterial(color: number, size: number) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uSize: { value: size }, uPR: { value: 1 }, uOpacity: { value: 0 }, uColor: { value: new THREE.Color(color) } },
    vertexShader: /* glsl */ `
      attribute float aLife; attribute float aSize;
      uniform float uSize; uniform float uPR;
      varying float vA;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * aSize * uPR / -mv.z;
        vA = (1.0 - aLife) * smoothstep(0.0, 0.08, aLife);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity; uniform vec3 uColor;
      varying float vA;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        if (d > 0.5) discard;
        float rim = smoothstep(0.5, 0.32, d) - smoothstep(0.3, 0.0, d) * 0.45; // damla: kenarı parlak
        gl_FragColor = vec4(uColor, rim * vA * uOpacity);
      }`,
  });
}

interface Pool {
  pos: Float32Array; vel: Float32Array; age: Float32Array; max: Float32Array; life: Float32Array; size: Float32Array;
  geo: THREE.BufferGeometry; mat: THREE.ShaderMaterial; pts: THREE.Points; n: number;
}

function pool(n: number, color: number, size: number): Pool {
  const pos = new Float32Array(n * 3), vel = new Float32Array(n * 3);
  const age = new Float32Array(n), max = new Float32Array(n), life = new Float32Array(n).fill(1), sz = new Float32Array(n);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aLife', new THREE.BufferAttribute(life, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
  const mat = pointsMaterial(color, size);
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  return { pos, vel, age, max, life, size: sz, geo, mat, pts, n };
}

export class Coolant {
  group = new THREE.Group();
  private jets: { mesh: THREE.Mesh; mat: THREE.ShaderMaterial; origin: THREE.Vector3; dir: THREE.Vector3 }[] = [];
  private spray: Pool;
  private mist: Pool;
  private light: THREE.PointLight;
  private t = 0;
  private down = new THREE.Vector3();
  private tmp = new THREE.Vector3();
  private tmp2 = new THREE.Vector3();

  constructor(private sources: { pos: THREE.Vector3; dir: THREE.Vector3 }[], mobile: boolean) {
    const geo = new THREE.CylinderGeometry(2.8, 0.85, JET_LEN, 28, 32, true);
    geo.translate(0, JET_LEN / 2, 0);
    for (const s of sources) {
      const mat = jetMaterial();
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(s.pos);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), s.dir.clone().normalize());
      mesh.renderOrder = 5;
      mesh.frustumCulled = false;
      this.group.add(mesh);
      this.jets.push({ mesh, mat, origin: s.pos.clone(), dir: s.dir.clone().normalize() });
    }
    this.spray = pool(mobile ? 520 : 1100, 0xd6f1ff, 34);
    this.mist = pool(mobile ? 40 : 90, 0x9fd4f0, 420);
    this.mist.mat.uniforms.uColor.value = new THREE.Color(0x7fbfe0);
    this.group.add(this.spray.pts, this.mist.pts);
    for (let i = 0; i < this.spray.n; i++) this.respawnSpray(i, true);
    for (let i = 0; i < this.mist.n; i++) this.respawnMist(i, true);
    this.light = new THREE.PointLight(0x8fd6ff, 0, 0.9, 2);
    this.light.position.set(0, 66, 0);
    this.group.add(this.light);
    this.group.visible = false;
  }

  private respawnSpray(i: number, stagger = false) {
    const p = this.spray;
    const j = this.jets[i % this.jets.length];
    const along = 0.55 + Math.random() * 0.45;
    const o = this.tmp.copy(j.origin).addScaledVector(j.dir, JET_LEN * along * 0.85);
    p.pos[i * 3] = o.x + (Math.random() - 0.5) * 3;
    p.pos[i * 3 + 1] = o.y + (Math.random() - 0.5) * 3;
    p.pos[i * 3 + 2] = o.z + (Math.random() - 0.5) * 3;
    // Jet yönünde hız + dağılma
    const spread = 0.55;
    this.tmp2.set((Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread);
    const v = this.tmp2.add(j.dir).normalize().multiplyScalar(90 + Math.random() * 120);
    p.vel[i * 3] = v.x; p.vel[i * 3 + 1] = v.y; p.vel[i * 3 + 2] = v.z;
    p.max[i] = 0.35 + Math.random() * 0.55;
    p.age[i] = stagger ? Math.random() * p.max[i] : 0;
    p.size[i] = 0.35 + Math.random() * 1.0;
  }

  private respawnMist(i: number, stagger = false) {
    const p = this.mist;
    const j = this.jets[i % this.jets.length];
    const o = this.tmp.copy(j.origin).addScaledVector(j.dir, JET_LEN * (0.5 + Math.random() * 0.7));
    p.pos[i * 3] = o.x + (Math.random() - 0.5) * 18;
    p.pos[i * 3 + 1] = o.y + (Math.random() - 0.5) * 10;
    p.pos[i * 3 + 2] = o.z + (Math.random() - 0.5) * 18;
    p.vel[i * 3] = (Math.random() - 0.5) * 8;
    p.vel[i * 3 + 1] = 10 + Math.random() * 14;
    p.vel[i * 3 + 2] = (Math.random() - 0.5) * 8;
    p.max[i] = 1.6 + Math.random() * 1.6;
    p.age[i] = stagger ? Math.random() * p.max[i] : 0;
    p.size[i] = 0.6 + Math.random() * 0.8;
  }

  setPixelRatio(pr: number) {
    this.spray.mat.uniforms.uPR.value = pr;
    this.mist.mat.uniforms.uPR.value = pr;
  }

  /** intensity 0..1: basınç; len 0..1: jet boyu (açılırken büyür) */
  update(dt: number, intensity: number, len: number) {
    this.t += dt;
    const on = intensity > 0.01;
    this.group.visible = on;
    if (!on) return;
    // Dünya "aşağı" yönünü bu grubun yerel uzayına çevir (yerçekimi)
    this.group.updateWorldMatrix(true, false);
    const inv = this.tmp.set(0, 0, 0);
    void inv;
    const m = new THREE.Matrix4().copy(this.group.matrixWorld).invert();
    this.down.set(0, -1, 0).transformDirection(m).multiplyScalar(260);

    for (const j of this.jets) {
      j.mat.uniforms.uTime.value = this.t;
      j.mat.uniforms.uIntensity.value = intensity;
      j.mat.uniforms.uLen.value = len;
    }
    this.light.intensity = intensity * 2.2;

    const p = this.spray;
    const emit = len > 0.6;
    for (let i = 0; i < p.n; i++) {
      p.age[i] += dt;
      if (p.age[i] > p.max[i]) { if (emit) this.respawnSpray(i); else { p.life[i] = 1; continue; } }
      const a = p.age[i];
      p.vel[i * 3] += this.down.x * dt;
      p.vel[i * 3 + 1] += this.down.y * dt;
      p.vel[i * 3 + 2] += this.down.z * dt;
      p.pos[i * 3] += p.vel[i * 3] * dt;
      p.pos[i * 3 + 1] += p.vel[i * 3 + 1] * dt;
      p.pos[i * 3 + 2] += p.vel[i * 3 + 2] * dt;
      p.life[i] = a / p.max[i];
    }
    p.mat.uniforms.uOpacity.value = intensity * (emit ? 1 : 0.6);
    p.geo.attributes.position.needsUpdate = true;
    p.geo.attributes.aLife.needsUpdate = true;
    p.geo.attributes.aSize.needsUpdate = true;

    const q = this.mist;
    for (let i = 0; i < q.n; i++) {
      q.age[i] += dt;
      if (q.age[i] > q.max[i]) this.respawnMist(i);
      q.pos[i * 3] += q.vel[i * 3] * dt;
      q.pos[i * 3 + 1] += q.vel[i * 3 + 1] * dt;
      q.pos[i * 3 + 2] += q.vel[i * 3 + 2] * dt;
      q.life[i] = q.age[i] / q.max[i];
    }
    q.mat.uniforms.uOpacity.value = intensity * 0.12 * len;
    q.geo.attributes.position.needsUpdate = true;
    q.geo.attributes.aLife.needsUpdate = true;
    q.geo.attributes.aSize.needsUpdate = true;
  }
}
