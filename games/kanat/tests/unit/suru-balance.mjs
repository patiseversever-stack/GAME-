// SÜRÜ.io full-scale balance / conservation / contact runs (BRIEF §9.G 19, 22, 25, 26). Not part of vitest
// (minutes of CPU); run once and paste the summary into the report:
//   node tests/unit/suru-balance.mjs [--rounds 500] [--avg 100] [--contact 100] [--workers 4] [--league 2]
// Writes tests/out/suru-balance.json.
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

if (!isMainThread) {
  const { createRound, runRound } = await import(resolve(here, '../../src/modes/suru/round.ts'));
  const { SuruSim } = await import(resolve(here, '../../src/modes/suru/sim/SuruSim.ts'));
  const orbit = (sim, f, cx, cz, ro, sign, T, out) => {
    const x = sim.leaderX[f] - cx;
    const z = sim.leaderZ[f] - cz;
    const r = Math.hypot(x, z) || 1;
    const k = Math.max(-1, Math.min(2.5, (r - ro) / 10));
    const dx = (-z / r) * sign - (x / r) * k;
    const dz = (x / r) * sign - (z / r) * k;
    const l = Math.hypot(dx, dz);
    out.push({ tick: T, actorId: f, cmd: 'steer', args: [Math.round((dx / l) * 127), Math.round((dz / l) * 127)] });
  };
  parentPort.on('message', (task) => {
    if (task === null) process.exit(0);
    const t0 = performance.now();
    if (task.kind === 'round') {
      const round = createRound({ seed: task.seed, player: task.player, league: task.league });
      const res = runRound(round, { checkConservation: true });
      const ms = performance.now() - t0;
      const playerStats = res.stats.find((s) => s.flock === 1);
      parentPort.postMessage({
        task,
        winner: res.winner,
        winnerPersonality: res.winnerPersonality,
        leaderAt60: res.leaderAt60,
        conservationOk: res.conservationOk,
        outside: res.leadersOutsideRingAtEnd,
        ring: res.ringRadiusAtEnd,
        flocks: round.sim.flockCount,
        playerRank: playerStats ? playerStats.rank : 0,
        personalities: round.meta.map((m) => m.personality),
        msPerTick: ms / res.ticks,
        sieges: res.stats.reduce((a, s) => a + s.sieges, 0),
        eliminated: res.stats.filter((s) => s.eliminated).length,
        winnerSize: res.stats.find((s) => s.flock === res.winner)?.size ?? 0,
        perFlock: res.stats.map((s) => ({ p: round.meta[s.flock - 1].personality, rank: s.rank, size: s.size, peak: s.peakSize, sieges: s.sieges, elim: s.eliminated ? 1 : 0, conv: s.converted, wild: s.wildCollected })),
      });
    } else if (task.kind === 'contact') {
      const sim = new SuruSim({
        seed: task.seed,
        custom: { flocks: [{ x: -30, z: 0, hx: 1, hz: 0, followers: task.nA }, { x: 30, z: 0, hx: -1, hz: 0, followers: task.nB }] },
        hawks: false, storm: false, gusts: false, ring: false, capture: false, lastStanding: false,
      });
      const cmds = [];
      for (let T = 0; T < task.secs * 30; T++) {
        cmds.length = 0;
        orbit(sim, 1, -6, 0, 14, 1, T, cmds);
        orbit(sim, 2, 6, 0, 14, -1, T, cmds);
        sim.step(cmds);
        sim.drainEvents();
      }
      parentPort.postMessage({ task, a: sim.flockCountArr[1], b: sim.flockCountArr[2] });
    }
  });
} else {
  const arg = (name, def) => {
    const i = process.argv.indexOf(`--${name}`);
    return i >= 0 ? Number(process.argv[i + 1]) : def;
  };
  const ROUNDS = arg('rounds', 500);
  const AVG = arg('avg', 100);
  const CONTACT = arg('contact', 100);
  const WORKERS = arg('workers', 4);
  const LEAGUE = arg('league', 2);
  const tasks = [];
  for (let s = 0; s < ROUNDS; s++) tasks.push({ kind: 'round', seed: 10000 + s, player: 'utility', league: LEAGUE });
  for (let s = 0; s < AVG; s++) tasks.push({ kind: 'round', seed: 20000 + s, player: 'average', league: 0 });
  for (let s = 0; s < AVG; s++) tasks.push({ kind: 'round', seed: 30000 + s, player: 'average', league: 4 });
  for (let s = 0; s < CONTACT; s++) tasks.push({ kind: 'contact', seed: 40000 + s, nA: 100, nB: 50, secs: 20 });
  for (let s = 0; s < CONTACT; s++) tasks.push({ kind: 'contact', seed: 50000 + s, nA: 75, nB: 75, secs: 20 });
  const results = [];
  let next = 0;
  const t0 = Date.now();
  await new Promise((done) => {
    let alive = 0;
    for (let w = 0; w < WORKERS; w++) {
      const worker = new Worker(fileURLToPath(import.meta.url));
      alive++;
      const feed = () => {
        if (next < tasks.length) worker.postMessage(tasks[next++]);
        else {
          worker.postMessage(null);
        }
      };
      worker.on('message', (m) => {
        results.push(m);
        if (results.length % 25 === 0) process.stderr.write(`  ${results.length}/${tasks.length} (${((Date.now() - t0) / 1000).toFixed(0)} s)\n`);
        feed();
      });
      worker.on('exit', () => {
        if (--alive === 0) done();
      });
      worker.on('error', (e) => {
        console.error(e);
      });
      feed();
    }
  });
  const ai = results.filter((r) => r.task.kind === 'round' && r.task.player === 'utility');
  const per = {};
  const appear = {};
  for (const r of ai) {
    per[r.winnerPersonality] = (per[r.winnerPersonality] ?? 0) + 1;
    for (const p of r.personalities) if (p) appear[p] = (appear[p] ?? 0) + 1;
  }
  const share = Object.fromEntries(Object.entries(per).map(([k, v]) => [k, +(v / ai.length).toFixed(3)]));
  const perAppearance = Object.fromEntries(Object.keys(appear).map((k) => [k, +(((per[k] ?? 0) / appear[k]) * (ai.reduce((a, r) => a + r.flocks, 0) / ai.length)).toFixed(3)]));
  const snow = ai.filter((r) => r.leaderAt60 === r.winner).length / Math.max(1, ai.length);
  const cons = results.filter((r) => r.task.kind === 'round' && !r.conservationOk).length;
  const outside = results.filter((r) => r.task.kind === 'round' && r.outside > 0).length;
  const avgB = results.filter((r) => r.task.kind === 'round' && r.task.player === 'average' && r.task.league === 0);
  const avgE = results.filter((r) => r.task.kind === 'round' && r.task.player === 'average' && r.task.league === 4);
  const win = (arr) => arr.filter((r) => r.winner === 1).length / Math.max(1, arr.length);
  const top3 = (arr) => arr.filter((r) => r.playerRank >= 1 && r.playerRank <= 3).length / Math.max(1, arr.length);
  const big = results.filter((r) => r.task.kind === 'contact' && r.task.nA === 100);
  const eq = results.filter((r) => r.task.kind === 'contact' && r.task.nA === 75);
  const eqDecided = eq.filter((r) => r.a !== r.b);
  const ticks = results.filter((r) => r.task.kind === 'round').map((r) => r.msPerTick).sort((a, b) => a - b);
  const byP = {};
  for (const r of ai) for (const f of r.perFlock) {
    if (!f.p) continue;
    const b = (byP[f.p] ??= { n: 0, rank: 0, size: 0, peak: 0, sieges: 0, elim: 0, conv: 0, wild: 0 });
    b.n++; b.rank += f.rank; b.size += f.size; b.peak += f.peak; b.sieges += f.sieges; b.elim += f.elim; b.conv += f.conv; b.wild += f.wild;
  }
  const perPersonality = Object.fromEntries(Object.entries(byP).map(([k, b]) => [k, { meanRank: +(b.rank / b.n).toFixed(2), meanSize: +(b.size / b.n).toFixed(1), meanPeak: +(b.peak / b.n).toFixed(1), siegesPerRound: +(b.sieges / b.n).toFixed(2), elimRate: +(b.elim / b.n).toFixed(2), conv: +(b.conv / b.n).toFixed(1), wild: +(b.wild / b.n).toFixed(1) }]));
  const summary = {
    rounds: ai.length,
    perPersonality,
    personalityWinShare: share,
    personalityWinPerAppearanceNormalised: perAppearance,
    firstMinuteLeaderWins: +snow.toFixed(3),
    conservationFailures: cons,
    roundsWithLeaderOutsideRingAt177s: outside,
    ringRadiusAtEnd: results.find((r) => r.task.kind === 'round')?.ring,
    averagePlayer: { bronzeWin: +win(avgB).toFixed(3), bronzeTop3: +top3(avgB).toFixed(3), diamondWin: +win(avgE).toFixed(3), diamondTop3: +top3(avgE).toFixed(3), roundsEach: avgB.length },
    contact: { bigSideWins: +(big.filter((r) => r.a > 100).length / Math.max(1, big.length)).toFixed(3), equalAWins: +(eqDecided.filter((r) => r.a > r.b).length / Math.max(1, eqDecided.length)).toFixed(3), seeds: big.length },
    meanSiegesPerRound: +(ai.reduce((a, r) => a + r.sieges, 0) / Math.max(1, ai.length)).toFixed(2),
    meanEliminatedPerRound: +(ai.reduce((a, r) => a + r.eliminated, 0) / Math.max(1, ai.length)).toFixed(2),
    meanWinnerSize: +(ai.reduce((a, r) => a + r.winnerSize, 0) / Math.max(1, ai.length)).toFixed(1),
    roundTickMs: { median: +ticks[ticks.length >> 1]?.toFixed(3), p90: +ticks[Math.floor(ticks.length * 0.9)]?.toFixed(3) },
    wallSec: (Date.now() - t0) / 1000,
  };
  mkdirSync(resolve(here, '../out'), { recursive: true });
  writeFileSync(resolve(here, '../out/suru-balance.json'), JSON.stringify({ summary, results }, null, 1));
  console.log(JSON.stringify(summary, null, 2));
}
