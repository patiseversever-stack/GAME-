// GPU instance table + per-LOD index lists with CPU distance/frustum culling.
// Instance data (static or rarely updated) lives in a RGBA32F texture; each LOD mesh only carries a per-instance
// float index (aIdx) that the CPU rewrites per frame for visible instances → tiny uploads, one draw call per LOD.
import {
  DataTexture, FloatType, RGBAFormat, NearestFilter, InstancedBufferGeometry, InstancedBufferAttribute,
  Mesh, Vector4, Frustum, Matrix4, DynamicDrawUsage,
} from 'three';
import type { BufferGeometry, Material, Camera, Object3D } from 'three';

const TEX_W = 1024;

export class InstanceTable {
  readonly texels: number;
  readonly capacity: number;
  count = 0;
  readonly data: Float32Array;
  readonly tex: DataTexture;
  /** Bounding spheres used for culling (world space). */
  readonly cx: Float32Array;
  readonly cy: Float32Array;
  readonly cz: Float32Array;
  readonly cr: Float32Array;

  constructor(capacity: number, texels: number) {
    this.capacity = Math.max(1, capacity);
    this.texels = texels;
    const total = this.capacity * texels;
    const h = Math.max(1, Math.ceil(total / TEX_W));
    this.data = new Float32Array(TEX_W * h * 4);
    this.tex = new DataTexture(this.data, TEX_W, h, RGBAFormat, FloatType);
    this.tex.minFilter = NearestFilter;
    this.tex.magFilter = NearestFilter;
    this.tex.generateMipmaps = false;
    this.tex.needsUpdate = true;
    this.cx = new Float32Array(this.capacity);
    this.cy = new Float32Array(this.capacity);
    this.cz = new Float32Array(this.capacity);
    this.cr = new Float32Array(this.capacity);
  }

  write(i: number, k: number, x: number, y: number, z: number, w: number): void {
    const o = (i * this.texels + k) * 4;
    const d = this.data;
    d[o] = x; d[o + 1] = y; d[o + 2] = z; d[o + 3] = w;
  }

  bounds(i: number, x: number, y: number, z: number, r: number): void {
    this.cx[i] = x; this.cy[i] = y; this.cz[i] = z; this.cr[i] = r;
  }

  upload(): void {
    this.tex.needsUpdate = true;
  }

  dispose(): void {
    this.tex.dispose();
  }
}

export interface LodLevelDef {
  geometry: BufferGeometry;
  material: Material;
  depthMaterial?: Material;
  castShadow?: boolean;
  renderOrder?: number;
}

/** Uniform bag shared by the patched materials of one LOD level. */
export interface LodUniforms {
  uInstTex: { value: DataTexture };
  uLodBand: { value: Vector4 };
  uLodSide: { value: number };
}

const _m = new Matrix4();

/** Spatial bucketing so culling of thousands of instances only visits nearby cells. */
class CellGrid {
  readonly cell: number;
  keys: number[] = [];
  starts: Int32Array = new Int32Array(0);
  counts: Int32Array = new Int32Array(0);
  order: Int32Array = new Int32Array(0);
  ccx: Float32Array = new Float32Array(0);
  ccy: Float32Array = new Float32Array(0);
  ccz: Float32Array = new Float32Array(0);
  ccr: Float32Array = new Float32Array(0);

  constructor(cell: number) {
    this.cell = cell;
  }

  build(t: InstanceTable): void {
    const n = t.count;
    const map = new Map<number, number[]>();
    for (let i = 0; i < n; i++) {
      const gx = Math.floor(t.cx[i] / this.cell);
      const gz = Math.floor(t.cz[i] / this.cell);
      const key = (gx + 4096) * 8192 + (gz + 4096);
      let arr = map.get(key);
      if (!arr) { arr = []; map.set(key, arr); }
      arr.push(i);
    }
    const nc = map.size;
    this.keys = [];
    this.starts = new Int32Array(nc);
    this.counts = new Int32Array(nc);
    this.order = new Int32Array(n);
    this.ccx = new Float32Array(nc); this.ccy = new Float32Array(nc); this.ccz = new Float32Array(nc); this.ccr = new Float32Array(nc);
    let c = 0;
    let o = 0;
    for (const [key, arr] of map) {
      this.keys.push(key);
      this.starts[c] = o;
      this.counts[c] = arr.length;
      let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
      for (const i of arr) {
        this.order[o++] = i;
        const r = t.cr[i];
        minX = Math.min(minX, t.cx[i] - r); maxX = Math.max(maxX, t.cx[i] + r);
        minY = Math.min(minY, t.cy[i] - r); maxY = Math.max(maxY, t.cy[i] + r);
        minZ = Math.min(minZ, t.cz[i] - r); maxZ = Math.max(maxZ, t.cz[i] + r);
      }
      this.ccx[c] = (minX + maxX) / 2; this.ccy[c] = (minY + maxY) / 2; this.ccz[c] = (minZ + maxZ) / 2;
      this.ccr[c] = 0.5 * Math.hypot(maxX - minX, maxY - minY, maxZ - minZ);
      c++;
    }
  }
}

/**
 * Draws one InstanceTable with N LOD levels. Level L is visible over [switch[L-1], switch[L]] (with dithered
 * cross-fade bands) and the last level fades out at maxDist.
 */
export class LodDrawer {
  readonly table: InstanceTable;
  readonly meshes: Mesh[] = [];
  readonly uniforms: LodUniforms[] = [];
  private readonly idx: Float32Array[] = [];
  private readonly idxAttr: InstancedBufferAttribute[] = [];
  private readonly geos: InstancedBufferGeometry[] = [];
  private switches: number[] = [];
  private maxDist = 1000;
  private fadeFrac = 0.15;
  /** Extra frustum margin (m) — shadow casters / animated props. */
  cullMargin = 4;
  private readonly grid: CellGrid;
  /** Linear scan instead of the cell grid (moving instances such as balloons). */
  private readonly linear: boolean;
  private readonly frustum = new Frustum();
  visibleCounts: number[] = [];
  trisPerLevel: number[] = [];

  constructor(table: InstanceTable, levels: LodLevelDef[], name: string, cellSize = 256) {
    this.table = table;
    this.linear = cellSize <= 0;
    this.grid = new CellGrid(Math.max(1, cellSize));
    for (let L = 0; L < levels.length; L++) {
      const def = levels[L];
      const geo = new InstancedBufferGeometry();
      geo.index = def.geometry.index;
      for (const key of Object.keys(def.geometry.attributes)) geo.setAttribute(key, def.geometry.attributes[key]);
      const idx = new Float32Array(table.capacity);
      const attr = new InstancedBufferAttribute(idx, 1);
      attr.setUsage(DynamicDrawUsage);
      geo.setAttribute('aIdx', attr);
      geo.instanceCount = 0;
      const mesh = new Mesh(geo, def.material);
      mesh.name = `${name}-lod${L}`;
      mesh.frustumCulled = false;
      mesh.matrixAutoUpdate = false;
      mesh.visible = false;
      mesh.castShadow = !!def.castShadow;
      mesh.receiveShadow = false;
      if (def.depthMaterial) mesh.customDepthMaterial = def.depthMaterial;
      if (def.renderOrder !== undefined) mesh.renderOrder = def.renderOrder;
      this.meshes.push(mesh);
      this.geos.push(geo);
      this.idx.push(idx);
      this.idxAttr.push(attr);
      this.visibleCounts.push(0);
      const triCount = def.geometry.index ? def.geometry.index.count / 3 : def.geometry.attributes.position.count / 3;
      this.trisPerLevel.push(triCount);
    }
  }

  /** Uniform bag for level L (pass into the material patch so shaders read the right band/side). */
  static makeUniforms(table: InstanceTable, side: number): LodUniforms {
    return { uInstTex: { value: table.tex }, uLodBand: { value: new Vector4(0, 0, 1e6, 1e6 + 1) }, uLodSide: { value: side } };
  }

  bindUniforms(levelUniforms: LodUniforms[]): void {
    this.uniforms.length = 0;
    for (const u of levelUniforms) this.uniforms.push(u);
    this.applyBands();
  }

  addTo(parent: Object3D): void {
    for (const m of this.meshes) parent.add(m);
  }

  removeFrom(parent: Object3D): void {
    for (const m of this.meshes) parent.remove(m);
  }

  /** switches.length = levels - 1. */
  setDistances(switches: number[], maxDist: number, fadeFrac: number): void {
    this.switches = switches.slice();
    this.maxDist = maxDist;
    this.fadeFrac = fadeFrac;
    this.applyBands();
  }

  private applyBands(): void {
    const n = this.meshes.length;
    for (let L = 0; L < n && L < this.uniforms.length; L++) {
      const u = this.uniforms[L];
      const lo = L > 0 ? this.switches[L - 1] : 0;
      const hi = L < n - 1 ? this.switches[L] : this.maxDist;
      const bandLo = lo * this.fadeFrac;
      const bandHi = hi * this.fadeFrac;
      // Near side of this level (LOD L>0 fades in over [lo, lo+band]); far side handled either by the next level's
      // complementary ramp (uLodSide 0 path uses in0/in1 of the switch) or by the maxDist fade.
      if (L === 0) {
        // visible where ign >= f, f ramps over the switch band to LOD1
        if (n > 1) u.uLodBand.value.set(hi, hi + bandHi, 1e7, 1e7 + 1);
        else u.uLodBand.value.set(1e7, 1e7 + 1, hi - bandHi, hi);
        u.uLodSide.value = 0;
      } else if (L === n - 1) {
        u.uLodBand.value.set(lo, lo + bandLo, hi - bandHi, hi);
        u.uLodSide.value = 1;
      } else {
        // middle level: fade in over [lo, lo+b], fade out over max band using "out" ramp (approximation, rarely used)
        u.uLodBand.value.set(lo, lo + bandLo, hi, hi + bandHi);
        u.uLodSide.value = 1;
      }
    }
  }

  rebuildSpatial(): void {
    this.grid.build(this.table);
  }

  /** Per-frame: fill index lists. Zero allocations. */
  cull(camera: Camera): void {
    const t = this.table;
    camera.updateMatrixWorld();
    _m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(_m);
    const planes = this.frustum.planes;
    const cam = camera.matrixWorld.elements;
    const px = cam[12], py = cam[13], pz = cam[14];
    const n = this.meshes.length;
    for (let L = 0; L < n; L++) this.visibleCounts[L] = 0;
    const g = this.grid;
    const maxD = this.maxDist;
    const margin = this.cullMargin;
    if (this.linear) {
      for (let i = 0; i < t.count; i++) this.consider(i, planes, px, py, pz, maxD, margin);
    } else for (let c = 0; c < g.keys.length; c++) {
      const dx = g.ccx[c] - px, dy = g.ccy[c] - py, dz = g.ccz[c] - pz;
      const dc = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dc - g.ccr[c] > maxD) continue;
      if (!sphereInFrustum(planes, g.ccx[c], g.ccy[c], g.ccz[c], g.ccr[c] + margin)) continue;
      const s = g.starts[c];
      const e = s + g.counts[c];
      for (let k = s; k < e; k++) this.consider(g.order[k], planes, px, py, pz, maxD, margin);
    }
    for (let L = 0; L < n; L++) {
      const cnt = this.visibleCounts[L];
      const geo = this.geos[L];
      geo.instanceCount = cnt;
      const attr = this.idxAttr[L];
      if (cnt > 0) {
        attr.clearUpdateRanges();
        attr.addUpdateRange(0, cnt);
        attr.needsUpdate = true;
      }
      this.meshes[L].visible = cnt > 0;
    }
  }

  private consider(i: number, planes: Frustum['planes'], px: number, py: number, pz: number, maxD: number, margin: number): void {
    const t = this.table;
    const ix = t.cx[i] - px, iy = t.cy[i] - py, iz = t.cz[i] - pz;
    const d = Math.sqrt(ix * ix + iy * iy + iz * iz);
    if (d > maxD) return;
    if (!sphereInFrustum(planes, t.cx[i], t.cy[i], t.cz[i], t.cr[i] + margin)) return;
    // Which levels see this instance (cross-fade bands overlap).
    const n = this.meshes.length;
    for (let L = 0; L < n; L++) {
      const lo = L > 0 ? this.switches[L - 1] : -1;
      const hi = L < n - 1 ? this.switches[L] * (1 + this.fadeFrac) : maxD;
      if (d >= lo && d <= hi) this.idx[L][this.visibleCounts[L]++] = i;
    }
  }

  /** Make every instance visible on level `L` (dev/turntable use). */
  showAll(L: number): void {
    const n = this.table.count;
    for (let i = 0; i < n; i++) this.idx[L][i] = i;
    this.geos[L].instanceCount = n;
    this.idxAttr[L].needsUpdate = true;
    this.meshes[L].visible = n > 0;
  }

  triangles(): number {
    let s = 0;
    for (let L = 0; L < this.meshes.length; L++) s += this.visibleCounts[L] * this.trisPerLevel[L];
    return s;
  }

  calls(): number {
    let s = 0;
    for (let L = 0; L < this.meshes.length; L++) if (this.visibleCounts[L] > 0) s++;
    return s;
  }

  dispose(): void {
    for (const g of this.geos) g.dispose();
    for (const m of this.meshes) {
      const mat = m.material as Material;
      mat.dispose();
      if (m.customDepthMaterial) m.customDepthMaterial.dispose();
    }
  }
}

export function sphereInFrustum(planes: Frustum['planes'], x: number, y: number, z: number, r: number): boolean {
  for (let p = 0; p < 6; p++) {
    const pl = planes[p];
    if (pl.normal.x * x + pl.normal.y * y + pl.normal.z * z + pl.constant < -r) return false;
  }
  return true;
}
