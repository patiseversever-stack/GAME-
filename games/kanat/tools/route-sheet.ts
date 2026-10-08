// Route contact sheet (routes agent): top-down hillshade of a world with its 4 career routes drawn — line coloured
// by height above the surface (the proximity the line offers), gates, thermals, start, landing zone + target.
//   node tools/route-sheet.ts [--world kapadokya] [--out docs/shots/routes] [--corridors]
// Output: <out>/<world>.png (≤ 600 KB, palette PNG).

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { loadWorldNode, KANAT_ROOT, type NodeWorld } from './terrain/loadNode.ts';
import { DenseLine } from '../src/sim/bots/line.ts';
import { ObstacleField } from '../src/sim/bots/obstacles.ts';
import type { RouteDef, WorldId } from '../src/sim/types.ts';
import { WORLD_IDS } from '../src/sim/types.ts';
import { readRouteJson } from './route-lib.ts';
import { buildWorldContent } from '../src/game/routes/worldContent.ts';

const S = 1024;
const M = 8192 / S;

function px(x: number): number {
  return (x + 4096) / M;
}

export function hillshade(W: NodeWorld): Buffer {
  const s = W.sampler;
  const h = new Float32Array(S * S);
  let mn = Infinity;
  let mx = -Infinity;
  for (let j = 0; j < S; j++)
    for (let i = 0; i < S; i++) {
      const v = s.baseHeight(-4096 + i * M + M / 2, -4096 + j * M + M / 2);
      h[j * S + i] = v;
      if (v < mn) mn = v;
      if (v > mx) mx = v;
    }
  const out = Buffer.alloc(S * S * 3);
  const L = [-0.5, 0.7, -0.5];
  const ll = Math.hypot(L[0], L[1], L[2]);
  const cont = mx - mn > 800 ? 100 : 25;
  for (let j = 0; j < S; j++)
    for (let i = 0; i < S; i++) {
      const k = j * S + i;
      const hx = (h[j * S + Math.min(S - 1, i + 1)] - h[j * S + Math.max(0, i - 1)]) / (2 * M);
      const hz = (h[Math.min(S - 1, j + 1) * S + i] - h[Math.max(0, j - 1) * S + i]) / (2 * M);
      const nl = Math.hypot(hx, 1, hz);
      const sh = Math.max(0, (-hx * L[0] + L[1] - hz * L[2]) / (nl * ll));
      const t = (h[k] - mn) / (mx - mn);
      const base = t < 0.5 ? [70 + 260 * t, 130 + 110 * t, 80] : [200 - 50 * (t - 0.5), 185 - 100 * (t - 0.5), 80 + 280 * (t - 0.5)];
      let r = base[0] * (0.3 + 0.8 * sh);
      let g = base[1] * (0.3 + 0.8 * sh);
      let b = base[2] * (0.3 + 0.8 * sh);
      if (W.config.hasSea && h[k] < 0) {
        r = 40;
        g = 85 + h[k] * 0.1;
        b = 150;
      }
      const c0 = Math.floor(h[k] / cont);
      if (c0 !== Math.floor(h[j * S + Math.min(S - 1, i + 1)] / cont) || c0 !== Math.floor(h[Math.min(S - 1, j + 1) * S + i] / cont)) {
        r *= 0.75;
        g *= 0.75;
        b *= 0.75;
      }
      out[k * 3] = Math.max(0, Math.min(255, r * 0.85));
      out[k * 3 + 1] = Math.max(0, Math.min(255, g * 0.85));
      out[k * 3 + 2] = Math.max(0, Math.min(255, b * 0.85));
    }
  return out;
}

const ROUTE_COL = ['#ffffff', '#7fdcff', '#ffd23f', '#ff5fa2'];

function aglColor(a: number): string {
  if (a < 7) return '#ff3b30';
  if (a < 15) return '#ff9500';
  if (a < 30) return '#ffd60a';
  return '#f2f2f2';
}

export function routeSvg(W: NodeWorld, routes: RouteDef[], obstacles: ObstacleField | null, extra = ''): string {
  let svg = `<svg width="${S}" height="${S}" xmlns="http://www.w3.org/2000/svg"><style>text{font-family:sans-serif;font-weight:bold}</style>`;
  for (let k = -4; k <= 4; k++) {
    const p = px(k * 1000);
    svg += `<line x1="${p}" y1="0" x2="${p}" y2="${S}" stroke="#fff" stroke-opacity="0.18"/><line x1="0" y1="${p}" x2="${S}" y2="${p}" stroke="#fff" stroke-opacity="0.18"/>`;
  }
  svg += extra;
  routes.forEach((r, ri) => {
    const L = new DenseLine(r.line, W.sampler, obstacles, W.config.hasSea);
    // halo + AGL-coloured line
    let d = '';
    for (let i = 0; i < L.n; i += 2) d += `${i === 0 ? 'M' : 'L'}${px(L.x[i]).toFixed(1)},${px(L.z[i]).toFixed(1)}`;
    svg += `<path d="${d}" fill="none" stroke="#000" stroke-opacity="0.55" stroke-width="6"/>`;
    svg += `<path d="${d}" fill="none" stroke="${ROUTE_COL[ri % 4]}" stroke-width="3.2"/>`;
    for (let i = 0; i < L.n - 4; i += 4) {
      const a = L.y[i] - L.env[i];
      if (a >= 30) continue;
      svg += `<line x1="${px(L.x[i]).toFixed(1)}" y1="${px(L.z[i]).toFixed(1)}" x2="${px(L.x[i + 4]).toFixed(1)}" y2="${px(L.z[i + 4]).toFixed(1)}" stroke="${aglColor(a)}" stroke-width="2"/>`;
    }
    // canopy leg
    const last = r.line[r.line.length - 1];
    const lc = r.landing.center;
    svg += `<line x1="${px(last[0])}" y1="${px(last[2])}" x2="${px(lc[0])}" y2="${px(lc[2])}" stroke="${ROUTE_COL[ri % 4]}" stroke-dasharray="4,3" stroke-width="2"/>`;
    for (const g of r.gates) svg += `<circle cx="${px(g.pos[0]).toFixed(1)}" cy="${px(g.pos[2]).toFixed(1)}" r="${Math.max(3, g.radius / M + 1.5).toFixed(1)}" fill="none" stroke="${g.kind === 'final' ? '#00ff66' : '#00e5ff'}" stroke-width="2"/>`;
    for (const t of r.thermals) svg += `<circle cx="${px(t.pos[0]).toFixed(1)}" cy="${px(t.pos[1]).toFixed(1)}" r="${(t.radius / M).toFixed(1)}" fill="#ff6a00" fill-opacity="0.25" stroke="#ff6a00" stroke-width="1.5"/>`;
    svg += `<circle cx="${px(lc[0])}" cy="${px(lc[2])}" r="${(r.landing.zoneRadius / M).toFixed(1)}" fill="#ffffff" fill-opacity="0.08" stroke="#ffffff" stroke-dasharray="3,3"/>`;
    svg += `<circle cx="${px(lc[0])}" cy="${px(lc[2])}" r="4" fill="#ff2d55" stroke="#fff" stroke-width="1.5"/>`;
    const s0 = r.start.pos;
    svg += `<rect x="${px(s0[0]) - 6}" y="${px(s0[2]) - 6}" width="12" height="12" fill="${ROUTE_COL[ri % 4]}" stroke="#000" stroke-width="1.5"/>`;
    svg += `<text x="${px(s0[0]) + 9}" y="${px(s0[2]) - 7}" fill="#000" font-size="17" stroke="#000" stroke-width="3">${r.id}</text><text x="${px(s0[0]) + 9}" y="${px(s0[2]) - 7}" fill="${ROUTE_COL[ri % 4]}" font-size="17">${r.id}</text>`;
  });
  svg += `<rect x="8" y="${S - 92}" width="430" height="84" fill="#000" fill-opacity="0.55" rx="6"/>`;
  svg += `<text x="18" y="${S - 66}" fill="#fff" font-size="16">${W.config.id} — ${routes.length} rota · 1 km ızgara · kare = başlangıç</text>`;
  svg += `<text x="18" y="${S - 44}" fill="#fff" font-size="13">çizgi yüksekliği: <tspan fill="#ff3b30">&lt;7 m</tspan> <tspan fill="#ff9500">&lt;15 m</tspan> <tspan fill="#ffd60a">&lt;30 m</tspan> · camgöbeği halka = kapı · turuncu = termal</text>`;
  svg += `<text x="18" y="${S - 22}" fill="#fff" font-size="13">kesikli daire = iniş bölgesi (250 m) · kırmızı nokta = hedef · kesikli çizgi = kanopi</text>`;
  svg += `</svg>`;
  return svg;
}

export async function renderSheet(W: NodeWorld, routes: RouteDef[], obstacles: ObstacleField | null, file: string, extra = ''): Promise<number> {
  const base = hillshade(W);
  const svg = routeSvg(W, routes, obstacles, extra);
  const info = await sharp(base, { raw: { width: S, height: S, channels: 3 } })
    .composite([{ input: Buffer.from(svg) }])
    .png({ palette: true, colours: 256, compressionLevel: 9, effort: 8 })
    .toFile(file);
  return info.size;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const onlyWorld = args.includes('--world') ? (args[args.indexOf('--world') + 1] as WorldId) : null;
  const outDir = args.includes('--out') ? args[args.indexOf('--out') + 1] : join(KANAT_ROOT, 'docs', 'shots', 'routes');
  const srcDir = args.includes('--src') ? args[args.indexOf('--src') + 1] : undefined;
  mkdirSync(outDir, { recursive: true });
  for (const w of WORLD_IDS) {
    if (onlyWorld && w !== onlyWorld) continue;
    const wi = WORLD_IDS.indexOf(w) + 1;
    const routes: RouteDef[] = [];
    for (let k = 1; k <= 4; k++) {
      const r = readRouteJson(`w${wi}r${k}`, srcDir);
      if (r) routes.push(r);
    }
    const W = loadWorldNode(w);
    const json: Record<string, RouteDef> = {};
    for (const r of routes) json[r.id] = r;
    const content = buildWorldContent(w, W.sampler, W.config, { json });
    const obs = new ObstacleField(W.sampler, content.props, W.config.hasSea);
    const file = join(outDir, `${w}.png`);
    const size = await renderSheet(W, routes, obs, file);
    console.log(`${file} ${(size / 1024).toFixed(0)} KB (${routes.length} routes)`);
  }
}

if (process.argv[1] && process.argv[1].endsWith('route-sheet.ts')) await main();
