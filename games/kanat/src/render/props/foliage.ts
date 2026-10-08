// Procedural foliage atlas (Canvas 2D at load, no external images): 2×2 cells of 256² for
// 0 poplar (kavak) · 1 Calabrian pine (kızılçam) · 2 spruce (ladin) · 3 juniper (ardıç).
import { DataTexture, RGBAFormat, UnsignedByteType, SRGBColorSpace, LinearMipmapLinearFilter, LinearFilter, ClampToEdgeWrapping } from 'three';
import { mulberry32 } from './textures.ts';

export const FOLIAGE_CELL = 256;

function hsl(h: number, s: number, l: number, a = 1): string {
  return `hsla(${h.toFixed(1)}, ${(s * 100).toFixed(1)}%, ${(l * 100).toFixed(1)}%, ${a})`;
}

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** Irregular cluster mask: leaves only inside a lumpy blob, denser toward the middle. */
function inBlob(x: number, y: number, cx: number, cy: number, r: number, k: number[]): boolean {
  const dx = x - cx, dy = y - cy;
  const a = Math.atan2(dy, dx);
  const rr = r * (0.82 + 0.1 * Math.sin(a * 3 + k[0]) + 0.07 * Math.sin(a * 5 + k[1]) + 0.05 * Math.sin(a * 9 + k[2]));
  return dx * dx + dy * dy < rr * rr;
}

function drawPoplar(ctx: Ctx, ox: number, oy: number, rnd: () => number): void {
  const C = FOLIAGE_CELL, cx = ox + C / 2, cy = oy + C / 2;
  const k = [rnd() * 6, rnd() * 6, rnd() * 6];
  for (let layer = 0; layer < 3; layer++) {
    const n = 210 + layer * 40;
    for (let i = 0; i < n; i++) {
      const x = ox + 10 + rnd() * (C - 20), y = oy + 10 + rnd() * (C - 20);
      if (!inBlob(x, y, cx, cy, C * 0.44, k)) continue;
      const s = 5 + rnd() * 6;
      const light = 0.22 + layer * 0.1 + rnd() * 0.12 - (y - oy) / C * 0.08;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rnd() * Math.PI * 2);
      ctx.fillStyle = hsl(70 + rnd() * 22, 0.42 + rnd() * 0.15, light);
      ctx.beginPath();
      // deltoid leaf
      ctx.moveTo(0, -s);
      ctx.quadraticCurveTo(s * 0.9, -s * 0.1, 0, s * 0.8);
      ctx.quadraticCurveTo(-s * 0.9, -s * 0.1, 0, -s);
      ctx.fill();
      ctx.restore();
    }
  }
}

function drawPine(ctx: Ctx, ox: number, oy: number, rnd: () => number): void {
  const C = FOLIAGE_CELL, cx = ox + C / 2, cy = oy + C / 2;
  const k = [rnd() * 6, rnd() * 6, rnd() * 6];
  ctx.lineCap = 'round';
  for (let layer = 0; layer < 3; layer++) {
    const tufts = 26 + layer * 8;
    for (let t = 0; t < tufts; t++) {
      const x = ox + 24 + rnd() * (C - 48), y = oy + 24 + rnd() * (C - 48);
      if (!inBlob(x, y, cx, cy, C * 0.42, k)) continue;
      const needles = 22 + Math.floor(rnd() * 14);
      const len = 16 + rnd() * 14;
      const base = rnd() * Math.PI * 2;
      for (let i = 0; i < needles; i++) {
        const a = base + (i / needles) * Math.PI * 2 + (rnd() - 0.5) * 0.3;
        const l = len * (0.7 + rnd() * 0.4);
        ctx.strokeStyle = hsl(95 + rnd() * 20, 0.3 + rnd() * 0.12, 0.16 + layer * 0.07 + rnd() * 0.08);
        ctx.lineWidth = 1.4 + rnd() * 0.8;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l * 0.8);
        ctx.stroke();
      }
    }
  }
}

function drawSpruce(ctx: Ctx, ox: number, oy: number, rnd: () => number): void {
  const C = FOLIAGE_CELL;
  ctx.lineCap = 'round';
  // drooping flat sprays: a twig with short needles both sides, fanning out from the top centre
  for (let layer = 0; layer < 3; layer++) {
    const sprays = 16 + layer * 5;
    for (let s = 0; s < sprays; s++) {
      const x0 = ox + C * (0.25 + rnd() * 0.5), y0 = oy + C * (0.12 + rnd() * 0.3);
      const ang = Math.PI * 0.5 + (rnd() - 0.5) * 1.6;
      const len = C * (0.25 + rnd() * 0.3);
      const steps = 22;
      let px = x0, py = y0;
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const a = ang + t * 0.5 * (rnd() - 0.5);
        const nx = px + Math.cos(a) * len / steps, ny = py + Math.sin(a) * len / steps;
        ctx.strokeStyle = hsl(150 + rnd() * 18, 0.25 + rnd() * 0.1, 0.1 + layer * 0.05 + rnd() * 0.05);
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(nx, ny); ctx.stroke();
        const nl = 7 * (1 - t * 0.6);
        for (const side of [-1, 1]) {
          const na = a + side * (1.0 + rnd() * 0.3);
          ctx.lineWidth = 1.2;
          ctx.strokeStyle = hsl(145 + rnd() * 20, 0.28 + rnd() * 0.12, 0.12 + layer * 0.06 + rnd() * 0.07);
          ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(nx + Math.cos(na) * nl, ny + Math.sin(na) * nl); ctx.stroke();
        }
        px = nx; py = ny;
        if (px < ox + 6 || px > ox + C - 6 || py > oy + C - 6) break;
      }
    }
  }
}

function drawJuniper(ctx: Ctx, ox: number, oy: number, rnd: () => number): void {
  const C = FOLIAGE_CELL, cx = ox + C / 2, cy = oy + C / 2;
  const k = [rnd() * 6, rnd() * 6, rnd() * 6];
  for (let layer = 0; layer < 3; layer++) {
    const n = 900 + layer * 200;
    for (let i = 0; i < n; i++) {
      const x = ox + 8 + rnd() * (C - 16), y = oy + 8 + rnd() * (C - 16);
      if (!inBlob(x, y, cx, cy, C * 0.43, k)) continue;
      const s = 2 + rnd() * 3;
      ctx.fillStyle = hsl(85 + rnd() * 30, 0.18 + rnd() * 0.12, 0.2 + layer * 0.08 + rnd() * 0.1);
      ctx.beginPath();
      ctx.ellipse(x, y, s, s * 0.6, rnd() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (let i = 0; i < 40; i++) {
    const x = ox + 20 + rnd() * (C - 40), y = oy + 20 + rnd() * (C - 40);
    if (!inBlob(x, y, cx, cy, C * 0.38, k)) continue;
    ctx.fillStyle = hsl(225, 0.25, 0.42 + rnd() * 0.1);
    ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill();
  }
}

let cached: DataTexture | null = null;

/**
 * Atlas texture (rows are NOT flipped: texel row 0 = top of the drawn canvas). Species s occupies
 * u ∈ [(s % 2)·0.5, +0.5], v ∈ [floor(s / 2)·0.5, +0.5] with v growing downward in the drawing.
 */
export function foliageAtlas(): DataTexture {
  if (cached) return cached;
  const size = FOLIAGE_CELL * 2;
  const canvas: HTMLCanvasElement | OffscreenCanvas = typeof OffscreenCanvas !== 'undefined'
    ? new OffscreenCanvas(size, size)
    : Object.assign(document.createElement('canvas'), { width: size, height: size });
  const ctx = canvas.getContext('2d') as Ctx;
  ctx.clearRect(0, 0, size, size);
  const rnd = mulberry32(4242);
  drawPoplar(ctx, 0, 0, rnd);
  drawPine(ctx, FOLIAGE_CELL, 0, rnd);
  drawSpruce(ctx, 0, FOLIAGE_CELL, rnd);
  drawJuniper(ctx, FOLIAGE_CELL, FOLIAGE_CELL, rnd);
  // Bleed colour into transparent texels (keeps mip edges from going dark): copy RGB of nearest opaque texel.
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let pass = 0; pass < 4; pass++) {
    const src = new Uint8ClampedArray(d);
    for (let y = 1; y < size - 1; y++) {
      for (let x = 1; x < size - 1; x++) {
        const i = (y * size + x) * 4;
        if (src[i + 3] > 0) continue;
        let r = 0, g = 0, b = 0, n = 0;
        for (const o of [-4, 4, -size * 4, size * 4]) {
          const j = i + o;
          if (src[j + 3] > 0 || (src[j] + src[j + 1] + src[j + 2]) > 0) { r += src[j]; g += src[j + 1]; b += src[j + 2]; n++; }
        }
        if (n > 0) { d[i] = r / n; d[i + 1] = g / n; d[i + 2] = b / n; }
      }
    }
  }
  const tex = new DataTexture(new Uint8Array(d.buffer.slice(0)), size, size, RGBAFormat, UnsignedByteType);
  tex.colorSpace = SRGBColorSpace;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.magFilter = LinearFilter;
  tex.wrapS = ClampToEdgeWrapping;
  tex.wrapT = ClampToEdgeWrapping;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  tex.flipY = false;
  tex.needsUpdate = true;
  cached = tex;
  return tex;
}
