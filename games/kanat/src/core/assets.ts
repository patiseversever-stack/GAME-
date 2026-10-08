// Runtime asset access. ALL runtime files under public/ must be loaded through this module so the
// single-file build (dist/single) can serve them from an embedded pack instead of the network.
// Owner: platform agent (extends the single-file pack path). Paths are relative to public/, e.g. 'worlds/kapadokya/world.json'.

declare const __KANAT_SINGLE__: boolean | undefined;

type PackResolver = (path: string) => Promise<ArrayBuffer | null>;
let packResolver: PackResolver | null = null;

/** Single-file build registers an embedded pack resolver at boot. */
export function registerAssetPack(resolver: PackResolver): void {
  packResolver = resolver;
}

export function isSingleFileBuild(): boolean {
  return typeof __KANAT_SINGLE__ !== 'undefined' && __KANAT_SINGLE__ === true;
}

/** URL usable by loaders that need one (images, fonts). In single-file mode prefer fetchAsset + Blob URLs. */
export function assetUrl(path: string): string {
  return `./${path.replace(/^\.?\//, '')}`;
}

export async function fetchAsset(path: string): Promise<ArrayBuffer> {
  if (packResolver) {
    const hit = await packResolver(path);
    if (hit) return hit;
  }
  const res = await fetch(assetUrl(path));
  if (!res.ok) throw new Error(`asset ${path}: HTTP ${res.status}`);
  return res.arrayBuffer();
}

export async function fetchJson<T>(path: string): Promise<T> {
  const buf = await fetchAsset(path);
  return JSON.parse(new TextDecoder().decode(buf)) as T;
}

/** Object URL for a binary asset (images, fonts) — works in both builds. */
export async function assetObjectUrl(path: string, mime: string): Promise<string> {
  const buf = await fetchAsset(path);
  return URL.createObjectURL(new Blob([buf], { type: mime }));
}
