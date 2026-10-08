// Runtime asset access. ALL runtime files under public/ must be loaded through this module so the
// single-file build (dist/single) can serve them from an embedded pack instead of the network.
// Owner: platform agent (extends the single-file pack path). Paths are relative to public/, e.g. 'worlds/kapadokya/world.json'.
//
// Single-file pack layout (written by tools/gen-single-pack.ts via vite.single.config.ts):
//   <script type="application/json" id="kanat-pack-index">{"v":1,"files":{"<path>":{"m":"<mime>","n":<bytes>,"s":"i"|<packIndex>}},"packs":["packs/kanat-pack-1.js",…]}</script>
//   <script type="application/x-kanat-asset" data-p="<path>">BASE64</script>   (inline files)
//   packs/kanat-pack-N.js → (self.__kanatPack = self.__kanatPack || []).push({ files: { "<path>": "BASE64" } })
// Overflow packs are classic <script> files: they load next to kanat.html even from file:// (fetch cannot).

import { base64ToBytes } from './base64.ts';

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

const norm = (path: string): string => path.replace(/^\.?\//, '');

/**
 * URL usable by loaders that need one (images, fonts). In the single-file build an inline pack file
 * gets a (cached) Blob URL; files living in overflow packs need assetUrlAsync / assetObjectUrl.
 */
export function assetUrl(path: string): string {
  const p = norm(path);
  if (embedded) {
    const u = embedded.syncBlobUrl(p);
    if (u) return u;
  }
  return `./${p}`;
}

/** Like assetUrl but also resolves files from overflow packs (single-file build). */
export async function assetUrlAsync(path: string): Promise<string> {
  const p = norm(path);
  if (embedded && embedded.has(p)) {
    const buf = await embedded.get(p);
    if (buf) return embedded.blobUrl(p, buf);
  }
  return `./${p}`;
}

export async function fetchAsset(path: string): Promise<ArrayBuffer> {
  const p = norm(path);
  if (packResolver) {
    const hit = await packResolver(p);
    if (hit) return hit;
  }
  const res = await (nativeFetch ?? fetch)(`./${p}`);
  if (!res.ok) throw new Error(`asset ${p}: HTTP ${res.status}`);
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

// ---- embedded pack (single-file build) ---------------------------------------------------------

export interface PackIndexEntry {
  /** mime type */
  m: string;
  /** raw byte length */
  n: number;
  /** 'i' = inline in the html, number = overflow pack index */
  s: 'i' | number;
}

export interface PackIndex {
  v: 1;
  files: Record<string, PackIndexEntry>;
  packs: string[];
}

export interface PackInfo {
  files: number;
  inlineFiles: number;
  overflowPacks: number;
  bytes: number;
}

type PackPayload = { files: Record<string, string> };

interface PackWindow {
  __kanatPack?: PackPayload[] | { push(p: PackPayload): void };
}

class EmbeddedPack {
  readonly index: PackIndex;
  private readonly doc: Document;
  private readonly inlineEls = new Map<string, Element>();
  private readonly overflowText = new Map<string, string>();
  private readonly bytes = new Map<string, ArrayBuffer>();
  private readonly blobUrls = new Map<string, string>();
  private readonly packLoads = new Map<number, Promise<void>>();

  constructor(index: PackIndex, doc: Document) {
    this.index = index;
    this.doc = doc;
    for (const el of Array.from(doc.querySelectorAll('script[type="application/x-kanat-asset"]'))) {
      const p = el.getAttribute('data-p');
      if (p) this.inlineEls.set(p, el);
    }
    // Packs that were loaded before boot (or by <script> tags) queue their payload in window.__kanatPack.
    const w = globalThis as unknown as PackWindow;
    const queued = Array.isArray(w.__kanatPack) ? w.__kanatPack : [];
    for (const p of queued) this.accept(p);
    w.__kanatPack = { push: (p: PackPayload) => this.accept(p) };
  }

  private accept(p: PackPayload): void {
    if (!p || typeof p.files !== 'object') return;
    for (const [path, b64] of Object.entries(p.files)) this.overflowText.set(path, b64);
  }

  has(path: string): boolean {
    return path in this.index.files;
  }

  private decodeInline(path: string): ArrayBuffer | null {
    const el = this.inlineEls.get(path);
    if (!el) return null;
    const bytes = base64ToBytes(el.textContent ?? '');
    // free the base64 text: the decoded bytes are cached from now on
    el.textContent = '';
    this.inlineEls.delete(path);
    const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    this.bytes.set(path, buf);
    return buf;
  }

  getSync(path: string): ArrayBuffer | null {
    return this.bytes.get(path) ?? this.decodeInline(path) ?? this.decodeOverflow(path);
  }

  private decodeOverflow(path: string): ArrayBuffer | null {
    const t = this.overflowText.get(path);
    if (t === undefined) return null;
    const bytes = base64ToBytes(t);
    this.overflowText.delete(path);
    const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    this.bytes.set(path, buf);
    return buf;
  }

  async get(path: string): Promise<ArrayBuffer | null> {
    const e = this.index.files[path];
    if (!e) return null;
    const hit = this.getSync(path);
    if (hit) return hit;
    if (typeof e.s === 'number') {
      await this.loadPack(e.s);
      return this.getSync(path);
    }
    return null;
  }

  loadPack(i: number): Promise<void> {
    let p = this.packLoads.get(i);
    if (p) return p;
    const src = this.index.packs[i];
    p = new Promise<void>((resolve, reject) => {
      if (!src) {
        reject(new Error(`pack ${i} missing from index`));
        return;
      }
      const s = this.doc.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`pack ${src} failed to load (must sit next to kanat.html)`));
      this.doc.head.appendChild(s);
    });
    this.packLoads.set(i, p);
    return p;
  }

  syncBlobUrl(path: string): string | null {
    const cached = this.blobUrls.get(path);
    if (cached) return cached;
    if (!this.has(path)) return null;
    const buf = this.getSync(path);
    return buf ? this.blobUrl(path, buf) : null;
  }

  blobUrl(path: string, buf: ArrayBuffer): string {
    const cached = this.blobUrls.get(path);
    if (cached) return cached;
    const u = URL.createObjectURL(new Blob([buf], { type: this.index.files[path]?.m ?? 'application/octet-stream' }));
    this.blobUrls.set(path, u);
    return u;
  }

  info(): PackInfo {
    let bytes = 0;
    let inline = 0;
    for (const e of Object.values(this.index.files)) {
      bytes += e.n;
      if (e.s === 'i') inline++;
    }
    return { files: Object.keys(this.index.files).length, inlineFiles: inline, overflowPacks: this.index.packs.length, bytes };
  }
}

let embedded: EmbeddedPack | null = null;
let nativeFetch: typeof fetch | null = null;

/** Read the pack index from the document (single-file build). Returns null when there is none. */
export function readPackIndex(doc: Document): PackIndex | null {
  const el = doc.getElementById('kanat-pack-index');
  if (!el) return null;
  try {
    const idx = JSON.parse(el.textContent ?? '') as PackIndex;
    return idx && idx.v === 1 && typeof idx.files === 'object' ? idx : null;
  } catch {
    return null;
  }
}

/**
 * Boot step for the single-file build: registers the embedded pack as the asset resolver and installs a
 * fetch shim so loaders that fetch relative URLs themselves (three.js FileLoader, KTX2Loader's
 * transcoder, fonts via fetch) are served from the pack too. No-op (returns null) without a pack.
 */
export function initEmbeddedPack(doc: Document = document, opts: { fetchShim?: boolean } = {}): PackInfo | null {
  if (embedded) return embedded.info();
  const idx = readPackIndex(doc);
  if (!idx) return null;
  const pack = new EmbeddedPack(idx, doc);
  embedded = pack;
  registerAssetPack((p) => pack.get(p));
  if (opts.fetchShim !== false) installPackFetchShim(doc);
  return pack.info();
}

/** Map an absolute/relative URL to a pack path if it points inside the document's directory. */
export function packPathForUrl(url: string, baseHref: string): string | null {
  let u: URL;
  try {
    u = new URL(url, baseHref);
  } catch {
    return null;
  }
  const base = new URL('./', baseHref);
  if (u.origin !== base.origin && !(u.protocol === 'file:' && base.protocol === 'file:')) return null;
  if (!u.pathname.startsWith(base.pathname)) return null;
  return decodeURIComponent(u.pathname.slice(base.pathname.length));
}

function installPackFetchShim(doc: Document): void {
  const g = globalThis as unknown as { fetch: typeof fetch };
  if (nativeFetch || typeof g.fetch !== 'function') return;
  nativeFetch = g.fetch.bind(globalThis);
  const orig = nativeFetch;
  g.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const p = embedded ? packPathForUrl(url, doc.baseURI) : null;
    if (p && embedded && embedded.has(p)) {
      const buf = await embedded.get(p);
      if (buf) {
        return new Response(buf.slice(0), {
          status: 200,
          headers: { 'Content-Type': embedded.index.files[p].m, 'Content-Length': String(buf.byteLength) },
        });
      }
    }
    return orig(input as RequestInfo, init);
  }) as typeof fetch;
}

/** Pack summary (perf panel / test API). */
export function embeddedPackInfo(): PackInfo | null {
  return embedded ? embedded.info() : null;
}
