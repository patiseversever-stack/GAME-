// Procedural ram-air parachute: 9 cells (10 ribs), anhedral arc, inflated cell tops, open cell mouths, line cascade
// to four risers. 1.2 s inflation animation driven by `inflate` (0 packed → 1 flying) in the vertex shader.
import {
  BufferGeometry, Float32BufferAttribute, Mesh, MeshStandardMaterial, DoubleSide, LineSegments, LineBasicMaterial,
  Group, Vector3, Color, DynamicDrawUsage,
} from 'three';
import { patchMaterial } from '../props/patch.ts';
import { GLSL_NOISE } from '../props/glsl.ts';

export const CANOPY = { span: 7.2, chord: 2.75, cells: 9, arcR: 7.6, height: 4.3, thick: 0.38 };

/** Canopy-local point for span param s∈[−1,1], chord c∈[0,1] (LE→TE), surface side (1 top / −1 bottom), inflation k. */
export function canopyPoint(s: number, c: number, side: number, k: number, out: Vector3): Vector3 {
  const { span, chord, cells, arcR, height, thick } = CANOPY;
  const spanK = 0.14 + 0.86 * k;
  const chordK = 0.55 + 0.45 * k;
  const beta = (s * span * 0.5 * spanK) / arcR;
  const x = Math.sin(beta) * arcR;
  const yArc = (Math.cos(beta) - 1) * arcR;
  // airfoil: max thickness at 25 % chord, flat-ish bottom
  const tc = Math.pow(Math.sin(Math.PI * Math.pow(Math.max(c, 0), 0.62)), 1.0);
  const cell = ((s * 0.5 + 0.5) * cells) % 1;
  const bulge = Math.sin(Math.PI * cell) * 0.07 * k * (1 - 0.6 * c);
  const t = thick * tc * (0.3 + 0.7 * k);
  const camber = 0.12 * Math.sin(Math.PI * c) * k;
  const y = height * (0.35 + 0.65 * k) + yArc + camber + (side > 0 ? t * 0.62 + bulge : -t * 0.38 - bulge * 0.4);
  const z = (c - 0.25) * chord * chordK;
  return out.set(x, y, z);
}

function buildCanopyGeometry(spanSegsPerCell: number, chordSegs: number): BufferGeometry {
  const { cells } = CANOPY;
  const pos: number[] = [], par: number[] = [], idx: number[] = [];
  const NS = cells * spanSegsPerCell;
  // par: (s, c, side, cellMouth)
  for (const side of [1, -1]) {
    const base = pos.length / 3;
    for (let j = 0; j <= chordSegs; j++) {
      const c = Math.pow(j / chordSegs, 1.3);
      for (let i = 0; i <= NS; i++) {
        const s = (i / NS) * 2 - 1;
        pos.push(0, 0, 0);
        par.push(s, c, side, 0);
      }
    }
    const row = NS + 1;
    for (let j = 0; j < chordSegs; j++) for (let i = 0; i < NS; i++) {
      const a = base + j * row + i, b = a + 1, cc = a + row, d = cc + 1;
      if (side > 0) idx.push(a, cc, b, b, cc, d); else idx.push(a, b, cc, b, d, cc);
    }
  }
  // open cell mouths at the leading edge (dark recess strip between top and bottom skin)
  {
    const base = pos.length / 3;
    for (let i = 0; i <= NS; i++) {
      const s = (i / NS) * 2 - 1;
      pos.push(0, 0, 0, 0, 0, 0);
      par.push(s, 0.02, 1, 1, s, 0.02, -1, 1);
    }
    for (let i = 0; i < NS; i++) { const a = base + i * 2; idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); }
  }
  // ribs at the cell boundaries (side panels at the tips are ribs 0 and cells)
  for (let r = 0; r <= cells; r++) {
    const s = (r / cells) * 2 - 1;
    const base = pos.length / 3;
    for (let j = 0; j <= chordSegs; j++) {
      const c = Math.pow(j / chordSegs, 1.3);
      pos.push(0, 0, 0, 0, 0, 0);
      par.push(s, c, 1, 2, s, c, -1, 2);
    }
    for (let j = 0; j < chordSegs; j++) { const a = base + j * 2; idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new Float32BufferAttribute(new Float32Array(pos.length), 3));
  g.setAttribute('aPar', new Float32BufferAttribute(par, 4));
  g.setIndex(idx);
  return g;
}

const VERT_PARS = /* glsl */ `
${GLSL_NOISE}
attribute vec4 aPar;
uniform float uInflate;
uniform float uTime;
varying vec4 vKPar;
varying vec3 vKN;
vec3 kCanopyPoint(float s, float c, float side, float k) {
  float span = ${CANOPY.span.toFixed(3)}, chord = ${CANOPY.chord.toFixed(3)}, cells = ${CANOPY.cells.toFixed(1)}, arcR = ${CANOPY.arcR.toFixed(3)};
  float height = ${CANOPY.height.toFixed(3)}, thick = ${CANOPY.thick.toFixed(3)};
  float spanK = 0.14 + 0.86 * k;
  float chordK = 0.55 + 0.45 * k;
  float beta = (s * span * 0.5 * spanK) / arcR;
  float x = sin(beta) * arcR;
  float yArc = (cos(beta) - 1.0) * arcR;
  float tc = sin(3.14159265 * pow(max(c, 0.0), 0.62));
  float cell = fract((s * 0.5 + 0.5) * cells);
  float bulge = sin(3.14159265 * cell) * 0.07 * k * (1.0 - 0.6 * c);
  float t = thick * tc * (0.3 + 0.7 * k);
  float camber = 0.12 * sin(3.14159265 * c) * k;
  float y = height * (0.35 + 0.65 * k) + yArc + camber + (side > 0.0 ? t * 0.62 + bulge : -t * 0.38 - bulge * 0.4);
  float z = (c - 0.25) * chord * chordK;
  vec3 p = vec3(x, y, z);
  // crumpled fabric while packed / opening
  float crumple = (1.0 - k);
  p += (vec3(kNoise3(vec3(s * 6.0, c * 5.0, uTime * 3.0)), kNoise3(vec3(s * 5.0 + 3.0, c * 4.0, uTime * 2.0)), kNoise3(vec3(s * 4.0, c * 6.0 + 7.0, uTime * 2.5))) - 0.5) * crumple * 0.9;
  // breathing of the inflated canopy
  p.y += sin(uTime * 1.3 + s * 2.0) * 0.03 * k;
  return p;
}
`;

const VERT_PRE = /* glsl */ `
  vec3 kP = kCanopyPoint(aPar.x, aPar.y, aPar.z, uInflate);
  vec3 kPs = kCanopyPoint(aPar.x + 0.01, aPar.y, aPar.z, uInflate);
  vec3 kPc = kCanopyPoint(aPar.x, min(aPar.y + 0.01, 1.0), aPar.z, uInflate) ;
  if (aPar.w > 0.5 && aPar.w < 1.5) { kP.z -= 0.02; kPc = kP + vec3(0.0, -1.0, 0.0) * aPar.z; }
  vec3 kN = normalize(cross(kPs - kP, kPc - kP)) * (aPar.z > 0.0 ? 1.0 : -1.0);
  if (aPar.w > 1.5) kN = vec3(1.0, 0.0, 0.0);
  vKPar = aPar; vKN = kN;
`;

const FRAG_PARS = /* glsl */ `
uniform vec3 uColA; uniform vec3 uColB; uniform vec3 uColC;
varying vec4 vKPar;
varying vec3 vKN;
`;

const FRAG_COLOR = /* glsl */ `
  {
    float cell = floor((vKPar.x * 0.5 + 0.5) * ${CANOPY.cells.toFixed(1)});
    float k = mod(cell, 3.0);
    vec3 col = k < 0.5 ? uColA : (k < 1.5 ? uColB : uColA);
    if (abs(cell - 4.0) < 0.5) col = uColC;
    // ripstop grid + rib seams
    float cf = fract((vKPar.x * 0.5 + 0.5) * ${CANOPY.cells.toFixed(1)});
    float seam = 1.0 - smoothstep(0.0, 0.03, min(cf, 1.0 - cf));
    col *= 1.0 - 0.25 * seam;
    if (vKPar.w > 0.5 && vKPar.w < 1.5) col = vec3(0.02);
    if (vKPar.w > 1.5) col *= 0.75;
    diffuseColor.rgb = col;
  }
`;

const FRAG_LIGHT = /* glsl */ `
  #if NUM_DIR_LIGHTS > 0
    vec3 Ls = directionalLights[0].direction;
    float back = clamp(-dot(geometryNormal, Ls), 0.0, 1.0);
    float fwd = pow(clamp(dot(-geometryViewDir, Ls), 0.0, 1.0), 3.0);
    reflectedLight.directDiffuse += directionalLights[0].color * diffuseColor.rgb * diffuseColor.rgb * 1.5 * back * (0.08 + 0.6 * fwd);
  #endif
`;

export class Canopy {
  readonly group = new Group();
  readonly mesh: Mesh;
  readonly lines: LineSegments;
  private readonly mat: MeshStandardMaterial;
  private readonly inflateU = { value: 0 };
  private readonly cols = { uColA: { value: new Color('#C2302A') }, uColB: { value: new Color('#F1E6D0') }, uColC: { value: new Color('#2B2B2E') } };
  private readonly timeU: { value: number };
  private readonly linePos: Float32Array;
  private readonly lineCount: number;
  private readonly attach: { s: number; c: number }[] = [];
  inflate = 0;
  private readonly _p = new Vector3();

  constructor(detail: 0 | 1 | 2, timeU: { value: number }) {
    this.timeU = timeU;
    const g = buildCanopyGeometry(detail === 0 ? 6 : detail === 1 ? 3 : 2, detail === 0 ? 14 : 8);
    this.mat = patchMaterial(new MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0, side: DoubleSide }), {
      key: 'canopy',
      uniforms: { uInflate: this.inflateU, uTime: timeU, ...this.cols },
      vertexPars: VERT_PARS,
      vertexPre: VERT_PRE,
      vertexNormal: 'vec3 objectNormal = kN;',
      vertexBegin: 'vec3 transformed = kP;',
      fragPars: FRAG_PARS,
      fragColor: FRAG_COLOR,
      fragLight: FRAG_LIGHT,
    });
    this.mesh = new Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.name = 'canopy';
    // line attach points: 4 rows × 10 ribs on the bottom skin + brake lines at the trailing edge
    for (let r = 0; r <= CANOPY.cells; r++) for (const c of [0.05, 0.3, 0.6, 0.88]) this.attach.push({ s: (r / CANOPY.cells) * 2 - 1, c });
    this.lineCount = this.attach.length;
    this.linePos = new Float32Array(this.lineCount * 6);
    const lg = new BufferGeometry();
    const la = new Float32BufferAttribute(this.linePos, 3);
    la.setUsage(DynamicDrawUsage);
    lg.setAttribute('position', la);
    this.lines = new LineSegments(lg, new LineBasicMaterial({ color: 0x2a2a2a, transparent: true, opacity: 0.75 }));
    this.lines.frustumCulled = false;
    this.group.add(this.mesh, this.lines);
    this.group.visible = false;
  }

  setColors(a: Color, b: Color, c: Color): void {
    this.cols.uColA.value.copy(a);
    this.cols.uColB.value.copy(b);
    this.cols.uColC.value.copy(c);
  }

  /** Shoulder riser points (canopy-local) where the lines converge. */
  static risers(out: Vector3[]): void {
    out[0].set(-0.22, 1.45, -0.08); out[1].set(0.22, 1.45, -0.08); out[2].set(-0.22, 1.42, 0.08); out[3].set(0.22, 1.42, 0.08);
  }

  private readonly _r = [new Vector3(), new Vector3(), new Vector3(), new Vector3()];

  update(): void {
    this.inflateU.value = this.inflate;
    Canopy.risers(this._r);
    const k = this.inflate;
    for (let i = 0; i < this.lineCount; i++) {
      const a = this.attach[i];
      canopyPoint(a.s, a.c, -1, k, this._p);
      const ri = (a.s < 0 ? 0 : 1) + (a.c > 0.45 ? 2 : 0);
      const r = this._r[ri];
      // lines meet at a cascade point ~1/3 down before the riser
      this.linePos[i * 6] = this._p.x; this.linePos[i * 6 + 1] = this._p.y; this.linePos[i * 6 + 2] = this._p.z;
      this.linePos[i * 6 + 3] = r.x; this.linePos[i * 6 + 4] = r.y; this.linePos[i * 6 + 5] = r.z;
    }
    const attr = this.lines.geometry.attributes.position;
    attr.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mat.dispose();
    this.lines.geometry.dispose();
    (this.lines.material as LineBasicMaterial).dispose();
  }
}
