// Foto Modu controller (integrator): sim frozen (FSM user pause stays on), PhotoCamera orbit around the pilot
// (drag = orbit, wheel/pinch = distance), FOV / roll / EV / filter / grain from the UI, HUD hidden, save through
// the bridge share (host gallery) or a download. In Serbest Uçuş a valid postcard framing collects the postcard.
import * as THREE from 'three';
import { PhotoCamera } from '../../render/camera/PhotoCamera.ts';
import { POSTCARD_RULES, POSTCARDS } from '../../content/meta/postcards.ts';
import { UI } from '../../ui/UI.ts';
import type { PhotoParams, PhotoProps } from '../../ui/types.ts';
import { t } from '../../ui/i18n.ts';
import type { FlightSession } from '../../game/FlightSession.ts';
import type { Game } from '../../game/Game.ts';
import { grabFrame } from '../../game/frameGrab.ts';
import { collectPostcard } from '../../game/progress.ts';
import { postcardAnchors } from './postcards.ts';

const FILTER_MAP: Record<string, string> = { natural: 'natural', golden: 'altin', documentary: 'belgesel', postcard: 'kartpostal', coldMorning: 'mavi', bw: 'siyahBeyaz' };
const _v = new THREE.Vector3();

export class PhotoController {
  private readonly game: Game;
  private readonly session: FlightSession;
  private readonly cam: PhotoCamera;
  private params: PhotoParams = { fov: 50, roll: 0, exposure: 0, focus: 0.3, aperture: 0.2, filter: 'natural', grain: 0, frame: true, logo: true };
  private readonly onExit: () => void;
  private drag: { id: number; x: number; y: number } | null = null;
  private readonly el: HTMLElement;
  private postcard: { id: string; world: PhotoProps['world'] & string; captured: boolean } | null = null;
  private done = false;

  constructor(game: Game, session: FlightSession, onExit: () => void) {
    this.game = game;
    this.session = session;
    this.onExit = onExit;
    const st = session.state;
    this.cam = new PhotoCamera(game.scene.camera, session.opts.world.loaded.sampler);
    this.cam.enter(st.pos[0], st.pos[1], st.pos[2], st.psi);
    this.cam.setFov(this.params.fov);
    session.cameraOverride = () => {
      this.cam.update();
      return true;
    };
    UI.hud.setVisible(false);
    this.el = game.root;
    this.el.addEventListener('pointerdown', this.down, true);
    window.addEventListener('pointermove', this.move);
    window.addEventListener('pointerup', this.up);
    this.el.addEventListener('wheel', this.wheel, { passive: true });
    this.show();
  }

  private show(): void {
    const d = new Date();
    UI.show('photo', {
      params: this.params,
      postcard: this.postcard ? { id: this.postcard.id, world: this.postcard.world, captured: this.postcard.captured } : undefined,
      date: { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() },
      world: this.session.opts.world.id,
    } satisfies PhotoProps);
  }

  private readonly down = (e: PointerEvent): void => {
    const t0 = e.target as Element | null;
    if (t0 && t0.closest && t0.closest('button, input, .kn-panel, .kn-photo-rail, [role="button"]')) return;
    this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };

  private readonly move = (e: PointerEvent): void => {
    const d = this.drag;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    d.x = e.clientX;
    d.y = e.clientY;
    this.cam.orbit(-dx * 0.008, dy * 0.006);
  };

  private readonly up = (e: PointerEvent): void => {
    if (this.drag && this.drag.id === e.pointerId) this.drag = null;
  };

  private readonly wheel = (e: WheelEvent): void => {
    this.cam.setRadius(this.cam.radius * (e.deltaY > 0 ? 1.08 : 0.92));
  };

  change(p: PhotoParams): void {
    this.params = { ...p };
    this.cam.setFov(p.fov);
    this.cam.setRoll(p.roll);
    this.cam.setExposure(p.exposure);
    this.cam.setFilter(FILTER_MAP[p.filter] ?? 'natural');
  }

  render(dt: number): void {
    void dt;
    // postcard framing check (Serbest Uçuş only)
    if (this.session.opts.mode !== 'free') return;
    const cam = this.game.scene.camera;
    const anchors = postcardAnchors(this.session.opts.world);
    let found: string | null = null;
    for (const a of anchors) {
      _v.set(a.pos[0], a.pos[1], a.pos[2]);
      if (cam.position.distanceTo(_v) > POSTCARD_RULES.captureMaxDistM) continue;
      _v.project(cam);
      const c = POSTCARD_RULES.centreFrac;
      if (_v.z < 1 && Math.abs(_v.x) <= c && Math.abs(_v.y) <= c) {
        found = a.id;
        break;
      }
    }
    const cur = this.postcard?.id ?? null;
    if (found !== cur) {
      const pc = found ? POSTCARDS.find((p) => p.id === found) : null;
      this.postcard = pc ? { id: pc.id, world: pc.world, captured: this.game.profile.postcards.includes(pc.id) } : null;
      UI.update('photo', { params: this.params, postcard: this.postcard ?? undefined, world: this.session.opts.world.id });
    }
  }

  async save(): Promise<void> {
    this.game.audio.event({ type: 'photo' });
    const frame = grabFrame(this.game, 1440);
    if (!frame) return;
    const ctx = frame.getContext('2d');
    if (ctx && this.params.grain > 0) {
      const n = Math.round(frame.width * frame.height * 0.02 * this.params.grain);
      for (let i = 0; i < n; i++) {
        const v = Math.random() * 255;
        ctx.fillStyle = `rgba(${v},${v},${v},0.12)`;
        ctx.fillRect(Math.random() * frame.width, Math.random() * frame.height, 1.5, 1.5);
      }
    }
    if (ctx && (this.params.frame || this.params.logo)) {
      const w = frame.width;
      const h = frame.height;
      if (this.params.frame) {
        ctx.strokeStyle = 'rgba(255,247,234,0.85)';
        ctx.lineWidth = Math.max(2, w * 0.004);
        ctx.strokeRect(w * 0.03, h * 0.03, w * 0.94, h * 0.94);
      }
      if (this.params.logo) {
        ctx.fillStyle = 'rgba(255,247,234,0.92)';
        ctx.font = `700 ${Math.round(w * 0.04)}px "Barlow Condensed", sans-serif`;
        ctx.textAlign = 'right';
        ctx.fillText('K A N A T', w * 0.94, h * 0.93);
      }
    }
    const url = frame.toDataURL('image/jpeg', 0.9);
    // postcard capture (Serbest Uçuş)
    if (this.postcard && !this.postcard.captured) {
      const d = collectPostcard(this.game.profile, this.game.metaDoc, this.postcard.id, Date.now());
      this.postcard.captured = true;
      this.game.saveProgress();
      UI.toast(t('photo.postcardGot' as never) || '✓', { icon: 'postcard' });
      if (d.cosmetics.length) this.game.audio.event({ type: 'reward' });
    } else {
      this.game.metaDoc.photosSaved++;
      this.game.saveProgress();
    }
    const res = await this.game.app.bridge.share({ text: 'KANAT', imageDataUrl: url, mimeType: 'image/jpeg' } as never, 'kanat-foto.jpg');
    if (res.method === 'download' && res.downloadUrl) {
      const a = document.createElement('a');
      a.href = res.downloadUrl;
      a.download = 'kanat-foto.jpg';
      a.click();
    } else if (res.method === 'clipboard' || res.method === 'none') {
      const a = document.createElement('a');
      a.href = url;
      a.download = 'kanat-foto.jpg';
      a.click();
    }
  }

  exit(): void {
    if (this.done) return;
    this.done = true;
    this.cam.exit();
    this.session.cameraOverride = null;
    this.el.removeEventListener('pointerdown', this.down, true);
    window.removeEventListener('pointermove', this.move);
    window.removeEventListener('pointerup', this.up);
    this.el.removeEventListener('wheel', this.wheel);
    UI.close('photo');
    UI.hud.setVisible(true);
    this.session.follow.reset();
    this.onExit();
  }
}
