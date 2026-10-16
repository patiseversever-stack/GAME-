// Ana iş parçacığına nefes: uzun işleri (deste boyama, atlas, kart çizimi) parçalara böler; dokunuş ve animasyon aksamaz.
/** Bir sonraki görevde devam et (tarayıcı arada çizim ve dokunuşları işler). */
export const yieldToMain = (): Promise<void> => {
  const s = (globalThis as {scheduler?: {yield?: () => Promise<void>}}).scheduler;
  return s?.yield ? s.yield() : new Promise<void>(r => setTimeout(r, 0));
};

/** Son nefesten bu yana `ms` geçtiyse nefes verir. Döngü içinde ucuz çağrılabilir. */
export function makeTick(ms = 8): () => Promise<void> {
  let t = performance.now();
  return async () => {
    if (performance.now() - t < ms) return;
    await yieldToMain();
    t = performance.now();
  };
}

/** Tarayıcı boşalınca (en geç `timeout` ms sonra) çalıştır. */
export const whenIdle = (timeout = 1200): Promise<void> =>
  new Promise<void>(r => {
    const ric = (globalThis as {requestIdleCallback?: (cb: () => void, o?: {timeout: number}) => number}).requestIdleCallback;
    if (ric) ric(() => r(), {timeout});
    else setTimeout(r, 200);
  });
