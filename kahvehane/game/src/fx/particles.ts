// Pişti anı için altın kıvılcım patlaması. Tek Points nesnesi, sabit havuz (oyun sırasında bellek ayırmaz).
import * as THREE from 'three';
import type {Stage} from '../render/stage';

export class Sparks {
  private pos: Float32Array;
  private vel: Float32Array;
  private life: Float32Array;
  private geo = new THREE.BufferGeometry();
  private points: THREE.Points;
  private alive = 0;

  constructor(private stage: Stage, private n: number) {
    this.pos = new Float32Array(n * 3);
    this.vel = new Float32Array(n * 3);
    this.life = new Float32Array(n);
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aLife', new THREE.BufferAttribute(this.life, 1).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {uScale: {value: 1}},
      vertexShader: `attribute float aLife; varying float vL; uniform float uScale;
        void main(){ vL = aLife; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv;
        gl_PointSize = aLife > 0.0 ? (6.0 + 10.0 * aLife) * uScale / -mv.z * 0.12 : 0.0; }`,
      fragmentShader: `varying float vL; void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d); if (r > 0.5) discard;
        float a = smoothstep(0.5, 0.0, r) * vL; gl_FragColor = vec4(mix(vec3(1.0,0.55,0.12), vec3(1.0,0.93,0.65), vL) * a * 1.6, a); }`,
    });
    this.points = new THREE.Points(this.geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 10;
    stage.scene.add(this.points);
    const resize = () => (mat.uniforms.uScale.value = stage.height * stage.renderer.getPixelRatio());
    resize();
    window.addEventListener('resize', resize);
  }

  burst(at: THREE.Vector3, power = 1): void {
    for (let i = 0; i < this.n; i++) {
      const a = Math.random() * Math.PI * 2, up = 0.6 + Math.random() * 1.4, sp = (0.3 + Math.random() * 0.9) * power;
      this.pos[i * 3] = at.x; this.pos[i * 3 + 1] = at.y + 0.01; this.pos[i * 3 + 2] = at.z;
      this.vel[i * 3] = Math.cos(a) * sp; this.vel[i * 3 + 1] = up * power; this.vel[i * 3 + 2] = Math.sin(a) * sp;
      this.life[i] = 0.7 + Math.random() * 0.3;
    }
    this.alive = this.n;
    this.stage.time.addTicker(this.tick);
  }

  private tick = (dt: number): boolean => {
    let alive = 0;
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt * 0.9;
      if (this.life[i] <= 0) { this.life[i] = 0; continue; }
      alive++;
      this.vel[i * 3 + 1] -= 3.2 * dt;
      const drag = 1 - dt * 1.5;
      this.vel[i * 3] *= drag; this.vel[i * 3 + 2] *= drag;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
    }
    this.alive = alive;
    (this.geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geo.attributes.aLife as THREE.BufferAttribute).needsUpdate = true;
    return this.alive > 0;
  };
}
