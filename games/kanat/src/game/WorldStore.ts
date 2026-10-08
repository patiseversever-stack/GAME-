// World data cache (integrator): terrain + images (src/content/worlds.ts loadWorld) + gameplay content
// (routes, balloons, props, collision index) + water bodies for the sim. At most two worlds stay resident;
// evicted worlds release their ImageBitmaps.
import { fetchAsset } from '../core/assets.ts';
import { loadWorld, worldFile, type LoadedWorld } from '../content/worlds.ts';
import type { WaterBody } from '../sim/flight/proximity.ts';
import { decodeHeightGrid } from '../sim/terrain/decode.ts';
import type { RouteDef, WorldId } from '../sim/types.ts';
import { buildWorldContent, type WorldContent } from './routes/worldContent.ts';

/** Routes delivered by the routes agent (src/content/routes/wXrY.json) win over the provisional generator. */
const JSON_ROUTES: Record<string, RouteDef> = (() => {
  const mods = import.meta.glob('../content/routes/w*r*.json', { eager: true, import: 'default' }) as Record<string, RouteDef>;
  const out: Record<string, RouteDef> = {};
  for (const k of Object.keys(mods)) {
    const r = mods[k];
    if (r && typeof r.id === 'string' && /^w[1-5]r[1-4]$/.test(r.id)) out[r.id] = r;
  }
  return out;
})();

export function jsonRouteIds(): string[] {
  return Object.keys(JSON_ROUTES).sort();
}

export interface StageWorld {
  id: WorldId;
  loaded: LoadedWorld;
  content: WorldContent;
  water: WaterBody[];
  loadMs: number;
}

export class WorldStore {
  private readonly cache = new Map<WorldId, Promise<StageWorld>>();
  private readonly order: WorldId[] = [];
  private readonly resident: Map<WorldId, StageWorld> = new Map();

  get(id: WorldId, onProgress?: (k: number) => void): Promise<StageWorld> {
    const hit = this.cache.get(id);
    if (hit) {
      onProgress?.(1);
      return hit;
    }
    const p = this.load(id, onProgress);
    this.cache.set(id, p);
    p.catch(() => this.cache.delete(id));
    return p;
  }

  peek(id: WorldId): StageWorld | null {
    return this.resident.get(id) ?? null;
  }

  private async load(id: WorldId, onProgress?: (k: number) => void): Promise<StageWorld> {
    const t0 = performance.now();
    onProgress?.(0.05);
    const loaded = await loadWorld(id);
    onProgress?.(0.55);
    // let the loading screen paint before the CPU-heavy content build
    await new Promise((r) => setTimeout(r, 0));
    const content = buildWorldContent(id, loaded.sampler, loaded.config, { json: JSON_ROUTES, now: () => performance.now() });
    onProgress?.(0.85);
    const water: WaterBody[] = [];
    const pinfo = loaded.config.terrain.patchInfo;
    if (pinfo?.water) {
      try {
        const bytes = new Uint8Array(await fetchAsset(worldFile(id, pinfo.water.file)));
        water.push({ y: 0, grid: decodeHeightGrid(bytes, pinfo.water) });
      } catch (err) {
        console.warn('[world] pool water grid unavailable', err);
      }
    }
    const sw: StageWorld = { id, loaded, content, water, loadMs: performance.now() - t0 };
    this.resident.set(id, sw);
    this.order.push(id);
    onProgress?.(1);
    return sw;
  }

  /** Drop all worlds except `keep` (CPU memory: height grids, prop lists, image bitmaps). */
  evictExcept(keep: readonly WorldId[]): void {
    for (const id of [...this.resident.keys()]) {
      if (keep.includes(id)) continue;
      const sw = this.resident.get(id);
      this.resident.delete(id);
      this.cache.delete(id);
      const im = sw?.loaded.images;
      if (im) for (const b of [im.normal, im.splat, im.shadowAo, im.colorMacro, im.colorFar]) b.close?.();
    }
  }
}
