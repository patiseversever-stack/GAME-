// WebGL context loss / restore orchestration (§5.5).
//   - `webglcontextlost` → preventDefault (otherwise the browser never restores), notify FSM + registry.
//   - `webglcontextrestored` → run every restore hook (render rebuilds GPU resources), then resume.
// Render/UI/perf register hooks with onContextLost / onContextRestored; order = registration order.

type Hook = () => void | Promise<void>;

const lostHooks = new Set<Hook>();
const restoredHooks = new Set<Hook>();

export function onContextLost(fn: Hook): () => void {
  lostHooks.add(fn);
  return () => lostHooks.delete(fn);
}

export function onContextRestored(fn: Hook): () => void {
  restoredHooks.add(fn);
  return () => restoredHooks.delete(fn);
}

async function runAll(hooks: Set<Hook>, what: string): Promise<void> {
  for (const h of [...hooks]) {
    try {
      await h();
    } catch (err) {
      console.error(`[context] ${what} hook failed`, err);
    }
  }
}

export interface ContextFsm {
  contextLost(): void;
  contextRestored(): void;
}

export interface ContextHandle {
  canvas: HTMLCanvasElement;
  /** Force a loss via WEBGL_lose_context (tests). Returns false if the extension is missing. */
  forceLoss(): boolean;
  /** Restore after forceLoss(). */
  forceRestore(): boolean;
  readonly lost: boolean;
  lossCount: number;
  detach(): void;
}

let current: ContextHandle | null = null;

/** The canvas registered last (test API uses it). */
export function currentContext(): ContextHandle | null {
  return current;
}

/**
 * Attach loss handling to the game canvas. `gl` is optional; pass it so forceLoss() can use the
 * same context object the renderer owns.
 */
export function attachContextLossHandling(
  canvas: HTMLCanvasElement,
  fsm: ContextFsm,
  gl?: WebGLRenderingContext | WebGL2RenderingContext | null,
): ContextHandle {
  let lost = false;
  let ext: WEBGL_lose_context | null = null;
  const getExt = (): WEBGL_lose_context | null => {
    if (ext) return ext;
    const ctx = gl ?? (canvas.getContext('webgl2') as WebGL2RenderingContext | null);
    ext = ctx ? ctx.getExtension('WEBGL_lose_context') : null;
    return ext;
  };
  // Grab the extension now when the renderer's context is known (after a loss getExtension returns
  // null). Without `gl` we must not call getContext here: it would create the context before three.js.
  if (gl) getExt();

  const onLost = (e: Event): void => {
    e.preventDefault();
    if (lost) return;
    lost = true;
    handle.lossCount++;
    fsm.contextLost();
    void runAll(lostHooks, 'lost');
  };
  const onRestored = (): void => {
    if (!lost) return;
    lost = false;
    void runAll(restoredHooks, 'restored').then(() => fsm.contextRestored());
  };
  canvas.addEventListener('webglcontextlost', onLost, false);
  canvas.addEventListener('webglcontextrestored', onRestored, false);

  const handle: ContextHandle = {
    canvas,
    get lost() {
      return lost;
    },
    lossCount: 0,
    forceLoss() {
      const x = getExt();
      if (!x) return false;
      x.loseContext();
      return true;
    },
    forceRestore() {
      const x = getExt();
      if (!x) return false;
      x.restoreContext();
      return true;
    },
    detach() {
      canvas.removeEventListener('webglcontextlost', onLost, false);
      canvas.removeEventListener('webglcontextrestored', onRestored, false);
      if (current === handle) current = null;
    },
  };
  current = handle;
  return handle;
}
