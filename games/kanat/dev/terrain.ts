// Terrain dev page: loads a baked world through the real loader and shows every texture + sampler readout.
import { loadWorld, type LoadedWorld } from '../src/content/worlds.ts';
import { WORLD_IDS, type WorldId } from '../src/sim/types.ts';

declare global {
  interface Window {
    __shotReady?: boolean;
  }
}

const sel = document.getElementById('world') as HTMLSelectElement;
const grid = document.getElementById('grid') as HTMLDivElement;
const info = document.getElementById('info') as HTMLDivElement;
const probe = document.getElementById('probe') as HTMLSpanElement;

for (const id of WORLD_IDS) sel.add(new Option(id, id));
const initial = (new URLSearchParams(location.search).get('world') ?? 'kapadokya') as WorldId;
sel.value = initial;

function addCanvas(label: string, src: ImageBitmap | null, draw?: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): HTMLCanvasElement {
  const fig = document.createElement('figure');
  const c = document.createElement('canvas');
  c.width = src ? Math.min(512, src.width) : 512;
  c.height = c.width;
  const ctx = c.getContext('2d') as CanvasRenderingContext2D;
  if (src) ctx.drawImage(src, 0, 0, c.width, c.height);
  if (draw) draw(ctx, c.width, c.height);
  const cap = document.createElement('figcaption');
  cap.textContent = label;
  fig.append(c, cap);
  grid.append(fig);
  return c;
}

function heightCanvas(w: LoadedWorld): (ctx: CanvasRenderingContext2D, W: number, H: number) => void {
  return (ctx, W, H) => {
    const img = ctx.createImageData(W, H);
    const cov = w.config.textures.coverage.core;
    const { min, max } = w.config.terrain.heightRange;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const h = w.sampler.height(cov.minX + ((x + 0.5) / W) * cov.size, cov.minZ + ((y + 0.5) / H) * cov.size);
        const t = Math.max(0, Math.min(1, (h - min) / (max - min)));
        const i = (y * W + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.round(t * 255);
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  };
}

async function show(id: WorldId): Promise<void> {
  window.__shotReady = false;
  grid.innerHTML = '';
  const t0 = performance.now();
  const w = await loadWorld(id);
  const ms = performance.now() - t0;
  const macro = addCanvas('color_macro (pre-lit)', w.images.colorMacro);
  addCanvas('color_far', w.images.colorFar);
  addCanvas('normal_core (oct)', w.images.normal);
  addCanvas('splat_core', w.images.splat);
  addCanvas('shadow_ao', w.images.shadowAo);
  addCanvas('sampler.height (CPU)', null, heightCanvas(w));
  const cov = w.config.textures.coverage.core;
  macro.onmousemove = (e) => {
    const r = macro.getBoundingClientRect();
    const x = cov.minX + ((e.clientX - r.left) / r.width) * cov.size;
    const z = cov.minZ + ((e.clientY - r.top) / r.height) * cov.size;
    probe.textContent = `x ${x.toFixed(0)} z ${z.toFixed(0)}  H ${w.sampler.height(x, z).toFixed(2)} m  slope ${w.sampler.slopeDeg(x, z).toFixed(1)}°  rock ${w.sampler.rockAt(x, z).toFixed(2)}`;
  };
  const c = w.config;
  info.textContent = [
    `${c.name.tr} — ${c.geo.lat}, ${c.geo.lon} (vs ${c.geo.verticalScale}, ${c.geo.source}) loaded in ${ms.toFixed(0)} ms`,
    `core ${c.terrain.core.min.toFixed(1)}..${c.terrain.core.max.toFixed(1)} m, far ${c.terrain.far.min.toFixed(1)}..${c.terrain.far.max.toFixed(1)} m, sea ${c.hasSea}`,
    `sun az ${c.sun.azimuthDeg}° el ${c.sun.elevationDeg}° ${c.sun.color}; ktx2 ${w.images.colorMacroKtx2 ? w.images.colorMacroKtx2.byteLength : 'none'}`,
    `note: ${c.geo.note}`,
  ].join('\n');
  window.__shotReady = true;
}

sel.onchange = () => void show(sel.value as WorldId);
void show(initial);
