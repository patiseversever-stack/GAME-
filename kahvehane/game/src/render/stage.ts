// Renderer, sahne, kamera, ışıklar ve "gerektiğinde çiz" döngüsü.
// Hiçbir şey hareket etmiyorsa kare çizilmez: pil ve ısınma dostu, düşük cihazda takılma yok.
import * as THREE from 'three';
import {Timeline, clamp} from '../fx/anim';
import type {Quality} from '../quality';

export interface CameraRig {
  pos: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
}

export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly time = new Timeline();
  readonly rig: CameraRig;
  readonly lamp: THREE.SpotLight;
  private raf = 0;
  private last = 0;
  private dpr: number;
  private trauma = 0;
  private fovKick = 0;
  private shakeSeed = Math.random() * 100;
  private frameTimes: number[] = [];
  private updaters: ((dt: number, realDt: number) => void)[] = [];
  private renderHooks: (() => void)[] = [];
  /** Sürekli çizim isteyen kaynak sayısı (ör. sürükleme) */
  private holds = 0;
  width = 1;
  height = 1;

  constructor(private host: HTMLElement, readonly q: Quality, rig: CameraRig) {
    this.rig = {pos: rig.pos.clone(), target: rig.target.clone(), fov: rig.fov};
    this.renderer = new THREE.WebGLRenderer({antialias: q.antialias && !location.search.includes('aa=0'), powerPreference: 'high-performance', alpha: false, stencil: false});
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.dpr = Math.min(q.maxDpr, window.devicePixelRatio || 1);
    this.renderer.setPixelRatio(this.dpr);
    host.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.touchAction = 'none';

    this.scene.background = new THREE.Color(0x0f0906);
    this.camera = new THREE.PerspectiveCamera(rig.fov, 1, 0.05, 30);

    // Işıklar: tavandan sarkan sıcak lamba + oda dolgusu + arka kontur
    this.lamp = new THREE.SpotLight(0xffc68a, 9, 4, 0.98, 0.9, 2);
    this.lamp.position.set(0, 1.62, -0.1);
    this.lamp.target.position.set(0, 0.74, -0.06);
    this.scene.add(this.lamp, this.lamp.target);
    this.scene.add(new THREE.HemisphereLight(0xffdcb4, 0x261309, 0.55));
    const rim = new THREE.DirectionalLight(0x9db5ff, 0.55);
    rim.position.set(0.8, 1.8, -2.2);
    this.scene.add(rim);
    const fill = new THREE.DirectionalLight(0xffe0bc, 0.25);
    fill.position.set(0.3, 1.6, 1.6);
    this.scene.add(fill);

    this.time.onActive = () => this.invalidate();
    window.addEventListener('resize', () => this.resize());
    window.visualViewport?.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.last = 0;
        this.invalidate();
      }
    });
    this.resize();
  }

  onUpdate(fn: (dt: number, realDt: number) => void): void {
    this.updaters.push(fn);
  }
  onRender(fn: () => void): void {
    this.renderHooks.push(fn);
  }

  /** Bir sonraki kareyi iste. */
  invalidate(): void {
    if (this.raf) return;
    this.raf = requestAnimationFrame(this.frame);
  }
  /** Sürekli çizim aç/kapa (sürükleme sırasında). */
  hold(on: boolean): void {
    this.holds = Math.max(0, this.holds + (on ? 1 : -1));
    this.invalidate();
  }

  shake(amount: number): void {
    this.trauma = clamp(this.trauma + amount, 0, 1);
    this.invalidate();
  }
  kickFov(deg: number): void {
    this.fovKick += deg;
    this.invalidate();
  }

  resize(): void {
    const w = this.host.clientWidth || window.innerWidth, h = this.host.clientHeight || window.innerHeight;
    this.width = w;
    this.height = h;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = w + 'px';
    this.renderer.domElement.style.height = h + 'px';
    this.camera.aspect = w / h;
    this.applyCamera();
    this.invalidate();
  }

  /** Yatay ekranda tasarlanan kadrajı korur; dar ekranda görüş açısını genişletir. */
  private baseFov(): number {
    const a = this.camera.aspect, design = 2.0;
    if (a >= design) return this.rig.fov;
    const hHalf = Math.tan(THREE.MathUtils.degToRad(this.rig.fov / 2)) * design;
    return THREE.MathUtils.radToDeg(2 * Math.atan(hHalf / a));
  }

  private applyCamera(): void {
    const c = this.camera;
    c.position.copy(this.rig.pos);
    c.lookAt(this.rig.target);
    if (this.trauma > 0) {
      const s = this.trauma * this.trauma, t = performance.now() / 1000 + this.shakeSeed;
      const n = (f: number, p: number) => Math.sin(t * f + p) * 0.6 + Math.sin(t * f * 2.13 + p * 1.7) * 0.4;
      c.position.x += n(37, 1) * 0.012 * s;
      c.position.y += n(41, 2) * 0.012 * s;
      c.rotateZ(n(29, 3) * 0.025 * s);
      c.rotateX(n(33, 4) * 0.012 * s);
    }
    c.fov = this.baseFov() + this.fovKick;
    c.updateProjectionMatrix();
  }

  private frame = (now: number) => {
    this.raf = 0;
    const realDt = this.last ? Math.min(DT_CAP, (now - this.last) / 1000) : 1 / 60;
    this.last = now;
    this.time.step(realDt);
    const dt = realDt * this.time.timeScale;
    for (const u of this.updaters) u(dt, realDt);
    if (this.trauma > 0) this.trauma = Math.max(0, this.trauma - realDt * 1.6);
    if (this.fovKick !== 0) this.fovKick = Math.abs(this.fovKick) < 0.02 ? 0 : this.fovKick * Math.exp(-realDt * 7);
    this.applyCamera();
    for (const h of this.renderHooks) h();
    this.renderer.render(this.scene, this.camera);
    this.adapt(realDt);
    if (this.time.busy || this.holds > 0 || this.trauma > 0 || this.fovKick !== 0) this.invalidate();
    else this.last = 0;
  };

  /** Uyarlamalı çözünürlük: sürekli animasyon sırasında kare süresi uzarsa DPR'yi düşür. */
  private adapt(realDt: number): void {
    if (!this.time.busy && this.holds === 0) {
      this.frameTimes.length = 0;
      return;
    }
    this.frameTimes.push(realDt);
    if (this.frameTimes.length < 45) return;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.frameTimes.length = 0;
    let next = this.dpr;
    if (avg > 1 / 40) next = Math.max(this.q.minDpr, this.dpr - 0.2);
    else if (avg < 1 / 58 && this.dpr < Math.min(this.q.maxDpr, window.devicePixelRatio || 1)) next = Math.min(this.q.maxDpr, this.dpr + 0.1);
    if (Math.abs(next - this.dpr) > 0.01) {
      this.dpr = next;
      this.renderer.setPixelRatio(next);
      this.renderer.setSize(this.width, this.height, false);
    }
  }

  /** Dünya noktasını ekran pikseline çevirir (HUD etiketleri için). */
  project(p: THREE.Vector3, out: {x: number; y: number}): void {
    const v = tmpV.copy(p).project(this.camera);
    out.x = (v.x * 0.5 + 0.5) * this.width;
    out.y = (-v.y * 0.5 + 0.5) * this.height;
  }
}
const tmpV = new THREE.Vector3();
// Test için: yazılımsal çizimde gerçek zamanı takip et (?dtcap=0.4)
const DT_CAP = +(new URLSearchParams(location.search).get('dtcap') ?? 0.05);
