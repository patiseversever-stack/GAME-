// Talaş kaldırma sahnesi: çelik iş parçası, delik ağzında kızıllık, kıvrık talaşlar,
// hız çizgili kıvılcımlar, yükselen duman ve havada asılı ince toz.
// Parçacıklar dünya uzayında yaşar (yerçekimi ve duman yükselişi doğru yönde olsun diye).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/* ---------------- Doku üreticiler ---------------- */
function smokeTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  for (let i = 0; i < 22; i++) {
    const x = 64 + rnd(-26, 26), y = 64 + rnd(-26, 26), r = rnd(18, 46);
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, `rgba(255,255,255,${rnd(0.08, 0.18)})`);
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ---------------- Kıvılcım: hıza göre uzayan şeritler ---------------- */
function sparkMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uLen: { value: 0.045 }, uWidth: { value: 2.2 }, uRes: { value: new THREE.Vector2(1, 1) }, uOpacity: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute vec3 iPos; attribute vec3 iVel; attribute float iLife;
      uniform float uLen; uniform float uWidth; uniform vec2 uRes;
      varying float vA; varying float vT; varying float vX;
      void main() {
        vec4 a = projectionMatrix * modelViewMatrix * vec4(iPos, 1.0);
        vec4 b = projectionMatrix * modelViewMatrix * vec4(iPos - iVel * uLen, 1.0);
        vec2 sa = a.xy / a.w * uRes, sb = b.xy / b.w * uRes;
        vec2 d = sa - sb;
        vec2 dir = length(d) > 0.001 ? normalize(d) : vec2(1.0, 0.0);
        vec2 n = vec2(-dir.y, dir.x);
        float t = position.y + 0.5;
        vec4 p = mix(b, a, t);
        p.xy += n * position.x * uWidth * (0.6 + t) / uRes * p.w;
        gl_Position = iLife >= 1.0 ? vec4(2.0, 2.0, 2.0, 1.0) : p;
        vA = 1.0 - iLife; vT = t; vX = position.x;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      varying float vA; varying float vT; varying float vX;
      void main() {
        vec3 hot = vec3(1.0, 0.93, 0.7);
        vec3 warm = vec3(1.0, 0.45, 0.08);
        vec3 col = mix(warm, hot, vT * vA);
        float a = vT * vT * (1.0 - abs(vX) * 1.8) * vA * uOpacity;
        gl_FragColor = vec4(col * 1.6, a);
      }`,
  });
}

/* ---------------- Duman, toz, ısı parlaması için nokta malzemeleri ---------------- */
function smokeMaterial(tex: THREE.Texture) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uMap: { value: tex }, uPR: { value: 1 }, uOpacity: { value: 0 }, uColor: { value: new THREE.Color(0x9aa0a8) } },
    vertexShader: /* glsl */ `
      attribute float aLife; attribute float aSize; attribute float aRot;
      uniform float uPR;
      varying float vA; varying float vRot;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uPR * (0.45 + aLife * 1.4) / -mv.z;
        vA = smoothstep(0.0, 0.15, aLife) * (1.0 - aLife);
        vRot = aRot;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap; uniform float uOpacity; uniform vec3 uColor;
      varying float vA; varying float vRot;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float s = sin(vRot), co = cos(vRot);
        c = mat2(co, -s, s, co) * c + 0.5;
        vec4 t = texture2D(uMap, c);
        gl_FragColor = vec4(uColor, t.a * vA * uOpacity);
      }`,
  });
}

function dotMaterial(color: number, additive = true) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: { uPR: { value: 1 }, uOpacity: { value: 1 }, uColor: { value: new THREE.Color(color) }, uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute float aSize; attribute float aSeed;
      uniform float uPR; uniform float uTime;
      varying float vTw;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uPR / -mv.z;
        vTw = 0.55 + 0.45 * sin(uTime * (0.6 + aSeed * 1.4) + aSeed * 40.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity; uniform vec3 uColor;
      varying float vTw;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        gl_FragColor = vec4(uColor, smoothstep(0.5, 0.0, d) * uOpacity * vTw);
      }`,
  });
}

function heatMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { uHeat: { value: 0 }, uTime: { value: 0 } },
    vertexShader: /* glsl */ `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uHeat; uniform float uTime; varying vec2 vP;
      void main() {
        float r = length(vP);
        float g = 1.0 - smoothstep(12.4, 30.0, r);
        float flicker = 0.85 + 0.15 * sin(uTime * 38.0 + r * 0.6);
        vec3 col = mix(vec3(1.0, 0.22, 0.02), vec3(1.0, 0.75, 0.35), 1.0 - smoothstep(12.4, 18.0, r));
        gl_FragColor = vec4(col, g * g * uHeat * flicker);
      }`,
  });
}

/* ---------------- Kıvrık talaş geometrisi ---------------- */
function chipGeometry() {
  class Helix extends THREE.Curve<THREE.Vector3> {
    getPoint(t: number, target = new THREE.Vector3()) {
      const a = t * Math.PI * 2 * 2.4;
      const r = 1.6 * (1 - t * 0.35);
      return target.set(Math.cos(a) * r, t * 3.4, Math.sin(a) * r);
    }
  }
  const g = new THREE.TubeGeometry(new Helix(), 40, 0.32, 5, false);
  g.scale(1, 1, 1);
  g.center();
  return g;
}

export interface MachiningCtx {
  /** Delik ağzının dünya konumu */
  entry: THREE.Vector3;
  /** Matkap ekseni (dünya, uca doğru) */
  axis: THREE.Vector3;
  /** Dünya birimi / mm */
  unit: number;
}

export class Machining {
  /** İş parçası (focus grubuna eklenir: pozla birlikte döner, matkap dönüşünden etkilenmez) */
  work = new THREE.Group();
  /** Dünya uzayındaki parçacıklar (sahneye eklenir) */
  fx = new THREE.Group();
  private block: THREE.Mesh;
  private blockMat: THREE.MeshPhysicalMaterial;
  private hole: THREE.Mesh;
  private holeMat: THREE.MeshBasicMaterial;
  private heat: THREE.Mesh;
  private heatMat: THREE.ShaderMaterial;
  private entryAnchor = new THREE.Object3D();

  // Talaşlar
  private chips: THREE.InstancedMesh;
  private chipN: number;
  private chipP: Float32Array; private chipV: Float32Array; private chipR: Float32Array; private chipW: Float32Array;
  private chipAge: Float32Array; private chipMax: Float32Array; private chipS: Float32Array;
  private chipAcc = 0;
  // Kıvılcımlar
  private sparkGeo: THREE.InstancedBufferGeometry;
  private sparkMat: THREE.ShaderMaterial;
  private sparkN: number;
  private sP: THREE.InstancedBufferAttribute; private sV: THREE.InstancedBufferAttribute; private sL: THREE.InstancedBufferAttribute;
  private sAge: Float32Array; private sMax: Float32Array;
  private sparkAcc = 0;
  // Duman
  private smoke: THREE.Points; private smokeMat: THREE.ShaderMaterial; private smokeN: number;
  private mP: Float32Array; private mV: Float32Array; private mAge: Float32Array; private mMax: Float32Array; private mLife: Float32Array; private mSize: Float32Array; private mRot: Float32Array;
  private smokeAcc = 0;
  // Toz (her zaman)
  private dust: THREE.Points; private dustMat: THREE.ShaderMaterial; private dP: Float32Array; private dV: Float32Array;

  private t = 0;
  private dummy = new THREE.Object3D();
  private v1 = new THREE.Vector3(); private v2 = new THREE.Vector3(); private v3 = new THREE.Vector3();
  private color = new THREE.Color();

  constructor(mobile: boolean, tipMM: number) {
    /* İş parçası: frezelenmiş çelik blok, yüzü matkap ucuna bakar (-X) */
    const W = 70, H = 96;
    this.blockMat = new THREE.MeshPhysicalMaterial({ color: 0xb3b9c1, metalness: 1, roughness: 0.38, transparent: true, opacity: 1 });
    this.block = new THREE.Mesh(new RoundedBoxGeometry(W, H, H, 4, 2.2), this.blockMat);
    this.block.position.x = W / 2;
    const face = new THREE.Group();
    face.position.x = 0.15;
    this.holeMat = new THREE.MeshBasicMaterial({ color: 0x020203, transparent: true, opacity: 0 });
    this.hole = new THREE.Mesh(new THREE.CircleGeometry(12.6, 48), this.holeMat);
    this.hole.rotation.y = -Math.PI / 2;
    this.hole.position.x = -0.3;
    this.heatMat = heatMaterial();
    this.heat = new THREE.Mesh(new THREE.RingGeometry(12.4, 30, 64, 1), this.heatMat);
    this.heat.rotation.y = -Math.PI / 2;
    this.heat.position.x = -0.35;
    face.add(this.hole, this.heat, this.entryAnchor);
    this.entryAnchor.position.set(-1, 0, 0);
    const inner = new THREE.Group();
    inner.add(this.block, face);
    inner.scale.setScalar(0.01);
    this.work.add(inner);
    this.work.userData.gap = tipMM + 1.5; // blok yüzünün eksendeki konumu (mm)
    this.work.visible = false;

    /* Talaşlar */
    this.chipN = mobile ? 70 : 140;
    const chipMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0.95, roughness: 0.32 });
    this.chips = new THREE.InstancedMesh(chipGeometry(), chipMat, this.chipN);
    this.chips.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.chips.frustumCulled = false;
    this.chipP = new Float32Array(this.chipN * 3); this.chipV = new Float32Array(this.chipN * 3);
    this.chipR = new Float32Array(this.chipN * 3); this.chipW = new Float32Array(this.chipN * 3);
    this.chipAge = new Float32Array(this.chipN).fill(99); this.chipMax = new Float32Array(this.chipN).fill(1);
    this.chipS = new Float32Array(this.chipN);
    const tints = [0xe2c07a, 0xd49a52, 0x8e7bb8, 0x5d7fb8, 0xa9aeb5, 0xc9a46a];
    for (let i = 0; i < this.chipN; i++) {
      this.chips.setColorAt(i, this.color.setHex(tints[i % tints.length]));
      this.dummy.scale.setScalar(0);
      this.dummy.updateMatrix();
      this.chips.setMatrixAt(i, this.dummy.matrix);
    }
    this.fx.add(this.chips);

    /* Kıvılcımlar */
    this.sparkN = mobile ? 160 : 340;
    const plane = new THREE.PlaneGeometry(1, 1, 1, 1);
    this.sparkGeo = new THREE.InstancedBufferGeometry();
    this.sparkGeo.index = plane.index;
    this.sparkGeo.setAttribute('position', plane.attributes.position);
    this.sP = new THREE.InstancedBufferAttribute(new Float32Array(this.sparkN * 3), 3);
    this.sV = new THREE.InstancedBufferAttribute(new Float32Array(this.sparkN * 3), 3);
    this.sL = new THREE.InstancedBufferAttribute(new Float32Array(this.sparkN).fill(1), 1);
    this.sP.setUsage(THREE.DynamicDrawUsage); this.sV.setUsage(THREE.DynamicDrawUsage); this.sL.setUsage(THREE.DynamicDrawUsage);
    this.sparkGeo.setAttribute('iPos', this.sP);
    this.sparkGeo.setAttribute('iVel', this.sV);
    this.sparkGeo.setAttribute('iLife', this.sL);
    this.sparkGeo.instanceCount = this.sparkN;
    this.sAge = new Float32Array(this.sparkN).fill(99);
    this.sMax = new Float32Array(this.sparkN).fill(1);
    this.sparkMat = sparkMaterial();
    const sparks = new THREE.Mesh(this.sparkGeo, this.sparkMat);
    sparks.frustumCulled = false;
    sparks.renderOrder = 6;
    this.fx.add(sparks);

    /* Duman */
    this.smokeN = mobile ? 50 : 110;
    this.mP = new Float32Array(this.smokeN * 3); this.mV = new Float32Array(this.smokeN * 3);
    this.mAge = new Float32Array(this.smokeN).fill(99); this.mMax = new Float32Array(this.smokeN).fill(1);
    this.mLife = new Float32Array(this.smokeN).fill(1); this.mSize = new Float32Array(this.smokeN); this.mRot = new Float32Array(this.smokeN);
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(this.mP, 3));
    sg.setAttribute('aLife', new THREE.BufferAttribute(this.mLife, 1));
    sg.setAttribute('aSize', new THREE.BufferAttribute(this.mSize, 1));
    sg.setAttribute('aRot', new THREE.BufferAttribute(this.mRot, 1));
    this.smokeMat = smokeMaterial(smokeTexture());
    this.smoke = new THREE.Points(sg, this.smokeMat);
    this.smoke.frustumCulled = false;
    this.smoke.renderOrder = 4;
    this.fx.add(this.smoke);

    /* Toz: ışıkta asılı ince parçacıklar */
    const dn = mobile ? 90 : 220;
    this.dP = new Float32Array(dn * 3); this.dV = new Float32Array(dn * 3);
    const dSize = new Float32Array(dn), dSeed = new Float32Array(dn);
    for (let i = 0; i < dn; i++) {
      this.dP[i * 3] = rnd(-3.2, 3.2); this.dP[i * 3 + 1] = rnd(-1.8, 1.8); this.dP[i * 3 + 2] = rnd(-1.6, 1.8);
      this.dV[i * 3] = rnd(-0.03, 0.03); this.dV[i * 3 + 1] = rnd(-0.015, 0.03); this.dV[i * 3 + 2] = rnd(-0.02, 0.02);
      dSize[i] = rnd(2.2, 7.5); dSeed[i] = Math.random();
    }
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(this.dP, 3));
    dg.setAttribute('aSize', new THREE.BufferAttribute(dSize, 1));
    dg.setAttribute('aSeed', new THREE.BufferAttribute(dSeed, 1));
    this.dustMat = dotMaterial(0xffe2b0);
    this.dustMat.uniforms.uOpacity.value = 0.32;
    this.dust = new THREE.Points(dg, this.dustMat);
    this.dust.frustumCulled = false;
    this.fx.add(this.dust);
  }

  setViewport(w: number, h: number, pr: number) {
    this.sparkMat.uniforms.uRes.value.set(w * pr, h * pr);
    this.sparkMat.uniforms.uWidth.value = 1.8 * pr;
    this.smokeMat.uniforms.uPR.value = pr;
    this.dustMat.uniforms.uPR.value = pr;
  }

  /** Delik ağzının dünya konumu ve eksen yönü */
  ctx(focus: THREE.Object3D): MachiningCtx {
    this.work.updateWorldMatrix(true, true);
    const entry = this.entryAnchor.getWorldPosition(new THREE.Vector3());
    const axis = new THREE.Vector3(1, 0, 0).transformDirection(focus.matrixWorld);
    const unit = new THREE.Vector3(1, 0, 0).applyMatrix4(this.work.matrixWorld).sub(new THREE.Vector3().applyMatrix4(this.work.matrixWorld)).length() * 0.01;
    return { entry, axis, unit };
  }

  update(dt: number, S: { block: number; cut: number; heat: number; hole: number }, focus: THREE.Object3D, dustK: number) {
    this.t += dt;
    // Blok: sağdan kayarak gelir
    this.work.visible = S.block > 0.002;
    this.work.position.x = this.work.userData.gap * 0.01 + (1 - S.block) * 1.4;
    this.blockMat.opacity = Math.min(1, S.block * 1.6);
    this.holeMat.opacity = S.hole * Math.min(1, S.block * 2);
    this.heatMat.uniforms.uHeat.value = S.heat * 1.2;
    this.heatMat.uniforms.uTime.value = this.t;

    const c = this.ctx(focus);
    const U = c.unit; // dünya birimi / mm
    const down = this.v3.set(0, -1, 0);
    // Eksene dik iki yön (delik ağzı düzlemi)
    const ax = c.axis;
    const p1 = this.v1.set(0, 1, 0).cross(ax);
    if (p1.lengthSq() < 1e-4) p1.set(0, 0, 1);
    p1.normalize();
    const p2 = this.v2.copy(ax).cross(p1).normalize();

    /* Talaş üret */
    if (S.cut > 0.05) {
      this.chipAcc += dt * S.cut * (this.chipN / 1.1);
      while (this.chipAcc > 1) {
        this.chipAcc--;
        let i = -1;
        for (let k = 0; k < this.chipN; k++) if (this.chipAge[k] >= this.chipMax[k]) { i = k; break; }
        if (i < 0) break;
        const ang = Math.random() * Math.PI * 2;
        const rr = rnd(6, 13);
        const ox = Math.cos(ang) * rr, oy = Math.sin(ang) * rr;
        this.chipP[i * 3] = c.entry.x + (p1.x * ox + p2.x * oy - ax.x * 3) * U;
        this.chipP[i * 3 + 1] = c.entry.y + (p1.y * ox + p2.y * oy - ax.y * 3) * U;
        this.chipP[i * 3 + 2] = c.entry.z + (p1.z * ox + p2.z * oy - ax.z * 3) * U;
        const back = rnd(140, 320), out = rnd(90, 260), up = rnd(40, 160);
        const ux = Math.cos(ang), uy = Math.sin(ang);
        this.chipV[i * 3] = (-ax.x * back + (p1.x * ux + p2.x * uy) * out) * U;
        this.chipV[i * 3 + 1] = (-ax.y * back + (p1.y * ux + p2.y * uy) * out + up) * U;
        this.chipV[i * 3 + 2] = (-ax.z * back + (p1.z * ux + p2.z * uy) * out) * U;
        this.chipR[i * 3] = Math.random() * 6; this.chipR[i * 3 + 1] = Math.random() * 6; this.chipR[i * 3 + 2] = Math.random() * 6;
        this.chipW[i * 3] = rnd(-14, 14); this.chipW[i * 3 + 1] = rnd(-14, 14); this.chipW[i * 3 + 2] = rnd(-14, 14);
        this.chipAge[i] = 0;
        this.chipMax[i] = rnd(0.9, 1.6);
        this.chipS[i] = rnd(0.8, 1.5);
      }
    }
    for (let i = 0; i < this.chipN; i++) {
      const alive = this.chipAge[i] < this.chipMax[i];
      if (alive) {
        this.chipAge[i] += dt;
        this.chipV[i * 3 + 1] -= 980 * U * dt;
        for (let k = 0; k < 3; k++) {
          this.chipV[i * 3 + k] *= 1 - dt * 0.6;
          this.chipP[i * 3 + k] += this.chipV[i * 3 + k] * dt;
          this.chipR[i * 3 + k] += this.chipW[i * 3 + k] * dt;
        }
      }
      const life = this.chipAge[i] / this.chipMax[i];
      const s = alive ? this.chipS[i] * U * (life < 0.08 ? life / 0.08 : life > 0.8 ? (1 - life) / 0.2 : 1) : 0;
      this.dummy.position.set(this.chipP[i * 3], this.chipP[i * 3 + 1], this.chipP[i * 3 + 2]);
      this.dummy.rotation.set(this.chipR[i * 3], this.chipR[i * 3 + 1], this.chipR[i * 3 + 2]);
      this.dummy.scale.setScalar(s);
      this.dummy.updateMatrix();
      this.chips.setMatrixAt(i, this.dummy.matrix);
    }
    this.chips.instanceMatrix.needsUpdate = true;

    /* Kıvılcımlar */
    const sp = this.sP.array as Float32Array, sv = this.sV.array as Float32Array, sl = this.sL.array as Float32Array;
    if (S.cut > 0.05) {
      this.sparkAcc += dt * S.cut * this.sparkN * 1.8;
      while (this.sparkAcc > 1) {
        this.sparkAcc--;
        let i = -1;
        for (let k = 0; k < this.sparkN; k++) if (this.sAge[k] >= this.sMax[k]) { i = k; break; }
        if (i < 0) break;
        const ang = Math.random() * Math.PI * 2;
        const ux = Math.cos(ang), uy = Math.sin(ang);
        const tx = -uy, ty = ux; // teğet (matkap dönüş yönü)
        const r = 12.5;
        sp[i * 3] = c.entry.x + (p1.x * ux + p2.x * uy) * r * U - ax.x * U;
        sp[i * 3 + 1] = c.entry.y + (p1.y * ux + p2.y * uy) * r * U - ax.y * U;
        sp[i * 3 + 2] = c.entry.z + (p1.z * ux + p2.z * uy) * r * U - ax.z * U;
        const out = rnd(350, 950), tan = rnd(250, 700), back = rnd(80, 380);
        sv[i * 3] = ((p1.x * ux + p2.x * uy) * out + (p1.x * tx + p2.x * ty) * tan - ax.x * back) * U;
        sv[i * 3 + 1] = ((p1.y * ux + p2.y * uy) * out + (p1.y * tx + p2.y * ty) * tan - ax.y * back + rnd(0, 250)) * U;
        sv[i * 3 + 2] = ((p1.z * ux + p2.z * uy) * out + (p1.z * tx + p2.z * ty) * tan - ax.z * back) * U;
        this.sAge[i] = 0;
        this.sMax[i] = rnd(0.18, 0.55);
      }
    }
    for (let i = 0; i < this.sparkN; i++) {
      if (this.sAge[i] < this.sMax[i]) {
        this.sAge[i] += dt;
        sv[i * 3 + 1] -= 1400 * U * dt;
        sp[i * 3] += sv[i * 3] * dt;
        sp[i * 3 + 1] += sv[i * 3 + 1] * dt;
        sp[i * 3 + 2] += sv[i * 3 + 2] * dt;
        sl[i] = Math.min(1, this.sAge[i] / this.sMax[i]);
      } else sl[i] = 1;
    }
    this.sP.needsUpdate = true; this.sV.needsUpdate = true; this.sL.needsUpdate = true;

    /* Duman */
    const smokeRate = S.heat * 26 + S.cut * 14;
    this.smokeAcc += dt * smokeRate;
    while (this.smokeAcc > 1) {
      this.smokeAcc--;
      let i = -1;
      for (let k = 0; k < this.smokeN; k++) if (this.mAge[k] >= this.mMax[k]) { i = k; break; }
      if (i < 0) break;
      const ang = Math.random() * Math.PI * 2;
      const r = rnd(4, 16);
      const ux = Math.cos(ang) * r, uy = Math.sin(ang) * r;
      this.mP[i * 3] = c.entry.x + (p1.x * ux + p2.x * uy - ax.x * 4) * U;
      this.mP[i * 3 + 1] = c.entry.y + (p1.y * ux + p2.y * uy - ax.y * 4) * U;
      this.mP[i * 3 + 2] = c.entry.z + (p1.z * ux + p2.z * uy - ax.z * 4) * U;
      this.mV[i * 3] = (rnd(-14, 14) - ax.x * 30) * U;
      this.mV[i * 3 + 1] = rnd(45, 95) * U;
      this.mV[i * 3 + 2] = (rnd(-14, 14) - ax.z * 30) * U;
      this.mAge[i] = 0;
      this.mMax[i] = rnd(1.8, 3.4);
      this.mSize[i] = rnd(28, 52) * U * 100;
      this.mRot[i] = Math.random() * 6.28;
    }
    for (let i = 0; i < this.smokeN; i++) {
      if (this.mAge[i] < this.mMax[i]) {
        this.mAge[i] += dt;
        this.mV[i * 3 + 1] += 18 * U * dt;
        this.mP[i * 3] += this.mV[i * 3] * dt + Math.sin(this.t * 1.3 + i) * 6 * U * dt;
        this.mP[i * 3 + 1] += this.mV[i * 3 + 1] * dt;
        this.mP[i * 3 + 2] += this.mV[i * 3 + 2] * dt;
        this.mRot[i] += dt * 0.4 * (i % 2 ? 1 : -1);
        this.mLife[i] = this.mAge[i] / this.mMax[i];
      } else this.mLife[i] = 1;
    }
    this.smokeMat.uniforms.uOpacity.value = 0.55;
    const sg = this.smoke.geometry;
    sg.attributes.position.needsUpdate = true;
    sg.attributes.aLife.needsUpdate = true;
    sg.attributes.aSize.needsUpdate = true;
    sg.attributes.aRot.needsUpdate = true;
    void down;

    /* Toz */
    const dp = this.dP, dv = this.dV;
    for (let i = 0; i < dp.length / 3; i++) {
      dp[i * 3] += dv[i * 3] * dt; dp[i * 3 + 1] += dv[i * 3 + 1] * dt; dp[i * 3 + 2] += dv[i * 3 + 2] * dt;
      if (dp[i * 3] > 3.3) dp[i * 3] = -3.3; if (dp[i * 3] < -3.3) dp[i * 3] = 3.3;
      if (dp[i * 3 + 1] > 1.9) dp[i * 3 + 1] = -1.9; if (dp[i * 3 + 1] < -1.9) dp[i * 3 + 1] = 1.9;
    }
    this.dust.geometry.attributes.position.needsUpdate = true;
    this.dustMat.uniforms.uTime.value = this.t;
    this.dustMat.uniforms.uOpacity.value = 0.22 + dustK * 0.3;
  }
}
