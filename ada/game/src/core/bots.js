// Bot beyni: yarışı "görür" ve oyuncuyla aynı hamle dilinde karar verir.
// İleride bir botun yerine gerçek oyuncu geçtiğinde kural motoru hiçbir fark görmez.
import { createRng } from './rng.js';
import { LANE_WIDTH } from './constants.js';

// Kişilikler KARAKTERLER.md ile uyumlu: tepki süresi, hata payı, hız
export const BOT_PERSONALITIES = {
  baris: { name: 'Barış', reaction: 0.16, error: 0.05, timingNoise: 0.05, speedFactor: 0.985, team: 'yakamoz' },
  can: { name: 'Can', reaction: 0.12, error: 0.12, timingNoise: 0.09, speedFactor: 1.015, team: 'yakamoz' },
  selin: { name: 'Selin', reaction: 0.2, error: 0.04, timingNoise: 0.04, speedFactor: 0.97, team: 'safak' },
};

export function createBotBrain(personality, seed) {
  return { p: personality, rng: createRng(seed), plans: new Map(), pending: [], lastFalls: 0 };
}

const laneOf = (r) => Math.max(-1, Math.min(1, Math.round(r.x / LANE_WIDTH)));

// İdeal hamle zamanı: engele kaç saniye kala
const IDEAL = { hurdle: 0.3, gap: 0.08, arch: 0.32, block: 0.75 };

export function botThink(brain, state, runner) {
  const out = [];
  const { p, rng } = brain;
  const now = state.tick;

  // sıraya konmuş hamleleri zamanı gelince bırak
  brain.pending = brain.pending.filter((a) => {
    if (a.tick <= now) {
      out.push({ runner: runner.id, type: a.type });
      return false;
    }
    return true;
  });

  // düştükten sonra yeni deneme: eski planları unut
  if (brain.lastFalls !== runner.falls) {
    brain.lastFalls = runner.falls;
    brain.plans.clear();
    brain.pending = [];
  }
  if (runner.state === 'finished' || runner.state === 'fall' || runner.state === 'zip') return out;
  const speed = Math.max(runner.speed, 4);
  const lane = runner.lane;
  const course = state.course;
  const lookahead = speed * 1.6;

  const plan = (key, type, secondsFromNow) => {
    if (brain.plans.has(key)) return;
    brain.plans.set(key, true);
    if (rng.chance(p.error)) {
      // hata: ya geç kalır ya hiç yapmaz
      if (rng.chance(0.5)) return;
      secondsFromNow += 0.25;
    }
    const delay = Math.max(0, secondsFromNow + rng.range(-p.timingNoise, p.timingNoise));
    brain.pending.push({ tick: now + Math.round(delay * 60), type });
  };

  // engeller
  for (const o of course.obstacles) {
    const dist = o.z - runner.z;
    if (dist < 0 || dist > lookahead) continue;
    const tta = dist / speed;
    const key = `o${o.id}`;
    if (tta > IDEAL[o.type] + p.reaction + 0.5) continue;
    if (o.type === 'block') {
      if (!o.lanes.includes(lane)) continue;
      const free = [-1, 0, 1].filter((l) => !o.lanes.includes(l)).sort((a, b) => Math.abs(a - lane) - Math.abs(b - lane));
      if (!free.length) continue;
      const dir = free[0] < lane ? 'left' : 'right';
      const steps = Math.abs(free[0] - lane);
      for (let i = 0; i < steps; i++) plan(`${key}_${i}`, dir, Math.max(0, tta - IDEAL.block) * 0.5 + p.reaction + i * 0.12);
    } else if (o.lanes.includes(lane)) {
      const type = o.type === 'arch' ? 'slide' : 'jump';
      plan(key, type, Math.max(0, tta - IDEAL[o.type]));
    }
  }

  // düşme bölgeleri
  for (const h of course.hazards) {
    if (h.type === 'gap') {
      const dist = h.z0 - runner.z;
      if (dist < 0 || dist > lookahead) continue;
      const tta = dist / speed;
      if (tta > IDEAL.gap + p.reaction + 0.5) continue;
      plan(`g${h.z0}`, 'jump', Math.max(0, tta - IDEAL.gap - 0.05));
    } else if (h.type === 'bridge') {
      const dist = h.z0 - runner.z;
      if (dist < -2 || dist > lookahead + 10) continue;
      if (laneOf(runner) !== 0 && runner.lane !== 0) {
        plan(`b${h.z0}_${now >> 5}`, runner.lane < 0 ? 'right' : 'left', p.reaction);
      }
    } else if (h.type === 'zip') {
      if (runner.z >= h.grab0 - 1 && runner.z < h.grab1) {
        const reachIn = Math.max(0, (h.grab0 - runner.z) / speed);
        plan(`z${h.grab0}`, 'grab', reachIn + p.reaction + 0.1);
      }
    }
  }
  return out;
}
