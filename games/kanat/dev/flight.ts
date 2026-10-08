// Flight sim dev page (flight agent): top-down map + side profile + live state/events.
// Visual check that the pure sim, proximity, props/balloons, gates, scoring and canopy behave as designed.
// Serve: npx vite --port 5188 → http://localhost:5188/dev/flight.html  (?world=kapadokya, ?ff=<seconds>, ?ap=0)

import { FlightSim } from '../src/sim/FlightSim.ts';
import { RelativeStick } from '../src/sim/inputQuant.ts';
import { AnalyticTerrain } from '../src/sim/testing/analyticTerrain.ts';
import { Autopilot, makeCanyonRoute } from '../src/sim/testing/testRoute.ts';
import type { TerrainSampler } from '../src/sim/terrain/types.ts';
import type { BalloonDef, Command, PropInstance, RouteDef, SimEvent } from '../src/sim/types.ts';
import { balloonPos, balloonsFor, buildProps } from '../src/sim/world/props.ts';

declare global {
  interface Window {
    __shotReady?: boolean;
    __flight?: FlightSim;
  }
}

const qs = new URLSearchParams(location.search);
const canvas = document.getElementById('c') as HTMLCanvasElement;
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
const MULT_COL: Record<number, string> = { 0: '#8a96a3', 1: '#4caf50', 2: '#ffd54f', 3: '#ff9800', 5: '#f44336' };
const TYPE_COL: Record<string, string> = { chimney: '#e3b48f', tree: '#3f7a3a', house: '#8a5a3b', column: '#e0d0b0', wall: '#c9a27e', theater: '#c9a27e', cornice: '#cfe6f2', rock: '#6d6660', gulet: '#ffffff', tomb: '#cfc6b4', lighthouse: '#ffffff', arch: '#cfc6b4', waterfall: '#7fd3ff' };

async function loadWorld(): Promise<{ sampler: TerrainSampler; route: RouteDef; props: PropInstance[]; balloons: BalloonDef[]; hasSea: boolean }> {
  const id = qs.get('world');
  if (id === 'kapadokya') {
    const { loadWorldTerrain } = await import('../src/content/worlds.ts');
    const w = await loadWorldTerrain('kapadokya');
    const s = w.sampler;
    const h0 = s.height(0, 0);
    const lx = 2000;
    const route: RouteDef = {
      id: 'dev-kap',
      world: 'kapadokya',
      index: 1,
      difficulty: 1,
      name: { tr: 'Dev', en: 'Dev' },
      start: { type: 'balon', pos: [0, h0 + 450, 0], headingDeg: 90, speedKmh: 150 },
      line: [[0, h0 + 450, 0], [lx, s.height(lx, 0) + 60, 0]],
      gates: [500, 1000, 1500].map((x, i) => ({ t: i / 3, pos: [x, Math.max(s.height(x, 0) + 25, h0 + 450 - x / 4.5), 0] as [number, number, number], normal: [1, 0, 0] as [number, number, number], radius: 14, kind: 'normal' as const })),
      thermals: [{ pos: [300, 0], radius: 50, w0: 6, top: h0 + 650 }],
      landing: { center: [lx, s.height(lx, 0), 0], radius: 25, zoneRadius: 250 },
      wind: w.config.wind,
      stars: [0, 3000, 6000],
      expertScore: 7000,
      ustaGorevleri: [],
      postcards: [],
    };
    return { sampler: s, route, props: buildProps('kapadokya', s, w.config), balloons: balloonsFor('kapadokya', s, 7, { anchors: route.line }), hasSea: w.config.hasSea };
  }
  const s = new AnalyticTerrain();
  const route = makeCanyonRoute(s);
  return { sampler: s, route, props: buildProps('kapadokya', s, {}), balloons: balloonsFor('kapadokya', s, 7, { anchors: route.line }), hasSea: true };
}

const world = await loadWorld();
const { sampler, route, props, balloons } = world;
let sim = new FlightSim({ world: route.world, sampler, props, balloons, route, seed: 1, assist: 'full', skipIntro: true, hasSea: world.hasSea });
window.__flight = sim;
const ap = new Autopilot();
let autopilot = qs.get('ap') !== '0';
const trail: number[] = []; // x, z, y, mult
const events: string[] = [];
const keys = new Set<string>();
const stick = new RelativeStick(Math.min(innerWidth, innerHeight), {});
const axisCmd: Command = { tick: 0, actorId: 0, cmd: 'axis', args: [0, 0] };
const extra: Command[] = [];
let chuteReq = false;
let flareHeld = false;

function restart(): void {
  sim = new FlightSim({ world: route.world, sampler, props, balloons, route, seed: 1, assist: 'full', skipIntro: true, hasSea: world.hasSea });
  window.__flight = sim;
  trail.length = 0;
  events.length = 0;
}

addEventListener('keydown', (e) => {
  keys.add(e.key);
  if (e.key === ' ') chuteReq = true;
  if (e.key === 'a' || e.key === 'A') autopilot = !autopilot;
  if (e.key === 'r' || e.key === 'R') restart();
  if (e.key === 'f' || e.key === 'F') flareHeld = true;
});
addEventListener('keyup', (e) => {
  keys.delete(e.key);
  if (e.key === 'f' || e.key === 'F') flareHeld = false;
});
canvas.addEventListener('pointerdown', (e) => {
  stick.begin(e.clientX, e.clientY);
  autopilot = false;
});
canvas.addEventListener('pointermove', (e) => stick.move(e.clientX, e.clientY));
addEventListener('pointerup', () => stick.end());

function tickOnce(): void {
  const st = sim.state;
  let cmds: Command[] = [];
  if ((st.tick & 1) === 0) {
    if (autopilot) {
      const g = route.gates[st.gateIndex];
      ap.target = g ? [g.pos[0], g.pos[1], g.pos[2]] : [route.landing.center[0], route.landing.center[1] + 30, route.landing.center[2]];
      cmds = ap.commands(st).slice();
    } else {
      const out = [0, 0];
      stick.read(out);
      let sx = out[0];
      let sy = out[1];
      if (keys.has('ArrowLeft')) sx = -31;
      if (keys.has('ArrowRight')) sx = 31;
      if (keys.has('ArrowUp')) sy = -31;
      if (keys.has('ArrowDown')) sy = 31;
      axisCmd.tick = st.tick;
      axisCmd.args[0] = sx;
      axisCmd.args[1] = sy;
      cmds = [axisCmd];
    }
  }
  extra.length = 0;
  if (chuteReq || (autopilot && st.inLandingZone && st.phase === 'flying' && st.heightAGL < 85)) {
    extra.push({ tick: st.tick, actorId: 0, cmd: 'parachute', args: [] });
    chuteReq = false;
  }
  if (flareHeld || (autopilot && st.canopyOpen && st.heightAGL < 2.8)) extra.push({ tick: st.tick, actorId: 0, cmd: 'flare', args: [31] });
  sim.step(cmds.concat(extra));
  const s2 = sim.state;
  trail.push(s2.pos[0], s2.pos[2], s2.pos[1], s2.prox.mult);
  if (trail.length > 4 * 6000) trail.splice(0, 4);
  for (const e of sim.drainEvents()) logEvent(e);
}

function logEvent(e: SimEvent): void {
  const t = (e.tick / 60).toFixed(1);
  let s = `${t}s ${e.type}`;
  if ('points' in e) s += ` +${Math.round(e.points)}`;
  if (e.type === 'multUp') s += ` ×${e.mult}`;
  if (e.type === 'crash' || e.type === 'bounce') s += ` (${e.cls})`;
  if (e.type === 'landed') s += ` ${e.distToTarget.toFixed(1)} m${e.soft ? ' yumuşak' : ''}`;
  if (e.type === 'warning') s += ` τ=${e.tau.toFixed(2)}`;
  if (e.type === 'multUp' && events.length && events[0].includes('multUp')) events.shift();
  events.unshift(s);
  if (events.length > 14) events.pop();
}

// fast-forward for screenshots
const ff = Number(qs.get('ff') ?? 0);
for (let i = 0; i < ff * 60; i++) tickOnce();

// ── terrain image cache ──
const MAP_M = 900; // meters across the visible map
const IMG_M = 1300; // meters covered by the cached terrain image (> MAP_M + 2 × rebuild threshold)
const IMG = 200;
const img = new ImageData(IMG, IMG);
let imgCx = Infinity;
let imgCz = Infinity;
const off = document.createElement('canvas');
off.width = IMG;
off.height = IMG;
const offCtx = off.getContext('2d') as CanvasRenderingContext2D;

function rebuildTerrain(cx: number, cz: number): void {
  imgCx = cx;
  imgCz = cz;
  const d = img.data;
  const step = IMG_M / IMG;
  let hmin = Infinity;
  let hmax = -Infinity;
  const hs = new Float32Array(IMG * IMG);
  for (let j = 0; j < IMG; j++)
    for (let i = 0; i < IMG; i++) {
      const h = sampler.height(cx - IMG_M / 2 + (i + 0.5) * step, cz - IMG_M / 2 + (j + 0.5) * step);
      hs[j * IMG + i] = h;
      if (h < hmin) hmin = h;
      if (h > hmax) hmax = h;
    }
  for (let j = 0; j < IMG; j++)
    for (let i = 0; i < IMG; i++) {
      const k = j * IMG + i;
      const h = hs[k];
      const hx = hs[j * IMG + Math.min(IMG - 1, i + 1)] - h;
      const hz = hs[Math.min(IMG - 1, j + 1) * IMG + i] - h;
      const shade = Math.max(0.35, Math.min(1.25, 0.85 - (hx + hz) * 0.08));
      const t = (h - hmin) / Math.max(1, hmax - hmin);
      let r = 120 + 110 * t;
      let g = 100 + 80 * t;
      let b = 80 + 60 * t;
      if (world.hasSea && h < 0) {
        r = 30;
        g = 110;
        b = 140;
      }
      d[k * 4] = r * shade;
      d[k * 4 + 1] = g * shade;
      d[k * 4 + 2] = b * shade;
      d[k * 4 + 3] = 255;
    }
  offCtx.putImageData(img, 0, 0);
}

let acc = 0;
let last = performance.now();
const bp = new Float64Array(3);
let frames = 0;

function frame(now: number): void {
  const dpr = Math.min(2, devicePixelRatio || 1);
  const W = Math.floor(innerWidth * dpr);
  const H = Math.floor(innerHeight * dpr);
  if (canvas.width !== W || canvas.height !== H) {
    canvas.width = W;
    canvas.height = H;
  }
  acc += Math.min(0.25, (now - last) / 1000);
  last = now;
  while (acc >= 1 / 60) {
    tickOnce();
    acc -= 1 / 60;
  }
  const alpha = acc * 60;
  const st = sim.state;
  const px = st.prevPos[0] + (st.pos[0] - st.prevPos[0]) * alpha;
  const pz = st.prevPos[2] + (st.pos[2] - st.prevPos[2]) * alpha;
  if (Math.abs(px - imgCx) > 150 || Math.abs(pz - imgCz) > 150) rebuildTerrain(Math.round(px / 50) * 50, Math.round(pz / 50) * 50);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#0d1116';
  ctx.fillRect(0, 0, W, H);
  const mapPx = Math.min(W, H * 0.62);
  const sc = mapPx / MAP_M;
  const ox = (W - mapPx) / 2;
  const oy = 0;
  const toX = (x: number) => ox + (x - px) * sc + mapPx / 2;
  const toY = (z: number) => oy + (z - pz) * sc + mapPx / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(ox, oy, mapPx, mapPx);
  ctx.clip();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(off, toX(imgCx - IMG_M / 2), toY(imgCz - IMG_M / 2), IMG_M * sc, IMG_M * sc);
  // landing zone
  const lc = route.landing.center;
  ctx.strokeStyle = '#7fd3ff';
  ctx.lineWidth = 2 * dpr;
  ctx.beginPath();
  ctx.arc(toX(lc[0]), toY(lc[2]), route.landing.zoneRadius * sc, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(toX(lc[0]), toY(lc[2]), 10 * sc + 2, 0, Math.PI * 2);
  ctx.stroke();
  // thermals
  for (const t of route.thermals) {
    ctx.fillStyle = 'rgba(255,200,80,0.18)';
    ctx.beginPath();
    ctx.arc(toX(t.pos[0]), toY(t.pos[1]), t.radius * sc, 0, Math.PI * 2);
    ctx.fill();
  }
  // props
  for (const p of props) {
    const x = toX(p.pos[0]);
    const y = toY(p.pos[2]);
    if (x < ox - 20 || x > ox + mapPx + 20 || y < -20 || y > mapPx + 20) continue;
    const r = p.type === 'chimney' ? p.params.r0 : p.type === 'tree' ? p.params.crownR0 : 3;
    ctx.fillStyle = TYPE_COL[p.type] ?? '#ccc';
    ctx.beginPath();
    ctx.arc(x, y, Math.max(1.2 * dpr, r * sc), 0, Math.PI * 2);
    ctx.fill();
  }
  // balloons
  for (const b of balloons) {
    balloonPos(b, st.timeSec, bp);
    ctx.fillStyle = 'rgba(255,90,60,0.85)';
    ctx.beginPath();
    ctx.arc(toX(bp[0]), toY(bp[2]), b.envelopeR * sc, 0, Math.PI * 2);
    ctx.fill();
  }
  // gates
  route.gates.forEach((g, i) => {
    const tx = -g.normal[2];
    const tz = g.normal[0];
    ctx.strokeStyle = i < st.gateIndex ? '#5f6b78' : i === st.gateIndex ? '#ffffff' : '#9fe0ff';
    ctx.lineWidth = 3 * dpr;
    ctx.beginPath();
    ctx.moveTo(toX(g.pos[0] - tx * g.radius), toY(g.pos[2] - tz * g.radius));
    ctx.lineTo(toX(g.pos[0] + tx * g.radius), toY(g.pos[2] + tz * g.radius));
    ctx.stroke();
  });
  // trail colored by multiplier
  ctx.lineWidth = 2.5 * dpr;
  for (let i = 4; i < trail.length; i += 4) {
    ctx.strokeStyle = MULT_COL[trail[i + 3]] ?? '#fff';
    ctx.beginPath();
    ctx.moveTo(toX(trail[i - 4]), toY(trail[i - 3]));
    ctx.lineTo(toX(trail[i]), toY(trail[i + 1]));
    ctx.stroke();
  }
  // pilot
  ctx.save();
  ctx.translate(toX(px), toY(pz));
  ctx.rotate(st.psi);
  ctx.fillStyle = st.phase === 'crashed' ? '#f44336' : '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, -9 * dpr);
  ctx.lineTo(6 * dpr, 6 * dpr);
  ctx.lineTo(-6 * dpr, 6 * dpr);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // nearest surface ray
  if (st.prox.d < 45) {
    ctx.strokeStyle = MULT_COL[st.prox.mult];
    ctx.setLineDash([4 * dpr, 4 * dpr]);
    ctx.beginPath();
    ctx.moveTo(toX(px), toY(pz));
    ctx.lineTo(toX(st.prox.nearest[0]), toY(st.prox.nearest[2]));
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
  // ── side profile (altitude along the trail) ──
  const py0 = mapPx + 8 * dpr;
  const ph = Math.max(60 * dpr, H * 0.14);
  ctx.fillStyle = '#151b22';
  ctx.fillRect(0, py0, W, ph);
  const n = trail.length / 4;
  if (n > 2) {
    let ymin = Infinity;
    let ymax = -Infinity;
    for (let i = 0; i < n; i++) {
      const y = trail[i * 4 + 2];
      ymin = Math.min(ymin, y, sampler.height(trail[i * 4], trail[i * 4 + 1]));
      ymax = Math.max(ymax, y);
    }
    const sx = W / Math.max(1, n - 1);
    const sy = (ph - 8 * dpr) / Math.max(10, ymax - ymin);
    ctx.fillStyle = '#5a4a3a';
    ctx.beginPath();
    ctx.moveTo(0, py0 + ph);
    for (let i = 0; i < n; i += 2) ctx.lineTo(i * sx, py0 + ph - 4 * dpr - (sampler.height(trail[i * 4], trail[i * 4 + 1]) - ymin) * sy);
    ctx.lineTo(W, py0 + ph);
    ctx.fill();
    ctx.lineWidth = 2 * dpr;
    for (let i = 1; i < n; i++) {
      ctx.strokeStyle = MULT_COL[trail[i * 4 + 3]] ?? '#fff';
      ctx.beginPath();
      ctx.moveTo((i - 1) * sx, py0 + ph - 4 * dpr - (trail[(i - 1) * 4 + 2] - ymin) * sy);
      ctx.lineTo(i * sx, py0 + ph - 4 * dpr - (trail[i * 4 + 2] - ymin) * sy);
      ctx.stroke();
    }
  }
  // ── HUD text ──
  const ty = py0 + ph + 16 * dpr;
  ctx.font = `${12 * dpr}px ui-monospace, Menlo, monospace`;
  ctx.fillStyle = '#e8edf2';
  const lines = [
    `faz ${st.phase}${autopilot ? ' · otopilot' : ''}   t ${st.timeSec.toFixed(1)} s   tick ${st.tick}`,
    `hız ${(st.speed * 3.6).toFixed(0)} km/sa   γ ${((st.gamma * 180) / Math.PI).toFixed(1)}°   φ ${((st.phi * 180) / Math.PI).toFixed(0)}°   C_L ${st.cl.toFixed(2)}${st.stall ? `   stall ${st.stall.toFixed(2)}` : ''}`,
    `AGL ${st.heightAGL.toFixed(1)} m   d ${Number.isFinite(st.prox.d) ? st.prox.d.toFixed(2) : '∞'} m (${st.prox.cls})   ×${st.prox.mult}   K ${st.combo.toFixed(2)} (${st.comboTime.toFixed(1)} s)`,
    `PUAN ${Math.round(st.score)}   kapı ${st.gatesPassed}/${route.gates.length} (kaçan ${st.gatesMissed})   termal ${st.inThermal}   bölge ${st.inLandingZone ? 'evet' : 'hayır'}   hash ${sim.hash().toString(16)}`,
  ];
  lines.forEach((l, i) => ctx.fillText(l, 10 * dpr, ty + i * 16 * dpr));
  ctx.fillStyle = '#9fb3c8';
  events.forEach((l, i) => ctx.fillText(l, 10 * dpr, ty + (lines.length + 0.6 + i) * 15 * dpr));
  frames++;
  if (frames === 30) window.__shotReady = true;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
