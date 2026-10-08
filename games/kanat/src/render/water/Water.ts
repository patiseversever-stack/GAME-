// Water surfaces (Likya sea, Pamukkale mirror pools).
import * as THREE from 'three';
import type { RenderTierParams } from '../Renderer.ts';
import type { TerrainData } from '../terrain/TerrainData.ts';

export interface WaterOptions {
  kind: 'sea' | 'pools';
  level: number;
  shallow: string;
  deep: string;
  foam: string;
  terrain: TerrainData;
  pools: { x: number; z: number; y: number; r: number }[];
  skyCube: THREE.Texture;
}

export class Water {
  readonly object = new THREE.Group();
  constructor(_renderer: THREE.WebGLRenderer, _params: RenderTierParams, _opts: WaterOptions) {
    this.object.name = 'kanat-water';
  }
  update(_time: number, _camera: THREE.Camera): void {}
  dispose(): void {}
}
