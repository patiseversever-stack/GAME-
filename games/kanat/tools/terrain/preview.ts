// Visual QA for the bake: oblique CPU-raymarched views of a baked world (macro/far color + heights + fog)
// and a hillshade of the core. Output → tests/out/terrain/.
// node tools/terrain/preview.ts <world> [hillshade] [view x,y,z,yawDeg,pitchDeg] ...

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import type { WorldId } from '../../src/sim/types.ts';
import { hexToSrgb } from './color.ts';
import { KANAT_ROOT, loadWorldNode, worldDir } from './loadNode.ts';

const OUT = join(KANAT_ROOT, 'tests', 'out', 'terrain');

async function rgbOf(path: string): Promise<{ data: Buffer; w: number; h: number }> {
  const { data, info } = await sharp(path).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

function texSample(t: { data: Buffer; w: number; h: number }, u: number, v: number, out: number[]): void {
  const x = Math.min(t.w - 1.001, Math.max(0, u * t.w - 0.5));
  const y = Math.min(t.h - 1.001, Math.max(0, v * t.h - 0.5));
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  for (let c = 0; c < 3; c++) {
    const a = t.data[(iy * t.w + ix) * 3 + c];
    const b = t.data[(iy * t.w + ix + 1) * 3 + c];
    const d = t.data[((iy + 1) * t.w + ix) * 3 + c];
    const e = t.data[((iy + 1) * t.w + ix + 1) * 3 + c];
    out[c] = ((a + (b - a) * fx) * (1 - fy) + (d + (e - d) * fx) * fy) / 255;
  }
}

export async function renderView(id: WorldId, cam: [number, number, number], yawDeg: number, pitchDeg: number, name: string, W = 960, H = 540): Promise<string> {
  const w = loadWorldNode(id);
  const s = w.sampler;
  const cfg = w.config;
  const macro = await rgbOf(join(worldDir(id), cfg.textures.colorMacro));
  const far = await rgbOf(join(worldDir(id), cfg.textures.colorFar));
  const cc = cfg.textures.coverage.core;
  const fc = cfg.textures.coverage.far;
  const zen = hexToSrgb(cfg.sky.zenith);
  const hor = hexToSrgb(cfg.sky.horizon);
  const fogC = hexToSrgb(cfg.fog.color);
  const sea = hexToSrgb(cfg.water.deep);
  const seaS = hexToSrgb(cfg.water.shallow);
  const yaw = (yawDeg * Math.PI) / 180;
  const pitch = (pitchDeg * Math.PI) / 180;
  // forward: yaw 0 = north (-z), clockwise
  const fwd = [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)];
  const right = [Math.cos(yaw), 0, Math.sin(yaw)];
  const up = [right[1] * fwd[2] - right[2] * fwd[1], right[2] * fwd[0] - right[0] * fwd[2], right[0] * fwd[1] - right[1] * fwd[0]];
  const tanF = Math.tan((60 * Math.PI) / 360);
  const img = Buffer.alloc(W * H * 3);
  const col = [0, 0, 0];
  const viewDist = cfg.fog.maxViewM;
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const sx = ((px + 0.5) / W * 2 - 1) * tanF * (W / H);
      const sy = (1 - (py + 0.5) / H * 2) * tanF;
      let dx = fwd[0] + right[0] * sx + up[0] * sy;
      let dy = fwd[1] + right[1] * sx + up[1] * sy;
      let dz = fwd[2] + right[2] * sx + up[2] * sy;
      const l = Math.hypot(dx, dy, dz);
      dx /= l;
      dy /= l;
      dz /= l;
      let t = 1;
      let hit = false;
      let water = false;
      let x = 0;
      let z = 0;
      while (t < 60000) {
        x = cam[0] + dx * t;
        const y = cam[1] + dy * t;
        z = cam[2] + dz * t;
        const h = s.baseHeight(x, z);
        const hh = cfg.hasSea ? Math.max(h, 0) : h;
        if (y <= hh) {
          hit = true;
          water = cfg.hasSea && h < 0;
          break;
        }
        t += Math.max(0.5, (y - hh) * 0.35) * (1 + t / 20000);
      }
      let r: number;
      let g: number;
      let b: number;
      const skyT = Math.max(0, Math.min(1, dy * 3 + 0.1));
      const skyR = hor[0] + (zen[0] - hor[0]) * skyT;
      const skyG = hor[1] + (zen[1] - hor[1]) * skyT;
      const skyB = hor[2] + (zen[2] - hor[2]) * skyT;
      if (!hit) {
        r = skyR;
        g = skyG;
        b = skyB;
      } else {
        const u = (x - cc.minX) / cc.size;
        const v = (z - cc.minZ) / cc.size;
        if (u >= 0 && u <= 1 && v >= 0 && v <= 1) texSample(macro, u, v, col);
        else texSample(far, (x - fc.minX) / fc.size, (z - fc.minZ) / fc.size, col);
        if (water) {
          const depth = -s.baseHeight(x, z);
          const k = Math.min(1, depth / cfg.water.depthFalloffM);
          const fres = 0.25 + 0.6 * Math.pow(1 - Math.abs(dy), 5);
          for (let c = 0; c < 3; c++) {
            const wc = seaS[c] + (sea[c] - seaS[c]) * k;
            col[c] = (col[c] * (1 - k) * 0.5 + wc * (0.5 + 0.5 * k)) * (1 - fres) + [skyR, skyG, skyB][c] * fres;
          }
        }
        const f = 1 - Math.exp(-Math.pow((t / viewDist) * 3, 1.3));
        r = col[0] + (fogC[0] - col[0]) * f;
        g = col[1] + (fogC[1] - col[1]) * f;
        b = col[2] + (fogC[2] - col[2]) * f;
      }
      const i = (py * W + px) * 3;
      img[i] = Math.round(Math.min(1, r) * 255);
      img[i + 1] = Math.round(Math.min(1, g) * 255);
      img[i + 2] = Math.round(Math.min(1, b) * 255);
    }
  }
  mkdirSync(OUT, { recursive: true });
  const out = join(OUT, `${id}_view_${name}.png`);
  await sharp(img, { raw: { width: W, height: H, channels: 3 } }).png().toFile(out);
  return out;
}

export async function renderHillshade(id: WorldId, crop: [number, number, number] | null): Promise<string> {
  const w = loadWorldNode(id);
  const g = w.terrain.core;
  const res = g.res;
  const out = new Uint8Array(res * res);
  const sp = g.spacing;
  for (let r = 1; r < res - 1; r++) {
    for (let c = 1; c < res - 1; c++) {
      const i = r * res + c;
      const hx = (g.data[i + 1] - g.data[i - 1]) / (2 * sp);
      const hz = (g.data[i + res] - g.data[i - res]) / (2 * sp);
      const inv = 1 / Math.sqrt(hx * hx + hz * hz + 1);
      const l = (hx * 0.5 + 0.6 + hz * 0.6) * inv;
      out[i] = Math.max(0, Math.min(255, l * 230));
    }
  }
  let img = sharp(Buffer.from(out), { raw: { width: res, height: res, channels: 1 } });
  if (crop) img = img.extract({ left: crop[0], top: crop[1], width: crop[2], height: crop[2] }).resize(1024, 1024, { kernel: 'nearest' });
  mkdirSync(OUT, { recursive: true });
  const p = join(OUT, `${id}_hillshade${crop ? '_crop' : ''}.png`);
  await img.png().toFile(p);
  return p;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const id = process.argv[2] as WorldId;
  const mode = process.argv[3] ?? 'view';
  if (mode === 'hillshade') {
    const crop = process.argv[4] ? (process.argv[4].split(',').map(Number) as [number, number, number]) : null;
    console.log(await renderHillshade(id, crop));
  } else {
    const v = (process.argv[4] ?? '0,1800,3500,0,-12').split(',').map(Number);
    console.log(await renderView(id, [v[0], v[1], v[2]], v[3], v[4], process.argv[5] ?? 'a'));
  }
}
