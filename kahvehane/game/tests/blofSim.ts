// Blöf test yardımcısı: botlarla saf motor üzerinde, olay zamanlamasını taklit eden küçük bir zamanlayıcıyla oyun oynatır.
// (Ev sahibi LocalHost'tan bağımsız: motoru ve botları yalıtık sınar.)
import {BlofBot, type BlofDifficulty} from '../src/ai/blofBot';
import {actors, applyBlof, checkBlofInvariants, createBlof, redactBlofEvent, viewFor} from '../src/core/blof';
import type {BlofAction, BlofConfig, BlofEvent, BlofState} from '../src/core/blofTypes';

export interface SimResult {
  state: BlofState;
  events: BlofEvent[];
  /** Koltuk başına o koltuğa süzülmüş olaylar. */
  seen: BlofEvent[][];
  steps: number;
  bots: BlofBot[];
}

export interface SimOptions {
  maxSteps?: number;
  /** Her adımdan sonra çağrılır (tam durum). */
  onStep?: (s: BlofState, evs: BlofEvent[], a: BlofAction) => void;
  botSeed?: number;
  /** Botları dışarıdan kurmak için (parametre denemeleri). */
  botFactory?: (seat: number) => BlofBot;
}

export function simulate(cfg: BlofConfig, diffs: BlofDifficulty[], o: SimOptions = {}): SimResult {
  const g = createBlof(cfg);
  let s = g.state;
  const n = cfg.seats;
  const bots = diffs.map((d, i) => (o.botFactory ? o.botFactory(i) : new BlofBot(i, d, (o.botSeed ?? cfg.seed) * 131 + i * 7 + 1)));
  const events: BlofEvent[] = [];
  const seen: BlofEvent[][] = Array.from({length: n}, () => []);
  const feed = (evs: BlofEvent[]) => {
    for (const e of evs) {
      events.push(e);
      for (let i = 0; i < n; i++) {
        const r = redactBlofEvent(e, i);
        if (r) {
          seen[i].push(r);
          bots[i].observe(r);
        }
      }
    }
  };
  feed(g.events);
  let t = 0;
  let windowAt = Infinity;
  const pending: ({at: number; epoch: number; action: BlofAction} | null)[] = new Array(n).fill(null);
  const max = o.maxSteps ?? 20000;
  let steps = 0;
  while (s.phase !== 'over' && steps < max) {
    steps++;
    for (const seat of actors(s)) {
      const p = pending[seat];
      if (p && p.epoch === s.move) continue;
      const d = bots[seat].decide(viewFor(s, seat));
      pending[seat] = d ? {at: t + d.delayMs, epoch: s.move, action: d.action} : null;
    }
    let best = -1;
    let bestAt = Infinity;
    for (let i = 0; i < n; i++) {
      const p = pending[i];
      if (p && p.epoch === s.move && p.at < bestAt) {
        best = i;
        bestAt = p.at;
      }
    }
    let action: BlofAction;
    if (s.phase === 'window' && windowAt <= bestAt) {
      t = windowAt;
      action = {t: 'windowClosed', id: s.window!.id};
    } else if (best >= 0) {
      t = bestAt;
      action = pending[best]!.action;
      pending[best] = null;
    } else throw new Error(`kimse hamle yapmıyor (evre ${s.phase}, sıra ${s.turn})`);
    const r = applyBlof(s, action);
    if (r.error !== undefined) throw new Error(`geçersiz hamle ${JSON.stringify(action)}: ${r.error}`);
    const prevWin = s.window?.id;
    s = r.state;
    feed(r.events);
    if (s.phase === 'window' && s.window!.id !== prevWin) windowAt = t + s.window!.ms;
    if (s.phase !== 'window') windowAt = Infinity;
    const bad = checkBlofInvariants(s);
    if (bad) throw new Error(`tutarsız durum: ${bad}`);
    o.onStep?.(s, r.events, action);
  }
  return {state: s, events, seen, steps, bots};
}
