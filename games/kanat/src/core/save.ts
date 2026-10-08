// Persistence (§4.3): versioned documents, migrations, ProfileStore with atomic writes.
//
//   ProfileStore        async key/value of JSON strings.
//   LocalProfileStore   localStorage (memory fallback when blocked); atomic: write `<key>.tmp`, then
//                       `<key>`, then drop the tmp. A crash in between is recovered on the next read.
//   HostProfileStore    host storage via the bridge (`storage:get/set`) is primary when the host
//                       answers; localStorage is the cache and the offline fallback (§7.2).
//   VersionedDoc<T>     load → migrate (v→v+1 chain) → validate → value; save() / scheduleSave().

export interface KVBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class MemoryKV implements KVBackend {
  readonly map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
}

/** localStorage if usable (private mode / sandboxed iframes can throw), else an in-memory map. */
export function defaultKV(): KVBackend {
  try {
    const ls = globalThis.localStorage;
    if (ls) {
      const probe = '__kanat_probe__';
      ls.setItem(probe, '1');
      ls.removeItem(probe);
      return ls;
    }
  } catch {
    // fall through
  }
  return new MemoryKV();
}

export const STORAGE_KEYS = {
  save: 'kanat.save',
  settings: 'kanat.settings',
  perfProfile: 'kanat.perf.profile.v1',
} as const;

export const TMP_SUFFIX = '.tmp';

function parses(s: string | null): boolean {
  if (s === null) return false;
  try {
    JSON.parse(s);
    return true;
  } catch {
    return false;
  }
}

export interface ProfileStore {
  readonly kind: 'local' | 'host';
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

/** Synchronous atomic helpers (also used by the perf profile, which must be readable at boot). */
export function atomicWrite(kv: KVBackend, key: string, value: string): void {
  kv.setItem(key + TMP_SUFFIX, value); // if this throws (quota) the old value is untouched
  kv.setItem(key, value);
  kv.removeItem(key + TMP_SUFFIX);
}

export function atomicRead(kv: KVBackend, key: string): string | null {
  const tmp = kv.getItem(key + TMP_SUFFIX);
  if (tmp !== null) {
    // A tmp only survives when a write was interrupted after the tmp was complete → it is the newest.
    if (parses(tmp)) {
      try {
        kv.setItem(key, tmp);
        kv.removeItem(key + TMP_SUFFIX);
      } catch {
        // read-only storage: still return the recovered value
      }
      return tmp;
    }
    try {
      kv.removeItem(key + TMP_SUFFIX);
    } catch {
      // ignore
    }
  }
  return kv.getItem(key);
}

export class LocalProfileStore implements ProfileStore {
  readonly kind = 'local' as const;
  readonly kv: KVBackend;
  constructor(kv: KVBackend = defaultKV()) {
    this.kv = kv;
  }
  async get(key: string): Promise<string | null> {
    return this.getSync(key);
  }
  getSync(key: string): string | null {
    try {
      return atomicRead(this.kv, key);
    } catch {
      return null;
    }
  }
  async set(key: string, value: string): Promise<void> {
    this.setSync(key, value);
  }
  setSync(key: string, value: string): void {
    atomicWrite(this.kv, key, value);
  }
  async remove(key: string): Promise<void> {
    this.kv.removeItem(key);
    this.kv.removeItem(key + TMP_SUFFIX);
  }
}

/** What the host-backed store needs from the bridge (GameBridge implements it). */
export interface HostStorageChannel {
  /** A host transport exists (not standalone). */
  hasHost(): boolean;
  /** Ask the host. Resolves `undefined` on timeout (host does not implement storage). */
  storageGet(key: string, timeoutMs: number): Promise<string | null | undefined>;
  storageSet(key: string, value: string): void;
}

export class HostProfileStore implements ProfileStore {
  readonly kind = 'host' as const;
  readonly cache: LocalProfileStore;
  private readonly channel: HostStorageChannel;
  private hostAnswers: boolean | null = null; // null = unknown yet
  private readonly timeoutMs: number;

  constructor(channel: HostStorageChannel, cache: LocalProfileStore = new LocalProfileStore(), timeoutMs = 800) {
    this.channel = channel;
    this.cache = cache;
    this.timeoutMs = timeoutMs;
  }

  /** null until the first get() resolved; then whether the host implements storage. */
  get hostStorageActive(): boolean | null {
    return this.hostAnswers;
  }

  async get(key: string): Promise<string | null> {
    const cached = this.cache.getSync(key);
    if (!this.channel.hasHost() || this.hostAnswers === false) return cached;
    const v = await this.channel.storageGet(key, this.timeoutMs);
    if (v === undefined) {
      this.hostAnswers = false; // host never answered → cache only for this session
      return cached;
    }
    this.hostAnswers = true;
    if (v === null) {
      // Host lost/never had it: the cache is the backup → re-seed the host.
      if (cached !== null) this.channel.storageSet(key, cached);
      return cached;
    }
    if (v !== cached) {
      try {
        this.cache.setSync(key, v);
      } catch {
        // cache full: host stays primary
      }
    }
    return v;
  }

  async set(key: string, value: string): Promise<void> {
    try {
      this.cache.setSync(key, value);
    } catch {
      // quota: the host copy still goes out
    }
    if (this.channel.hasHost()) this.channel.storageSet(key, value);
  }

  async remove(key: string): Promise<void> {
    await this.cache.remove(key);
    if (this.channel.hasHost()) this.channel.storageSet(key, 'null');
  }
}

// ---- versioned documents ---------------------------------------------------------------------

export interface DocSchema<T> {
  key: string;
  /** Current version written by this build. */
  version: number;
  /** migrations[n] converts a version-n document into version n+1. Version 0 = unversioned legacy. */
  migrations: Record<number, (doc: Record<string, unknown>) => Record<string, unknown>>;
  /** Sanitize a current-version document (never throws). */
  validate(raw: unknown): T;
  defaults(): T;
  /** Version field name (default `v`). */
  versionField?: string;
}

export interface MigrationResult {
  doc: Record<string, unknown>;
  from: number;
  to: number;
  migrated: boolean;
}

export function migrateDoc<T>(raw: unknown, schema: DocSchema<T>): MigrationResult {
  const field = schema.versionField ?? 'v';
  let doc: Record<string, unknown> =
    typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? { ...(raw as Record<string, unknown>) } : {};
  const rawV = doc[field];
  let v = typeof rawV === 'number' && Number.isInteger(rawV) && rawV >= 0 ? rawV : 0;
  const from = v;
  if (v > schema.version) {
    // Written by a newer build: keep what validates, never crash (downgrade-safe).
    return { doc, from, to: v, migrated: false };
  }
  while (v < schema.version) {
    const m = schema.migrations[v];
    if (!m) throw new Error(`no migration ${schema.key} v${v} → v${v + 1}`);
    doc = m(doc);
    v++;
    doc[field] = v;
  }
  return { doc, from, to: v, migrated: from !== v };
}

export class VersionedDoc<T> {
  private val: T;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly store: ProfileStore;
  readonly schema: DocSchema<T>;
  /** Info about the last load (for tests / debug). */
  lastLoad: { found: boolean; from: number; migrated: boolean; corrupt: boolean } = {
    found: false,
    from: 0,
    migrated: false,
    corrupt: false,
  };

  constructor(store: ProfileStore, schema: DocSchema<T>) {
    this.store = store;
    this.schema = schema;
    this.val = schema.defaults();
  }

  get value(): T {
    return this.val;
  }

  set value(v: T) {
    this.val = v;
  }

  async load(): Promise<T> {
    let raw: string | null = null;
    try {
      raw = await this.store.get(this.schema.key);
    } catch {
      raw = null;
    }
    if (raw === null) {
      this.lastLoad = { found: false, from: this.schema.version, migrated: false, corrupt: false };
      this.val = this.schema.defaults();
      return this.val;
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      const res = migrateDoc(parsed, this.schema);
      this.val = this.schema.validate(res.doc);
      this.lastLoad = { found: true, from: res.from, migrated: res.migrated, corrupt: false };
      if (res.migrated) await this.save();
    } catch (err) {
      console.warn(`[save] ${this.schema.key} unreadable, using defaults`, err);
      this.lastLoad = { found: true, from: 0, migrated: false, corrupt: true };
      this.val = this.schema.defaults();
    }
    return this.val;
  }

  async save(): Promise<void> {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    await this.store.set(this.schema.key, JSON.stringify(this.val));
  }

  /** Coalesce bursts of changes (slider drags) into one write. */
  scheduleSave(delayMs = 400): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.save();
    }, delayMs);
  }

  /** Write immediately if a save is pending (pagehide / visibility hidden). */
  async flush(): Promise<void> {
    if (this.timer !== null) await this.save();
  }
}
