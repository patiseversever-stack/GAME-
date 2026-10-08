// Typed event bus. Listener errors are isolated (one bad listener never breaks the others).
// emit() does not allocate: listeners live in a Set that is iterated in place.

export type Listener<T> = (payload: T) => void;

export class EventBus<E extends object> {
  private readonly map = new Map<keyof E, Set<Listener<never>>>();
  /** Called when a listener throws. Defaults to console.error. */
  onListenerError: (type: keyof E, err: unknown) => void = (type, err) => {
    console.error(`[events] listener for "${String(type)}" threw`, err);
  };

  on<K extends keyof E>(type: K, fn: Listener<E[K]>): () => void {
    let set = this.map.get(type);
    if (!set) {
      set = new Set();
      this.map.set(type, set);
    }
    set.add(fn as Listener<never>);
    return () => this.off(type, fn);
  }

  once<K extends keyof E>(type: K, fn: Listener<E[K]>): () => void {
    const off = this.on(type, (p: E[K]) => {
      off();
      fn(p);
    });
    return off;
  }

  off<K extends keyof E>(type: K, fn: Listener<E[K]>): void {
    this.map.get(type)?.delete(fn as Listener<never>);
  }

  emit<K extends keyof E>(type: K, payload: E[K]): void {
    const set = this.map.get(type);
    if (!set || set.size === 0) return;
    for (const fn of set) {
      try {
        (fn as Listener<E[K]>)(payload);
      } catch (err) {
        this.onListenerError(type, err);
      }
    }
  }

  listenerCount<K extends keyof E>(type: K): number {
    return this.map.get(type)?.size ?? 0;
  }

  clear(): void {
    this.map.clear();
  }
}
