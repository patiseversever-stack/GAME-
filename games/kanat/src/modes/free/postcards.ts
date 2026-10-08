// Postcard anchors (integrator). The design fixes names + features; world positions "are resolved later by id"
// (src/content/meta/postcards.ts). Until the routes agent places them, each anchor is derived deterministically
// from its `nearRoute` career line: a point at a per-card fraction of the line, pushed 70 m to the side,
// 30 m above the terrain. Serbest Uçuş shows a frame glint within 150 m; Foto Modu collects within 120 m.
import { POSTCARDS } from '../../content/meta/postcards.ts';
import type { StageWorld } from '../../game/WorldStore.ts';

export interface PostcardAnchor {
  id: string;
  pos: [number, number, number];
}

const cache = new Map<string, PostcardAnchor[]>();

export function postcardAnchors(stage: StageWorld): PostcardAnchor[] {
  const hit = cache.get(stage.id);
  if (hit) return hit;
  const out: PostcardAnchor[] = [];
  const s = stage.loaded.sampler;
  for (const pc of POSTCARDS) {
    if (pc.world !== stage.id) continue;
    const route = stage.content.routes.find((r) => r.id === pc.anchor.nearRoute) ?? stage.content.routes[0];
    if (!route) continue;
    const line = route.line;
    const f = 0.18 + ((pc.index - 1) % 5) * 0.15;
    const i = Math.min(line.length - 2, Math.max(0, Math.floor(f * (line.length - 1))));
    const a = line[i];
    const b = line[i + 1];
    let dx = b[0] - a[0];
    let dz = b[2] - a[2];
    const l = Math.sqrt(dx * dx + dz * dz) || 1;
    dx /= l;
    dz /= l;
    const side = pc.index % 2 === 0 ? 1 : -1;
    const x = Math.round(a[0] - dz * 70 * side);
    const z = Math.round(a[2] + dx * 70 * side);
    const ground = Math.max(stage.loaded.config.hasSea ? 0 : -1e9, s.height(x, z));
    out.push({ id: pc.id, pos: [x, Math.round(ground + 30), z] });
  }
  cache.set(stage.id, out);
  return out;
}
