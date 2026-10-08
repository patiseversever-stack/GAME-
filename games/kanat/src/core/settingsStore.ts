// Settings persistence: load → merge defaults → validate → value; set(patch) → change event + debounced save.

import { EventBus } from './events.ts';
import type { ProfileStore } from './save.ts';
import { STORAGE_KEYS, VersionedDoc } from './save.ts';
import type { DocSchema } from './save.ts';
import type { DeepPartial, Settings } from './settings.ts';
import { DEFAULT_SETTINGS, diffSettings, mergeSettings, validateSettings } from './settings.ts';

export const SETTINGS_SCHEMA: DocSchema<Settings> = {
  key: STORAGE_KEYS.settings,
  version: 1,
  // v0 = unversioned: same field names, validation fills the gaps.
  migrations: { 0: (doc) => doc },
  validate: validateSettings,
  defaults: () => validateSettings(DEFAULT_SETTINGS),
};

export interface SettingsChange {
  settings: Settings;
  prev: Settings;
  changed: string[];
}

export class SettingsStore {
  private readonly doc: VersionedDoc<Settings>;
  readonly events = new EventBus<{ change: SettingsChange }>();

  constructor(store: ProfileStore) {
    this.doc = new VersionedDoc(store, SETTINGS_SCHEMA);
  }

  async load(): Promise<Settings> {
    return this.doc.load();
  }

  get value(): Readonly<Settings> {
    return this.doc.value;
  }

  get lastLoad(): VersionedDoc<Settings>['lastLoad'] {
    return this.doc.lastLoad;
  }

  /** Apply a partial change. Returns the dotted keys that changed. `persist=false` for host overrides. */
  set(patch: DeepPartial<Settings>, persist = true): string[] {
    const prev = this.doc.value;
    const next = mergeSettings(prev, patch);
    const changed = diffSettings(prev, next);
    if (changed.length === 0) return changed;
    this.doc.value = next;
    if (persist) this.doc.scheduleSave();
    this.events.emit('change', { settings: next, prev, changed });
    return changed;
  }

  onChange(fn: (c: SettingsChange) => void): () => void {
    return this.events.on('change', fn);
  }

  reset(): void {
    this.set(DEFAULT_SETTINGS);
  }

  save(): Promise<void> {
    return this.doc.save();
  }

  flush(): Promise<void> {
    return this.doc.flush();
  }
}
