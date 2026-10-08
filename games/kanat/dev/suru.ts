// SÜRÜ.io dev page: `npx vite --port 5187` → http://localhost:5187/dev/suru.html
// Live play by default. Screenshot presets (headless fast-forward, then a few rendered frames):
//   ?t=40                     advance 40 s of sim time (bots + autopilot player)
//   ?event=siege&n=1&dt=0.75  advance to the n-th KUŞATMA, then dt seconds; camera follows the attacker
//   ?event=hawkDive&dt=0.4    hawk chase (follows the target flock)
//   ?event=stormSpawn&dt=14   storm (follows the flock nearest to it)
//   ?event=convertWave&n=40   a contact colour wave
//   ?t=165                    last 30 s, sunset ring
//   ?shot=results             round end: Sürü Gösterisi + results card
//   ?ftue=1  ?sub=daily&day=214  ?sub=practice  ?tier=low|medium|high|ultra  ?hud=0  ?auto=1  ?seed=7  ?layout=fener
import { mount } from '../src/modes/suru/SuruMode.ts';
import type { SuruSubMode } from '../src/modes/suru/round.ts';
import type { QualityTier } from '../src/core/settings.ts';
import type { SuruEvent } from '../src/modes/suru/sim/types.ts';

declare global {
  interface Window {
    __shotReady?: boolean;
    __suru?: unknown;
  }
}

const q = new URLSearchParams(location.search);
const num = (k: string, d: number): number => (q.has(k) ? Number(q.get(k)) : d);
const tier = (q.get('tier') ?? 'high') as QualityTier;
const shot = q.has('t') || q.has('event') || q.has('shot');
const app = document.getElementById('app') as HTMLElement;

const handle = mount(app, {
  tier,
  lang: (q.get('lang') ?? 'tr') as 'tr' | 'en',
  seed: num('seed', 7),
  subMode: (q.get('sub') ?? 'league') as SuruSubMode,
  dayIndex: num('day', 214),
  layoutId: q.get('layout') ?? undefined,
  league: num('league', 2) as 0 | 1 | 2 | 3 | 4,
  ftue: q.get('ftue') === '1',
  twoThumbs: q.get('two') === '1',
  showShape: (q.get('shape') ?? 'kalp') as 'kalp',
  dev: { autopilot: shot || q.get('auto') === '1', hideHud: q.get('hud') === '0', noLoop: shot },
  onEvent: (e) => {
    if (q.get('log') === '1' && e.type !== 'convertWave' && e.type !== 'siegeProgress') console.log('[suru]', JSON.stringify(e));
  },
  onRoundEnd: (r) => console.log('[suru] round end', r.place, '/', r.of, r.shareText),
});
window.__suru = handle;

function nearestToStorm(): number {
  const sim = handle.round.sim;
  let best = 1;
  let bd = 1e9;
  for (let f = 1; f <= sim.flockCount; f++) {
    if (!sim.flockAlive[f]) continue;
    const d = Math.hypot(sim.leaderX[f] - sim.storm.x, sim.leaderZ[f] - sim.storm.z) - (sim.flockCountArr[f] > 30 ? 20 : 0);
    if (d < bd) {
      bd = d;
      best = f;
    }
  }
  return best;
}

if (shot) {
  const ev = q.get('event');
  let hit: SuruEvent | null = null;
  if (q.get('shot') === 'results') {
    handle.advance(181);
  } else if (ev) {
    hit = handle.advanceUntil(ev as SuruEvent['type'], num('n', 1), num('dt', 0), num('max', 200));
  } else {
    handle.advance(num('t', 0));
  }
  if (hit) {
    if ('attacker' in hit && hit.type === 'siege') handle.follow(hit.attacker);
    else if ('target' in hit) handle.follow(hit.target);
    else if ('to' in hit) handle.follow(hit.to);
    else if ('flock' in hit) handle.follow(hit.flock);
    if (hit.type === 'stormSpawn') handle.follow(nearestToStorm());
  }
  if (q.has('follow')) handle.follow(num('follow', 1));
  const frames = num('frames', q.get('shot') === 'results' ? 40 : 3);
  // settle the camera with a few frames (visual time only; sim is stepped by frame dt)
  for (let k = 0; k < frames; k++) handle.renderFrame(q.get('shot') === 'results' ? 0.12 : 1 / 60);
  console.log('[suru] stats', JSON.stringify(handle.renderer.stats()), 't', handle.round.sim.timeSec.toFixed(2));
  window.__shotReady = true;
}
