// Cloud impostors and the Karadeniz cloud sea.
import * as THREE from 'three';
import type { RenderTierParams } from '../Renderer.ts';

export interface CloudsOptions {
  worldId: string;
  coverage: number;
  tint: string;
  seaBottom: number | null;
  seaTop: number | null;
  minY: number;
  maxY: number;
  extent: number;
}

export class Clouds {
  readonly object = new THREE.Group();
  constructor(_renderer: THREE.WebGLRenderer, _params: RenderTierParams, _opts: CloudsOptions) {
    this.object.name = 'kanat-clouds';
  }
  update(_time: number, _camera: THREE.Camera): void {}
  dispose(): void {}
}
