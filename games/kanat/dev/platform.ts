// Platform dev harness (not shipped): boots the platform layer without the real game so the bridge,
// lifecycle, loop, perf director, input and test API can be exercised and e2e-tested in isolation.
// A tiny deterministic "toy sim" stands in for a mode and registers the test handlers.

import { boot } from '../src/core/boot.ts';
import { pushLayer } from '../src/core/layers.ts';
import type { LayerHandle } from '../src/core/layers.ts';
import { registerTestHandlers, markTime } from '../src/debug/testApi.ts';
import { attachVersionTapTrigger, openPerfPanel } from '../src/debug/perfPanel.ts';
import type { Command } from '../src/sim/types.ts';

const app = await boot({ version: '0.1.0-platform', root: document.getElementById('app') });

const canvas = document.getElementById('c') as HTMLCanvasElement;
const gl = canvas.getContext('webgl2', { antialias: false, powerPreference: 'high-performance' });
if (!gl) throw new Error('WebGL2 unavailable');

// ---- toy GPU scene (rebuilt after context restore) ---------------------------------------------
let prog: WebGLProgram | null = null;
let uPos: WebGLUniformLocation | null = null;
function buildGpu(): void {
  const vs = gl!.createShader(gl!.VERTEX_SHADER)!;
  gl!.shaderSource(vs, `#version 300 es\nuniform vec2 u;\nvoid main(){ vec2 p[3]=vec2[](vec2(-.05,-.05),vec2(.05,-.05),vec2(0.,.08)); gl_Position=vec4(p[gl_VertexID]+u,0.,1.);}`);
  gl!.compileShader(vs);
  const fs = gl!.createShader(gl!.FRAGMENT_SHADER)!;
  gl!.shaderSource(fs, `#version 300 es\nprecision highp float;\nout vec4 o;\nvoid main(){o=vec4(.95,.65,.35,1.);}`);
  gl!.compileShader(fs);
  prog = gl!.createProgram()!;
  gl!.attachShader(prog, vs);
  gl!.attachShader(prog, fs);
  gl!.linkProgram(prog);
  uPos = gl!.getUniformLocation(prog, 'u');
}
buildGpu();
const ctx = app.attachCanvas(canvas, gl);
void ctx;
import('../src/core/context.ts').then(({ onContextRestored }) => onContextRestored(() => buildGpu()));

// ---- toy deterministic sim -----------------------------------------------------------------------
interface Toy {
  tick: number;
  x: number;
  y: number;
  seed: number;
  mode: string;
  level: string;
}
const toy: Toy = { tick: 0, x: 0, y: 0, seed: 1, mode: 'menu', level: '' };
let prev = { x: 0, y: 0 };
const injected: Command[] = [];
const cmds: Command[] = [];
let botOn: string | null = null;
let botRng = 1;

function stepToy(): void {
  cmds.length = 0;
  app.input.sample(toy.tick, cmds);
  for (const c of injected) cmds.push(c);
  injected.length = 0;
  if (botOn && toy.tick % 2 === 0) {
    botRng = (Math.imul(botRng, 1664525) + 1013904223) | 0;
    cmds.push({ tick: toy.tick, actorId: 0, cmd: 'axis', args: [(botRng >> 8) % 31, (botRng >> 16) % 31] });
  }
  prev = { x: toy.x, y: toy.y };
  for (const c of cmds) {
    if (c.cmd === 'axis') {
      toy.x = Math.max(-900, Math.min(900, toy.x + c.args[0]));
      toy.y = Math.max(-900, Math.min(900, toy.y + c.args[1]));
    }
  }
  toy.tick++;
}

function hashToy(): number {
  let h = 0x811c9dc5;
  for (const v of [toy.tick, toy.x, toy.y, toy.seed]) {
    h ^= v & 0xffff;
    h = Math.imul(h, 0x01000193);
    h ^= (v >>> 16) & 0xffff;
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

let flightLayer: LayerHandle | null = null;
function enterGame(mode: string, level = '', seed = 1): void {
  toy.tick = 0;
  toy.x = 0;
  toy.y = 0;
  toy.seed = seed;
  toy.mode = mode;
  toy.level = level;
  app.loop.resetTicks();
  if (app.fsm.state !== 'game' && app.fsm.can('game')) app.fsm.go('game', { mode, level, seed });
  else if (app.fsm.state === 'game') app.fsm.go('game', { mode, level, seed });
  app.input.setScheme(mode === 'suru' ? 'suru' : 'flight');
  app.input.setSimHz(mode === 'suru' ? 30 : 60);
  app.loop.setStepHz(mode === 'suru' ? 30 : 60);
  flightLayer?.pop();
  flightLayer = pushLayer('flight', () => {
    app.fsm.pause('user');
    pausedLayer = pushLayer('pause', () => {
      app.fsm.resume('user');
    });
    return false;
  });
  app.bridge.started(mode);
  markTime('controllable');
}
let pausedLayer: LayerHandle | null = null;

function toMenu(): void {
  flightLayer?.pop();
  pausedLayer?.pop();
  flightLayer = null;
  if (app.fsm.state !== 'menu') app.fsm.go('menu');
  toy.mode = 'menu';
}

app.setLoopHandlers({
  step: () => stepToy(),
  render: (alpha) => {
    if (gl.isContextLost()) return;
    const w = Math.round(canvas.clientWidth * app.perf.pixelRatioFor(canvas.clientWidth, canvas.clientHeight));
    const h = Math.round(canvas.clientHeight * app.perf.pixelRatioFor(canvas.clientWidth, canvas.clientHeight));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    const t = app.fsm.state === 'game' ? 0.12 : 0.06;
    gl.clearColor(0.05 + t * 0.2, 0.08 + t * 0.3, 0.12 + t * 0.5, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(prog);
    const ix = prev.x + (toy.x - prev.x) * alpha;
    const iy = prev.y + (toy.y - prev.y) * alpha;
    gl.uniform2f(uPos, ix / 1000, iy / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    drawInputVisual();
  },
});
app.perf.setRendererStatsSource(() => ({ calls: 1, triangles: 1, programs: 1, textures: 0, geometries: 0, textureMB: 0 }));

registerTestHandlers({
  state: () => ({ mode: toy.mode, level: toy.level, seed: toy.seed, tick: toy.tick, x: toy.x, y: toy.y, fsm: app.fsm.state }),
  hash: () => hashToy(),
  goto: (mode: string, level?: string | number, seed?: number) => {
    if (mode === 'menu') toMenu();
    else enterGame(mode, String(level ?? ''), seed ?? 1);
    return { ok: true };
  },
  input: (cmd: unknown) => {
    injected.push(cmd as Command);
  },
  step: (n: number) => {
    for (let i = 0; i < n; i++) stepToy();
    return toy.tick;
  },
  bot: (policy: string | null) => {
    botOn = policy;
    botRng = 7;
  },
}, 'dev/platform');

// ---- UI stand-ins ---------------------------------------------------------------------------------
const devam = document.getElementById('devam') as HTMLDivElement;
app.bus.on('resumePrompt', ({ show }) => {
  devam.style.display = show ? 'flex' : 'none';
});
document.getElementById('b-devam')!.addEventListener('click', () => app.fsm.confirmResume());
document.getElementById('b-game')!.addEventListener('click', () => enterGame('career', 'w1r1', 1));
document.getElementById('b-suru')!.addEventListener('click', () => enterGame('suru', 'sazlik', 3));
document.getElementById('b-menu')!.addEventListener('click', () => toMenu());
document.getElementById('b-pause')!.addEventListener('click', () => {
  if (app.fsm.isPausedBy('user')) app.fsm.resume('user');
  else app.fsm.pause('user');
});
attachVersionTapTrigger(document.getElementById('b-perf')!);
document.getElementById('b-lang')!.addEventListener('click', () => app.settings.set({ lang: app.settings.value.lang === 'tr' ? 'en' : 'tr' }));
document.getElementById('b-haptic')!.addEventListener('click', () => app.bridge.haptic('medium'));
document.getElementById('b-share')!.addEventListener('click', async () => {
  const r = await app.bridge.share({ text: 'KANAT · Günün Rotası #214 🪂 2:07.4 · ⭐⭐⭐' });
  info.dataset.share = JSON.stringify(r);
});
if (new URLSearchParams(location.search).get('perf') === '1') openPerfPanel();

const info = document.getElementById('info') as HTMLDivElement;
const ring = document.getElementById('ring') as HTMLDivElement;
const dot = document.getElementById('dot') as HTMLDivElement;
function drawInputVisual(): void {
  const v = app.input.visual;
  const s = v.main;
  ring.style.display = dot.style.display = s.active ? 'block' : 'none';
  if (s.active) {
    ring.style.left = `${s.anchorX}px`;
    ring.style.top = `${s.anchorY}px`;
    ring.style.width = ring.style.height = `${v.radius * 2}px`;
    dot.style.left = `${s.fingerX}px`;
    dot.style.top = `${s.fingerY}px`;
  }
}
setInterval(() => {
  const a = app.summary();
  info.textContent = `state ${a.state} · tick ${toy.tick} · tier ${a.tier} · ${a.lang} · muted ${a.effectiveMuted}\naxis ${app.input.visual.qx},${app.input.visual.qy} · bridge ${(a.bridge as { transport: string }).transport}`;
}, 250);

app.ready();
