// Yarış simülasyonu: sabit adımlı (60/sn), tamamen belirlenimci.
// Görüntüden bağımsızdır; ileride aynı dosya sunucuda çalışıp sonucu doğrulayabilir.
//
// Hamle dili (oyuncu da bot da aynısını kullanır):
//   { runner: <id>, type: 'left' | 'right' | 'jump' | 'slide' | 'grab' }
import { DT, LANE_WIDTH, RUN } from './constants.js';

export function createRace({ course, runners }) {
  return {
    tick: 0,
    course,
    finished: false,
    runners: runners.map((r, i) => ({
      id: r.id ?? i,
      name: r.name,
      team: r.team,
      isBot: !!r.isBot,
      speedFactor: r.speedFactor ?? 1,
      startLane: r.startLane ?? [0, -1, 1, 0][i % 4],
      ...freshRunnerState(r.startLane ?? [0, -1, 1, 0][i % 4]),
      z: r.startZ ?? 0,
      hits: 0,
      falls: 0,
      finishTick: null,
    })),
  };
}

function freshRunnerState(lane) {
  return {
    z: 0,
    lane,
    x: lane * LANE_WIDTH,
    y: 0,
    vy: 0,
    speed: 0,
    state: 'run', // run | jump | slide | stumble | fall | zip | finished
    timer: 0,
    slideTimer: 0,
    respawnZ: 0,
    lastHitId: null,
  };
}

const laneOf = (r) => Math.max(-1, Math.min(1, Math.round(r.x / LANE_WIDTH)));

function hazardAt(course, z, type) {
  for (const h of course.hazards) {
    if (type && h.type !== type) continue;
    if (z >= h.z0 && z < h.z1) return h;
  }
  return null;
}

function applyAction(state, r, type, events) {
  if (r.state === 'finished' || r.state === 'fall') return;
  if (r.state === 'zip') return;
  if (type === 'left' || type === 'right') {
    const d = type === 'left' ? -1 : 1;
    r.lane = Math.max(-1, Math.min(1, r.lane + d));
  } else if (type === 'jump') {
    if (r.y <= 0.0001 && r.state !== 'stumble') {
      r.vy = RUN.jumpVelocity;
      r.state = 'jump';
      r.slideTimer = 0;
      events.push({ type: 'jump', runner: r.id });
    }
  } else if (type === 'slide') {
    if (r.y <= 0.0001 && r.state !== 'stumble') {
      r.state = 'slide';
      r.slideTimer = RUN.slideTime;
      events.push({ type: 'slide', runner: r.id });
    } else if (r.y > 0) {
      r.vy = Math.min(r.vy, -6); // havadayken aşağı kaydır: hızlı in
    }
  } else if (type === 'grab') {
    const zip = state.course.hazards.find((h) => h.type === 'zip' && r.z >= h.grab0 && r.z <= h.grab1);
    if (zip) {
      r.state = 'zip';
      r.y = 0;
      r.vy = 0;
      r.lane = 0;
      r.zip = zip;
      events.push({ type: 'zip', runner: r.id });
    }
  }
}

export function step(state, actions = []) {
  const events = [];
  const { course } = state;
  for (const a of actions) {
    const r = state.runners.find((x) => x.id === a.runner);
    if (r) applyAction(state, r, a.type, events);
  }

  for (const r of state.runners) {
    if (r.state === 'finished') {
      // bitişten sonra yavaşça koşmaya devam (görüntü için)
      r.speed = Math.max(0, r.speed - 6 * DT);
      r.z += r.speed * DT;
      continue;
    }

    if (r.state === 'fall') {
      r.timer -= DT;
      r.vy -= RUN.gravity * DT;
      r.y += r.vy * DT;
      r.z += r.speed * 0.4 * DT;
      if (r.timer <= 0) {
        Object.assign(r, freshRunnerState(0), { z: r.respawnZ });
        events.push({ type: 'respawn', runner: r.id });
      }
      continue;
    }

    if (r.state === 'zip') {
      r.speed = RUN.zipSpeed;
      r.z += r.speed * DT;
      r.x += (0 - r.x) * Math.min(1, 10 * DT);
      if (r.z >= r.zip.z1) {
        r.state = 'run';
        r.zip = null;
        events.push({ type: 'land', runner: r.id });
      }
      continue;
    }

    // hız
    const maxSpeed = RUN.maxSpeed * r.speedFactor;
    if (r.state === 'stumble') {
      r.timer -= DT;
      if (r.timer <= 0) r.state = 'run';
    } else {
      r.speed = Math.min(maxSpeed, r.speed + RUN.accel * DT);
    }

    // yanal hareket
    const targetX = r.lane * LANE_WIDTH;
    const dx = targetX - r.x;
    const maxStep = RUN.lateralSpeed * DT;
    r.x += Math.abs(dx) <= maxStep ? dx : Math.sign(dx) * maxStep;

    // dikey hareket
    if (r.y > 0 || r.vy > 0) {
      r.vy -= RUN.gravity * DT;
      r.y += r.vy * DT;
      if (r.y <= 0) {
        r.y = 0;
        r.vy = 0;
        if (r.state === 'jump') r.state = 'run';
        events.push({ type: 'land', runner: r.id });
      }
    }
    if (r.state === 'slide') {
      r.slideTimer -= DT;
      if (r.slideTimer <= 0) r.state = 'run';
    }

    const prevZ = r.z;
    r.z += r.speed * DT;

    // düşme bölgeleri
    if (r.y <= 0.0001) {
      const gap = hazardAt(course, r.z, 'gap');
      const bridge = hazardAt(course, r.z, 'bridge');
      const zip = course.hazards.find((h) => h.type === 'zip' && r.z > h.grab1 && r.z < h.z1);
      let fall = null;
      if (gap) fall = gap;
      else if (bridge && !bridge.lanes.includes(laneOf(r)) && Math.abs(r.x - laneOf(r) * LANE_WIDTH) < 0.7) fall = bridge;
      else if (zip) fall = zip;
      if (fall) {
        r.state = 'fall';
        r.timer = RUN.fallTime;
        r.vy = 0;
        r.respawnZ = fall.respawnZ;
        r.falls += 1;
        events.push({ type: 'fall', runner: r.id, hazard: fall.type });
        continue;
      }
    }

    // engel çarpışmaları
    const lane = laneOf(r);
    for (const o of course.obstacles) {
      if (o.z > r.z || o.z + o.depth < prevZ) continue;
      if (!o.lanes.includes(lane)) continue;
      if (r.lastHitId === o.id) continue;
      let hit = false;
      if (o.type === 'hurdle') hit = r.y < RUN.hurdleClearY;
      else if (o.type === 'arch') hit = r.state !== 'slide';
      else if (o.type === 'block') hit = true;
      if (hit) {
        r.lastHitId = o.id;
        r.hits += 1;
        r.state = 'stumble';
        r.timer = RUN.stumbleTime;
        r.speed = RUN.stumbleSpeed;
        r.slideTimer = 0;
        if (o.type === 'block') {
          // engelden kurtulmak için en yakın boş şeride kay
          const free = [-1, 0, 1].filter((l) => !o.lanes.includes(l)).sort((a, b) => Math.abs(a - lane) - Math.abs(b - lane));
          if (free.length) r.lane = free[0];
        }
        events.push({ type: 'hit', runner: r.id, obstacle: o.id, kind: o.type });
      }
    }

    if (r.z >= course.length) {
      r.state = 'finished';
      r.finishTick = state.tick + 1;
      events.push({ type: 'finish', runner: r.id, tick: r.finishTick });
    }
  }

  state.tick += 1;
  if (state.runners.every((r) => r.state === 'finished')) state.finished = true;
  return events;
}

export function standings(state) {
  return [...state.runners].sort((a, b) => {
    if (a.finishTick != null && b.finishTick != null) return a.finishTick - b.finishTick;
    if (a.finishTick != null) return -1;
    if (b.finishTick != null) return 1;
    return b.z - a.z;
  });
}

export const ticksToSeconds = (t) => t / 60;
