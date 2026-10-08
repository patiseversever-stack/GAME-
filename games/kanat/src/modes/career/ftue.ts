// FTUE director (integrator) — plays the §1 "first impression film" beats from src/content/meta/ftue.ts on W1·R1:
// black → dawn flicker on the glove at the basket rail → pull back over the balloons with a small "KANAT"
// wordmark → pulsing thumb + "Atla" (re-pulses every 4 s) → any tap after 1.5 s jumps → staged HUD reveal
// (pause, gate arrow, proximity ring, score, altitude + parachute) → drag / parachute / flare hints → landing.
// Audio follows K-22: nothing is forced; the jump tap unlocks it and the freefall wind is the first sound.
import * as THREE from 'three';
import { FTUE_BEATS, FTUE_RULES, type FtueBeat, type HudElement } from '../../content/meta/ftue.ts';
import type { SimEvent } from '../../sim/types.ts';
import { UI } from '../../ui/UI.ts';
import type { FtueKind } from '../../ui/hud/FlightHud.ts';
import type { FlightSession } from '../../game/FlightSession.ts';
import type { Game } from '../../game/Game.ts';

const HUD_SELECTORS: Record<HudElement, string> = {
  pause: '.kn-hud-pause',
  gateArrow: '.kn-hud-arrow',
  proxRing: '.kn-hud-ring',
  multLabel: '.kn-ring-mult',
  comboBar: '.kn-ring-combo',
  score: '.kn-hud-top',
  altitude: '.kn-hud-alt',
  landingMarker: '.kn-alt-target',
  parachuteButton: '.kn-hud-chute',
  speed: '.kn-hud-speed',
};

const STYLE_ID = 'kanat-ftue-style';

function installStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const css = Object.entries(HUD_SELECTORS)
    .map(([k, sel]) => `.kn-hud.kn-ftue-staged:not(.r-${k}) ${sel}{opacity:0!important;pointer-events:none!important;transition:opacity .6s}`)
    .join('\n');
  const st = document.createElement('style');
  st.id = STYLE_ID;
  st.textContent = `${css}
.kn-hud.kn-ftue-staged ${Object.values(HUD_SELECTORS).join(', .kn-hud.kn-ftue-staged ')}{transition:opacity .6s}
.kanat-film{position:absolute;inset:0;pointer-events:none;z-index:5}
.kanat-film-black{position:absolute;inset:0;background:#05070a;transition:opacity 1.1s ease}
.kanat-film-logo{position:absolute;left:0;right:0;top:calc(var(--safe-top,0px) + 18vh);text-align:center;opacity:0;transition:opacity 1s ease;font-family:var(--kn-font-display);font-weight:700;letter-spacing:.42em;padding-left:.42em;font-size:30px;color:#fff7ea;text-shadow:0 2px 18px rgba(0,0,0,.35)}
.kanat-film-logo.is-on{opacity:.92}`;
  document.head.appendChild(st);
}

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _hand = new THREE.Vector3();
const _handR = new THREE.Vector3();

export class FtueDirector {
  private readonly game: Game;
  private session: FlightSession | null = null;
  private readonly fired = new Set<string>();
  private readonly revealed = new Set<HudElement>();
  private overlay: HTMLElement | null = null;
  private black: HTMLElement | null = null;
  private logo: HTMLElement | null = null;
  private filmT = 0;
  private promptAt = -1;
  private jumped = false;
  private camFrom = new THREE.Vector3();
  private hint: FtueKind | null = null;

  constructor(game: Game) {
    this.game = game;
    installStyle();
  }

  attach(s: FlightSession): void {
    this.session = s;
    s.ftueHint = null;
    const hud = UI.hud.el;
    hud.classList.add('kn-ftue-staged');
    for (const k of Object.keys(HUD_SELECTORS)) hud.classList.remove(`r-${k}`);
    // film overlay (black + wordmark) above the canvas, under the UI
    const ov = document.createElement('div');
    ov.className = 'kanat-film';
    const black = document.createElement('div');
    black.className = 'kanat-film-black';
    const logo = document.createElement('div');
    logo.className = 'kanat-film-logo';
    logo.textContent = 'KANAT';
    ov.append(black, logo);
    this.game.root.insertBefore(ov, this.game.root.children[1] ?? null);
    this.overlay = ov;
    this.black = black;
    this.logo = logo;
  }

  private reveal(list: readonly HudElement[] | undefined): void {
    if (!list) return;
    const hud = UI.hud.el;
    for (const k of list) {
      this.revealed.add(k);
      hud.classList.add(`r-${k}`);
    }
  }

  private fire(b: FtueBeat): void {
    if (this.fired.has(b.id)) return;
    this.fired.add(b.id);
    this.reveal(b.reveal);
    if (b.id === 'jumpPrompt') this.promptAt = this.filmT;
    if (b.prompt) {
      const map: Record<string, FtueKind> = { pulse: 'jump', dragLeft: 'drag', dragHorizontal: 'drag', tap: 'parachute', dragDown: 'flare' };
      this.setHint(map[b.prompt.thumb] ?? null);
    }
    this.game.app.bridge.analytics('ftue_beat', { id: b.id, t: Math.round(this.filmT * 10) / 10 });
  }

  private setHint(k: FtueKind | null): void {
    this.hint = k;
    if (this.session) this.session.ftueHint = k;
  }

  // ---- film (before the jump) ----------------------------------------------------------------------

  filmUpdate(t: number, dt: number, s: FlightSession): 'film' | 'ready' | 'jump' {
    this.filmT = t;
    for (const b of FTUE_BEATS) if (b.trigger.kind === 'film' && t >= b.trigger.t) this.fire(b);
    // black → dawn flicker
    if (this.black) this.black.style.opacity = t < 0.3 ? '1' : '0';
    if (this.logo) this.logo.classList.toggle('is-on', t > 1.9 && t < 3.9);
    this.filmCamera(t, s);
    // "Atla" re-pulse every 4 s while waiting
    if (this.promptAt >= 0 && t - this.promptAt > 4) {
      this.promptAt = t;
      UI.hud.ftue(null);
      window.setTimeout(() => {
        if (!this.jumped) UI.hud.ftue('jump');
      }, 60);
    }
    void dt;
    return this.promptAt >= 0 ? 'ready' : 'film';
  }

  onIntroTap(t: number, s: FlightSession): boolean {
    if (t < FTUE_RULES.inputAcceptedFromSec) return true; // swallow early taps
    this.jumpNow(s);
    return true;
  }

  private jumpNow(s: FlightSession): void {
    if (this.jumped) return;
    this.jumped = true;
    if (this.black) this.black.style.opacity = '0';
    if (this.logo) this.logo.classList.remove('is-on');
    this.setHint(null);
    for (const b of FTUE_BEATS) if (b.trigger.kind === 'event' && b.trigger.event === 'jumpTap') this.fire(b);
    void this.game.audio.unlock();
    s.jump();
  }

  private filmCamera(t: number, s: FlightSession): void {
    const cam = s.scene.camera;
    const r = s.route;
    const p = r.start.pos;
    const hd = (r.start.headingDeg * Math.PI) / 180;
    const fx = Math.sin(hd);
    const fz = -Math.cos(hd);
    // right vector (cos ψ, 0, sin ψ)
    const rx = Math.cos(hd);
    const rz = Math.sin(hd);
    s.scene.pilot.getWingtips(_hand, _handR);
    if (!(_hand.lengthSq() > 0)) _hand.set(p[0], p[1] + 1, p[2]);
    const sampler = s.opts.world.loaded.sampler;
    if (t < 1.5) {
      // glove on the basket rail, close-up, slow breathing drift
      const k = t / 1.5;
      _a.set(_hand.x - rx * 0.55 - fx * 0.35, _hand.y + 0.22 + k * 0.05, _hand.z - rz * 0.55 - fz * 0.35);
      cam.position.copy(_a);
      cam.up.set(0, 1, 0);
      cam.lookAt(_hand.x + fx * 0.4, _hand.y - 0.05, _hand.z + fz * 0.4);
      cam.fov = 38;
      this.camFrom.copy(_a);
    } else if (t < 3.3) {
      // pull back and up: ~40 balloons, valleys, gold mist
      const k = ease((t - 1.5) / 1.8);
      _b.set(p[0] - fx * 70 + rx * 34, p[1] + 26, p[2] - fz * 70 + rz * 34);
      _a.copy(this.camFrom).lerp(_b, k);
      cam.position.copy(_a);
      cam.up.set(0, 1, 0);
      _c.set(p[0] + fx * 260, p[1] - 60, p[2] + fz * 260);
      _c.lerp(_hand, 1 - k);
      cam.lookAt(_c);
      cam.fov = 38 + 22 * k;
    } else {
      // glide in over the shoulder for the jump
      const k = ease(Math.min(1, (t - 3.3) / 1.6));
      _b.set(p[0] - fx * 70 + rx * 34, p[1] + 26, p[2] - fz * 70 + rz * 34);
      _a.set(p[0] - fx * 9 + rx * 2.5, p[1] + 3.8, p[2] - fz * 9 + rz * 2.5);
      cam.position.copy(_b).lerp(_a, k);
      cam.up.set(0, 1, 0);
      _c.set(p[0] + fx * 160, p[1] - 70, p[2] + fz * 160);
      cam.lookAt(_c);
      cam.fov = 60 + 6 * k;
    }
    const g = sampler.height(cam.position.x, cam.position.z) + 1.5;
    if (cam.position.y < g) cam.position.y = g;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
  }

  // ---- flight (after the jump) ---------------------------------------------------------------------------

  onEvent(e: SimEvent, s: FlightSession): void {
    const map: Partial<Record<SimEvent['type'], string>> = { gate: 'gate', graze: 'graze', balloonThread: 'balloonThread', enterLandingZone: 'landingZone', parachuteOpen: 'canopyOpen', landed: 'landed' };
    const ev = map[e.type];
    if (!ev) return;
    for (const b of FTUE_BEATS) if (b.trigger.kind === 'event' && b.trigger.event === ev) this.fire(b);
    if (e.type === 'gate' && this.hint === 'drag') this.setHint(null);
    if (e.type === 'landed') {
      this.setHint(null);
      s.ftueHint = null;
    }
  }

  render(dt: number, s: FlightSession): void {
    void dt;
    if (!this.jumped && s.phase === 'flight') {
      // jumped through the test API / bot
      this.jumped = true;
      if (this.black) this.black.style.opacity = '0';
      if (this.logo) this.logo.classList.remove('is-on');
      this.setHint(null);
      for (const b of FTUE_BEATS) if (b.trigger.kind === 'event' && b.trigger.event === 'jumpTap') this.fire(b);
    }
    if (!this.jumped) return;
    const st = s.state;
    for (const b of FTUE_BEATS) {
      if (this.fired.has(b.id)) continue;
      if (b.trigger.kind === 'sim' && st.timeSec >= b.trigger.t && st.phase === 'flying') this.fire(b);
      if (b.trigger.kind === 'agl' && (st.phase === 'canopy' || st.phase === 'halfFlight') && st.heightAGL < b.trigger.below + 1) this.fire(b);
    }
    // the drag hint fades once the first gate is lined up or after 4 s
    if (this.hint === 'drag' && st.phase === 'flying' && st.timeSec > 6) this.setHint(null);
    if (this.hint === 'parachute' && st.canopyOpen) this.setHint('drag');
    if (this.hint === 'drag' && st.canopyOpen && st.heightAGL < 4) this.setHint('flare');
    if (this.hint === 'flare' && st.phase === 'landed') this.setHint(null);
  }

  state(): Record<string, unknown> {
    return { beats: [...this.fired], hud: [...this.revealed], hint: this.hint, jumped: this.jumped };
  }

  dispose(): void {
    this.overlay?.remove();
    this.overlay = null;
    const hud = UI.hud.el;
    hud.classList.remove('kn-ftue-staged');
    for (const k of Object.keys(HUD_SELECTORS)) hud.classList.remove(`r-${k}`);
    UI.hud.ftue(null);
  }
}

function ease(t: number): number {
  const k = Math.max(0, Math.min(1, t));
  return k * k * (3 - 2 * k);
}
