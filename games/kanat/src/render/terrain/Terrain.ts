// CDLOD terrain renderer: ONE instanced draw call for the whole core + far ring (heights from both R32F grids in
// the vertex shader, core preferred inside its extent exactly like the CPU sampler).
import * as THREE from 'three';
import type { RenderTierParams } from '../Renderer.ts';
import { hexToLinear } from '../color.ts';
import { CdlodSelector, frustumPlanesFrom, type QuadtreeLayout } from './Quadtree.ts';
import { DetailTextures, LAYER_BUMP, LAYER_KIND_INDEX, LAYER_TILE_M, layerKind, type LayerKind } from './DetailTextures.ts';
import { createTerrainMaterial, MAX_TERRAIN_LEVELS } from './TerrainMaterial.ts';
import type { TerrainData } from './TerrainData.ts';

export const LOD0_SPACING = 1.5;
const SKIRT_DEPTH = 30;
const HORIZON_SKIRT = 600;

/** Shared node grid: N×N vertices in [0,1]² (position.y = 0) + outward skirt walls (position.y = 1). */
export function buildNodeGeometry(N: number, maxInstances: number): THREE.InstancedBufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];
  const q = N - 1;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) pos.push(i / q, 0, j / q);
  const at = (i: number, j: number) => j * N + i;
  for (let j = 0; j < q; j++) {
    for (let i = 0; i < q; i++) {
      const a = at(i, j);
      const b = at(i, j + 1);
      const c = at(i + 1, j);
      const d = at(i + 1, j + 1);
      idx.push(a, b, c, c, b, d);
    }
  }
  // Skirts: duplicate edge vertices with y = 1; walls face outward.
  const edges: { verts: number[]; out: [number, number] }[] = [
    { verts: Array.from({ length: N }, (_, i) => at(i, 0)), out: [0, -1] },
    { verts: Array.from({ length: N }, (_, i) => at(i, q)), out: [0, 1] },
    { verts: Array.from({ length: N }, (_, j) => at(0, j)), out: [-1, 0] },
    { verts: Array.from({ length: N }, (_, j) => at(q, j)), out: [1, 0] },
  ];
  for (const e of edges) {
    const base = pos.length / 3;
    for (const v of e.verts) pos.push(pos[v * 3], 1, pos[v * 3 + 2]);
    for (let k = 0; k < N - 1; k++) {
      const a = e.verts[k];
      const b = e.verts[k + 1];
      const a2 = base + k;
      const b2 = base + k + 1;
      // Outward test: normal of (a, b, a') with skirt going down.
      const ax = pos[a * 3], az = pos[a * 3 + 2];
      const bx = pos[b * 3], bz = pos[b * 3 + 2];
      // (b - a) × (down) = (bx-ax, 0, bz-az) × (0,-1,0) = ( (bz-az), 0, -(bx-ax) )
      const nx = bz - az;
      const nz = -(bx - ax);
      if (nx * e.out[0] + nz * e.out[1] > 0) idx.push(a, b, a2, b, b2, a2);
      else idx.push(b, a, a2, b2, b, a2);
    }
  }
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  const inst = new THREE.InstancedBufferAttribute(new Float32Array(maxInstances * 4), 4);
  inst.setUsage(THREE.DynamicDrawUsage);
  g.setAttribute('aNode', inst);
  g.instanceCount = 0;
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e9);
  return g;
}

// Semantic affinity (flat, steep, mid-slope, high) per material kind → automatic splat rules when the baked splat
// is unavailable. Columns of the resulting mat4 = semantic classes, rows = layers.
const AFFINITY: Record<LayerKind, [number, number, number, number]> = {
  tuff: [0.35, 1.0, 0.7, 0.6],
  rock: [0.05, 0.9, 0.35, 0.7],
  grass: [1.0, 0.0, 0.6, 0.15],
  soil: [0.7, 0.05, 0.5, 0.1],
  snow: [0.6, 0.1, 0.5, 1.0],
  travertine: [0.9, 0.3, 0.6, 0.4],
  forest: [0.4, 0.05, 1.0, 0.05],
  sand: [0.9, 0.0, 0.1, 0.0],
};

export function autoSplatMap(kinds: LayerKind[], out: THREE.Matrix4): THREE.Matrix4 {
  const e = out.elements;
  for (let sem = 0; sem < 4; sem++) {
    const sc = kinds.map((k) => AFFINITY[k][sem]);
    const mx = Math.max(...sc, 1e-3);
    // Keep only strong candidates so detail patterns stay legible.
    const w = sc.map((v) => (v >= mx * 0.6 ? v : 0));
    const sum = w.reduce((a, b) => a + b, 0) || 1;
    for (let l = 0; l < 4; l++) e[sem * 4 + l] = w[l] / sum;
  }
  return out;
}

export interface TerrainLayerSpec {
  ids: string[];
  colors: string[];
}

export class TerrainRenderer {
  readonly mesh: THREE.Mesh<THREE.InstancedBufferGeometry, THREE.ShaderMaterial>;
  readonly layout: QuadtreeLayout;
  readonly selector: CdlodSelector;
  readonly detail: DetailTextures;
  readonly kinds: LayerKind[];
  private params: RenderTierParams;
  private readonly data: TerrainData;
  private readonly planes = new Float64Array(24);
  private readonly pv = new THREE.Matrix4();
  private readonly maxInstances = 4096;
  private readonly gridN: number;

  constructor(renderer: THREE.WebGLRenderer, data: TerrainData, params: RenderTierParams, layers: TerrainLayerSpec) {
    this.data = data;
    this.params = params;
    const N = params.terrain.grid;
    this.gridN = N;
    const nodeBase = (N - 1) * LOD0_SPACING;
    const far = data.terrain.far;
    const farExt = (far.res - 1) * far.spacing;
    let levels = 1;
    while (nodeBase * Math.pow(2, levels - 1) < farExt) levels++;
    levels = Math.min(levels, MAX_TERRAIN_LEVELS);
    const rootSize = nodeBase * Math.pow(2, levels - 1);
    this.layout = { rootMinX: far.originX, rootMinZ: far.originZ, rootSize, levels };
    this.selector = new CdlodSelector(this.layout, data.bounds, this.maxInstances, 4);
    this.selector.setRanges(params.terrain.lod0Radius);

    this.kinds = layers.ids.slice(0, 4).map(layerKind);
    while (this.kinds.length < 4) this.kinds.push('rock');
    this.detail = new DetailTextures(renderer, this.kinds, 512, params.anisotropy);

    const geo = buildNodeGeometry(N, this.maxInstances);
    const mat = createTerrainMaterial({ projection: params.terrain.projection, vertexFog: params.level === 0 });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.name = 'kanat-terrain';
    this.mesh.frustumCulled = false;
    this.mesh.matrixAutoUpdate = false;
    this.mesh.renderOrder = -10;
    const u = mat.uniforms;
    u.uGridQuads.value = N - 1;
    u.uHCore.value = data.hCore;
    u.uHFar.value = data.hFar;
    u.uRock.value = data.rock;
    u.uNCore.value = data.nCore;
    u.uNFar.value = data.nFar;
    u.uSplat.value = data.splat;
    u.uShadowAo.value = data.shadowAo;
    u.uMacro.value = data.colorMacro;
    u.uFarColor.value = data.colorFar;
    u.uDetail.value = this.detail.texture;
    (u.uCoreGrid.value as THREE.Vector4).copy(data.coreGrid);
    (u.uFarGrid.value as THREE.Vector4).copy(data.farGrid);
    (u.uCovCore.value as THREE.Vector4).copy(data.covCore);
    (u.uCovFar.value as THREE.Vector4).copy(data.covFar);
    (u.uRoot.value as THREE.Vector4).set(this.layout.rootMinX, this.layout.rootMinZ, rootSize, HORIZON_SKIRT);
    (u.uTFlags.value as THREE.Vector4).set(SKIRT_DEPTH, data.has.splat ? 1 : 0, 1, 0);
    (u.uHas.value as THREE.Vector4).set(data.has.shadowAo ? 1 : 0, data.has.macro ? 1 : 0, data.has.far ? 1 : 0, 0);
    const rule = u.uSplatRule.value as THREE.Vector4;
    rule.set(0.16, 0.4, data.minY + (data.maxY - data.minY) * 0.82, data.minY + (data.maxY - data.minY) * 0.95);
    const cols = u.uLayerCol.value as THREE.Color[];
    const lp = u.uLayerP.value as THREE.Vector4[];
    const tmp = [0, 0, 0];
    for (let i = 0; i < 4; i++) {
      hexToLinear(layers.colors[i] ?? '#888888', tmp);
      cols[i].setRGB(tmp[0], tmp[1], tmp[2], THREE.LinearSRGBColorSpace);
      const k = this.kinds[i];
      lp[i].set(LAYER_TILE_M[k], LAYER_BUMP[k], LAYER_KIND_INDEX[k], 0.85);
    }
    autoSplatMap(this.kinds, u.uSplatMap.value as THREE.Matrix4);
    u.uSplatVar.value = this.kinds[0] === this.kinds[1] ? 1 : 0;
    this.applyMorph();
  }

  /** Use an externally baked shadow/AO texture (R = sun visibility, G = AO) over the core coverage. */
  setShadowTexture(t: THREE.Texture | null): void {
    const u = this.mesh.material.uniforms;
    u.uShadowAo.value = t ?? this.data.shadowAo;
    (u.uHas.value as THREE.Vector4).x = t ? 1 : this.data.has.shadowAo ? 1 : 0;
  }

  /** Pre-lit macro exposure scale and sky weight of the near relight ratio. */
  setPrelit(scale: number, skyWeight: number): void {
    (this.mesh.material.uniforms.uPrelit.value as THREE.Vector4).set(scale, skyWeight, 0, 0);
  }

  /** Kapadokya tuff strata (world-y banding). */
  setStrata(period: number, strength: number, roseMix: number): void {
    (this.mesh.material.uniforms.uStrata.value as THREE.Vector4).set(period, strength, roseMix, 0);
  }

  setDebugMagenta(on: boolean): void {
    (this.mesh.material.uniforms.uTDebug.value as THREE.Vector4).x = on ? 1 : 0;
  }

  private applyMorph(): void {
    const m = this.mesh.material.uniforms.uMorph.value as THREE.Vector4[];
    const r = this.selector.ranges;
    for (let l = 0; l < MAX_TERRAIN_LEVELS; l++) {
      const range = l < r.length ? r[l] : 1e9;
      const start = range * 0.72;
      const end = range * 0.97;
      m[l].set(start, 1 / Math.max(1e-3, end - start), 0, 0);
    }
    const dp = this.mesh.material.uniforms.uDetailP.value as THREE.Vector4;
    dp.x = this.params.terrain.detailFar * 0.6;
    dp.y = this.params.terrain.detailFar;
  }

  /** CPU selection + instance upload. Call once per frame before rendering (camera matrices updated). */
  update(camera: THREE.Camera): void {
    camera.updateMatrixWorld();
    this.pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustumPlanesFrom(this.pv.elements, this.planes);
    const p = camera.position;
    const n = this.selector.select(p.x, p.y, p.z, this.planes, this.params.terrain.viewDistance);
    const geo = this.mesh.geometry;
    const attr = geo.getAttribute('aNode') as THREE.InstancedBufferAttribute;
    (attr.array as Float32Array).set(this.selector.instances.subarray(0, n * 4));
    attr.clearUpdateRanges();
    attr.addUpdateRange(0, n * 4);
    attr.needsUpdate = true;
    geo.instanceCount = n;
  }

  get nodeCount(): number {
    return this.selector.count;
  }

  get trianglesPerNode(): number {
    const q = this.gridN - 1;
    return q * q * 2 + 4 * q * 2;
  }

  textures(): THREE.Texture[] {
    return [this.detail.texture];
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.detail.dispose();
  }
}
