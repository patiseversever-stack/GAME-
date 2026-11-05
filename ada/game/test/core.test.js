import { describe, it, expect } from 'vitest';
import { generateCourse } from '../src/core/course.js';
import { createRace, step, standings } from '../src/core/race.js';
import { BOT_PERSONALITIES, createBotBrain, botThink } from '../src/core/bots.js';
import { RUN } from '../src/core/constants.js';

function simulate(seed, maxTicks = 60 * 180) {
  const course = generateCourse(seed);
  const list = ['baris', 'can', 'selin'];
  const race = createRace({
    course,
    runners: list.map((k, i) => ({ id: i, name: BOT_PERSONALITIES[k].name, isBot: true, speedFactor: BOT_PERSONALITIES[k].speedFactor })),
  });
  const brains = list.map((k, i) => createBotBrain(BOT_PERSONALITIES[k], seed * 31 + i));
  const log = [];
  while (!race.finished && race.tick < maxTicks) {
    const actions = race.runners.flatMap((r, i) => botThink(brains[i], race, r));
    log.push(...actions.map((a) => ({ ...a, tick: race.tick })));
    step(race, actions);
  }
  return { race, log };
}

describe('parkur', () => {
  it('aynı tohum aynı parkuru üretir', () => {
    expect(generateCourse(7)).toEqual(generateCourse(7));
    expect(generateCourse(7)).not.toEqual(generateCourse(8));
  });
  it('engeller arasında tepki payı var', () => {
    const c = generateCourse(3);
    const zs = c.obstacles.map((o) => o.z).sort((a, b) => a - b);
    for (let i = 1; i < zs.length; i++) expect(zs[i] - zs[i - 1]).toBeGreaterThan(9);
  });
});

describe('yarış', () => {
  it('belirlenimci: aynı tohum ve hamleler aynı sonucu verir', () => {
    const a = simulate(11);
    const b = simulate(11);
    expect(a.race.runners.map((r) => r.finishTick)).toEqual(b.race.runners.map((r) => r.finishTick));
    expect(a.log).toEqual(b.log);
  });

  it('botlar parkuru bitirir', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const { race } = simulate(seed);
      expect(race.finished).toBe(true);
      const times = race.runners.map((r) => r.finishTick / 60);
      for (const t of times) {
        expect(t).toBeGreaterThan(45);
        expect(t).toBeLessThan(110);
      }
    }
  });

  it('zıplamayan koşucu sütuna çarpar, zıplayan geçer', () => {
    const course = { length: 60, sections: [], hazards: [], checkpoints: [0], obstacles: [{ id: 1, type: 'hurdle', z: 30, depth: 0.7, lanes: [-1, 0, 1] }] };
    const r1 = createRace({ course, runners: [{ id: 0 }] });
    while (!r1.finished) step(r1, []);
    expect(r1.runners[0].hits).toBe(1);

    const r2 = createRace({ course, runners: [{ id: 0 }] });
    let jumped = false;
    while (!r2.finished) {
      const run = r2.runners[0];
      const act = !jumped && run.z > 30 - run.speed * 0.3 ? [{ runner: 0, type: 'jump' }] : [];
      if (act.length) jumped = true;
      step(r2, act);
    }
    expect(r2.runners[0].hits).toBe(0);
  });

  it('boşluğa düşen geri döner ve süre kaybeder', () => {
    const course = { length: 80, sections: [], obstacles: [], checkpoints: [0], hazards: [{ type: 'gap', z0: 40, z1: 44, respawnZ: 32 }] };
    const race = createRace({ course, runners: [{ id: 0 }] });
    let sawFall = false;
    while (!race.finished && race.tick < 60 * 60) {
      const ev = step(race, []);
      if (ev.some((e) => e.type === 'fall')) sawFall = true;
      if (sawFall) break;
    }
    expect(sawFall).toBe(true);
    expect(race.runners[0].falls).toBe(1);
    for (let i = 0; i < 60 * RUN.fallTime + 2; i++) step(race, []);
    expect(race.runners[0].z).toBeLessThan(40);
  });

  it('sıralama bitiş sırasına göre', () => {
    const { race } = simulate(9);
    const s = standings(race);
    for (let i = 1; i < s.length; i++) expect(s[i].finishTick).toBeGreaterThanOrEqual(s[i - 1].finishTick);
  });
});
