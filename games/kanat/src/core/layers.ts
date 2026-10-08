// Layer stack for the Android back button / Escape (§7.2 `back`): the topmost open layer
// (modal, pause menu, settings, photo mode …) closes first; with nothing open the bridge sends `exit`.

export interface LayerHandle {
  readonly name: string;
  /** Remove without calling close (the layer closed itself). */
  pop(): void;
}

interface Entry {
  name: string;
  close: () => void | boolean;
}

const stack: Entry[] = [];

/**
 * Register an open layer. `close` runs on back; return `false` from it to refuse
 * (e.g. a blocking dialog) — the layer then stays and back is consumed.
 */
export function pushLayer(name: string, close: () => void | boolean): LayerHandle {
  const entry: Entry = { name, close };
  stack.push(entry);
  return {
    name,
    pop() {
      const i = stack.indexOf(entry);
      if (i >= 0) stack.splice(i, 1);
    },
  };
}

/** Close the topmost layer. Returns true if a layer consumed the back press. */
export function closeTopLayer(): boolean {
  const top = stack[stack.length - 1];
  if (!top) return false;
  let result: void | boolean;
  try {
    result = top.close();
  } catch (err) {
    console.error('[layers] close failed', err);
  }
  if (result !== false) {
    const i = stack.lastIndexOf(top);
    if (i >= 0) stack.splice(i, 1);
  }
  return true;
}

export function layerNames(): string[] {
  return stack.map((e) => e.name);
}

export function layerCount(): number {
  return stack.length;
}

export function clearLayers(): void {
  stack.length = 0;
}
