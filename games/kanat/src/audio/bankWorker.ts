// Inline Web Worker: generates the whole sound bank off the main thread and transfers each clip
// (zero-copy) as soon as it is ready. Imported by bank.ts via `?worker&inline` (works in the
// multi-file and single-file builds); bank.ts falls back to main-thread generation if this fails.
import { bankJobs } from './bankJobs.ts';

interface WorkerScope {
  onmessage: ((e: MessageEvent) => void) | null;
  postMessage(msg: unknown, transfer?: Transferable[]): void;
}

const scope = self as unknown as WorkerScope;

scope.onmessage = () => {
  for (const [k, fn] of bankJobs()) {
    const p = fn();
    scope.postMessage({ k, sr: p.sr, ch: p.ch }, p.ch.map((c) => c.buffer));
  }
  scope.postMessage({ done: true });
};
