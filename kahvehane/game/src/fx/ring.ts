// Pişti anında çuhada genişleyen altın ışık halkası (tek mesh, toplamsal karışım).
import * as THREE from 'three';
import type {Stage} from '../render/stage';
import {TABLE} from '../game/layout';

export class Shockwave {
  private mesh: THREE.Mesh;
  private mat: THREE.ShaderMaterial;
  private t = 1;

  constructor(private stage: Stage) {
    this.mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {uT: {value: 1}},
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `varying vec2 vUv; uniform float uT;
        void main(){ float r = length(vUv - 0.5) * 2.0; float edge = mix(0.15, 0.95, uT);
        float ring = smoothstep(edge - 0.16, edge, r) * (1.0 - smoothstep(edge, edge + 0.04, r));
        float glow = (1.0 - smoothstep(0.0, edge, r)) * 0.25 * (1.0 - uT);
        float a = (ring + glow) * (1.0 - uT);
        gl_FragColor = vec4(vec3(1.0, 0.82, 0.45) * a * 1.4, a); }`,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), this.mat);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.y = TABLE.y + 0.001;
    this.mesh.visible = false;
    this.mesh.renderOrder = 1;
    stage.scene.add(this.mesh);
  }

  fire(at: THREE.Vector3, size = 1): void {
    this.mesh.position.x = at.x;
    this.mesh.position.z = at.z;
    this.mesh.scale.setScalar(size);
    this.mesh.visible = true;
    this.t = 0;
    this.stage.time.addTicker(this.tick);
  }

  private tick = (_dt: number, realDt: number): boolean => {
    this.t = Math.min(1, this.t + realDt / 0.9);
    this.mat.uniforms.uT.value = this.t;
    if (this.t >= 1) this.mesh.visible = false;
    return this.t < 1;
  };
}
