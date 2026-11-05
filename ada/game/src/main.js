// ADA · Hız Parkuru prototipi: açılış, geri sayım, yarış, bitiş ve sonuç.
import * as THREE from 'three/webgpu';
import { generateCourse, sectionAt } from './core/course.js';
import { createRace, step, standings } from './core/race.js';
import { BOT_PERSONALITIES, createBotBrain, botThink } from './core/bots.js';
import { DT } from './core/constants.js';
import { boraLakabi } from './core/lakap.js';
import { buildPath } from './render/path.js';
import { buildWorld } from './render/world.js';
import { loadCharacterAsset, createRunnerVisual, updateRunnerVisual } from './render/characters.js';
import { createFollowCamera } from './render/camera.js';
import { createPost, createDust } from './render/effects.js';
import { createInput } from './input.js';
import { pickQuality } from './quality.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const SEED = parseInt(params.get('tohum') || '1', 10);
const START_Z = parseFloat(params.get('z') || '0'); // test için: parkurun ortasından başlat
const setLoad = (pct, text) => {
  $('yukleme-dolum').style.width = `${pct}%`;
  if (text) $('yukleme-yazi').textContent = text;
};
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

const fmt = (s) => {
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${m}:${r < 10 ? '0' : ''}${r.toFixed(1)}`;
};

async function boot() {
  const canvas = $('sahne');
  const quality = pickQuality(params.get('kalite') || localStorage.getItem('ada-kalite') || null);
  $('kalite-sec').value = params.get('kalite') || localStorage.getItem('ada-kalite') || 'oto';
  setLoad(8, 'Görüntü motoru başlatılıyor…');
  // WebGPU varsayılan; desteklenmezse WebGL2'ye kendiliğinden geçer.
  // ?motor=webgl ile ya da WebGPU hata verirse WebGL2 zorlanır.
  const forceWebGL = params.get('motor') === 'webgl' || sessionStorage.getItem('ada-motor') === 'webgl';
  const renderer = new THREE.WebGPURenderer({ canvas, antialias: quality.antialias, powerPreference: 'high-performance', forceWebGL });
  await renderer.init();
  const isWebGPU = !!renderer.backend?.isWebGPUBackend;
  if (isWebGPU && renderer.backend.device) {
    let gpuErrors = 0;
    renderer.backend.device.addEventListener('uncapturederror', () => {
      if (++gpuErrors === 5 && !sessionStorage.getItem('ada-motor')) {
        sessionStorage.setItem('ada-motor', 'webgl');
        location.reload();
      }
    });
  }
  window.addEventListener('error', (ev) => {
    if (isWebGPU && /GPU|createBuffer|WebGPU/i.test(ev.message || '') && !sessionStorage.getItem('ada-motor')) {
      sessionStorage.setItem('ada-motor', 'webgl');
      location.reload();
    }
  });
  $('motor').textContent = `· ${isWebGPU ? 'WebGPU' : 'WebGL2'} · ${quality.name}`;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.pixelRatio));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.82;
  renderer.shadowMap.enabled = quality.shadows;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const course = generateCourse(SEED);
  setLoad(18, 'Ada şekilleniyor…');
  await nextFrame();
  const path = buildPath(course);
  setLoad(30, 'Kalıntılar ve orman yerleştiriliyor…');
  await nextFrame();
  const world = buildWorld({ scene, renderer, course, path, quality });
  setLoad(62, 'Ece geliyor…');
  await nextFrame();

  let asset = null;
  try {
    asset = await loadCharacterAsset('./models/ece.glb');
  } catch (e) {
    console.error('karakter yüklenemedi', e);
  }
  setLoad(82, 'Rakipler ısınıyor…');

  // koşucular: oyuncu + 3 bot
  const botKeys = ['baris', 'can', 'selin'];
  const roster = [
    { id: 0, name: 'Sen', team: 'safak', isBot: false, startLane: 0, startZ: START_Z },
    ...botKeys.map((k, i) => ({ id: i + 1, name: BOT_PERSONALITIES[k].name, team: BOT_PERSONALITIES[k].team, isBot: true, speedFactor: BOT_PERSONALITIES[k].speedFactor, startLane: [-1, 1, 0][i], startZ: START_Z + [0, 0, 4][i], key: k })),
  ];
  const visuals = roster.map((r) => (asset ? createRunnerVisual(asset, { clay: r.isBot ? r.team : null, castShadow: quality.shadows }) : null));
  visuals.forEach((v) => v && scene.add(v.root));

  const follow = createFollowCamera(window.innerWidth / window.innerHeight);
  const camera = follow.camera;
  const dust = createDust(scene, quality.key === 'dusuk' ? 40 : 90);
  let post = null;
  try {
    post = createPost(renderer, scene, camera, quality);
  } catch (e) {
    console.warn('son işlem kapalı', e);
  }

  // etiketler
  const labels = roster.map((r) => {
    if (!r.isBot) return null;
    const el = document.createElement('div');
    el.className = 'etiket';
    el.textContent = r.name;
    el.style.color = r.team === 'safak' ? '#f2b27a' : '#8fe0e4';
    $('etiketler').appendChild(el);
    return el;
  });
  // ilerleme noktaları
  const dots = roster.map((r) => {
    const d = document.createElement('div');
    d.className = 'nokta' + (r.isBot ? '' : ' ben');
    d.style.background = r.isBot ? (r.team === 'safak' ? '#e0782a' : '#2aa7ad') : '#e8b35a';
    $('ray').appendChild(d);
    return d;
  });

  // oyun durumu
  let race, brains, prevSnap, phase, acc, timeScale, slowUntil, finishShownAt, countdownAt, playerQueue, lastBolum;
  function resetRace() {
    race = createRace({ course, runners: roster });
    brains = roster.map((r, i) => (r.isBot ? createBotBrain(BOT_PERSONALITIES[r.key], SEED * 97 + i) : null));
    prevSnap = race.runners.map((r) => ({ z: r.z, x: r.x, y: r.y }));
    phase = 'intro';
    acc = 0;
    timeScale = 1;
    slowUntil = 0;
    finishShownAt = 0;
    playerQueue = [];
    lastBolum = '';
    follow.state.mode = 'intro';
    follow.state.init = false;
    follow.state.orbit = 0;
    visuals.forEach((v) => v && (v.lastState = 'idle'));
  }
  resetRace();

  const zipHaz = course.hazards.find((h) => h.type === 'zip');
  const isZipZone = () => {
    const p = race.runners[0];
    return p.state !== 'zip' && p.z >= zipHaz.grab0 - 6 && p.z <= zipHaz.grab1;
  };
  createInput(canvas, {
    isZipZone,
    onAction: (type) => {
      if (phase === 'race') playerQueue.push({ runner: 0, type });
    },
  });

  // mesajlar
  let msgTimer = 0;
  function say(text, sub = '', ms = 1100) {
    const el = $('mesaj');
    el.innerHTML = text + (sub ? `<small>${sub}</small>` : '');
    el.classList.add('gor');
    clearTimeout(msgTimer);
    msgTimer = setTimeout(() => el.classList.remove('gor'), ms);
  }

  function countdown() {
    phase = 'countdown';
    $('giris').classList.add('gizli');
    $('hud').classList.remove('gizli');
    follow.state.mode = 'follow';
    const el = $('geri-sayim');
    const seq = ['3', '2', '1', 'KOŞ!'];
    seq.forEach((t, i) =>
      setTimeout(() => {
        el.textContent = t;
        el.classList.remove('vur');
        void el.offsetWidth;
        el.classList.add('vur');
        if (i === seq.length - 1) {
          phase = 'race';
          el.style.fontSize = '22vw';
        } else el.style.fontSize = '';
      }, i * 800),
    );
  }

  function showResults() {
    phase = 'results';
    $('hud').classList.add('gizli');
    $('dokun').classList.add('gizli');
    const st = standings(race);
    const me = race.runners[0];
    const rank = st.findIndex((r) => r.id === 0) + 1;
    const secs = me.finishTick / 60;
    const l = boraLakabi({ rank, total: st.length, hits: me.hits, falls: me.falls, seconds: secs });
    $('sonuc-sira').textContent = `${rank}.`;
    $('sonuc-sure').textContent = `${fmt(secs)} · ${me.hits} tökezleme · ${me.falls} düşüş`;
    $('lakap').textContent = l.lakap;
    $('lakap-soz').textContent = `“${l.soz}”`;
    $('siralama').innerHTML = st
      .map((r, i) => `<li class="${r.id === 0 ? 'ben' : ''}"><span>${i + 1}. ${r.name}</span><span>${r.finishTick != null ? fmt(r.finishTick / 60) : 'yolda…'}</span></li>`)
      .join('');
    $('sonuc').classList.remove('gizli');
  }

  $('basla').addEventListener('click', () => countdown());
  $('tekrar').addEventListener('click', () => {
    $('sonuc').classList.add('gizli');
    resetRace();
    countdown();
  });
  $('kalite-sec').addEventListener('change', (e) => {
    const v = e.target.value;
    if (v === 'oto') localStorage.removeItem('ada-kalite');
    else localStorage.setItem('ada-kalite', v);
    const u = new URL(location.href);
    u.searchParams.delete('kalite');
    location.href = u.toString();
  });

  function onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', onResize);

  function handleEvents(events) {
    for (const e of events) {
      const v = visuals[e.runner];
      const at = v ? v.root.position : null;
      const isMe = e.runner === 0;
      if (e.type === 'land' && at) dust.burst(at, isMe ? 6 : 3, 0.6);
      if (e.type === 'hit') {
        if (at) dust.burst(at, 12, 1.2);
        if (isMe) {
          follow.shake(1);
          say('TÖKEZLEDİN!', e.kind === 'block' ? 'Engelden yana kaç' : e.kind === 'arch' ? 'Altından kay' : 'Üstünden zıpla');
        }
      }
      if (e.type === 'fall' && isMe) {
        follow.shake(0.6);
        say(e.hazard === 'zip' ? 'İPİ KAÇIRDIN!' : 'DÜŞTÜN!', 'Bir şans daha… geri dönüyorsun');
      }
      if (e.type === 'zip' && isMe) say('İPTESİN!', '', 800);
      if (e.type === 'finish' && isMe) {
        timeScale = 0.3;
        slowUntil = performance.now() + 1400;
        follow.state.mode = 'finish';
        say('BİTİŞ!', '', 1500);
        finishShownAt = performance.now() + 2300;
      }
    }
  }

  setLoad(100, 'Hazır');
  // ilk kareyi çizip açılışı göster
  $('yukleme').classList.add('gizli');
  $('giris').classList.remove('gizli');

  const frameTmp = { p: new THREE.Vector3(), t: new THREE.Vector3(), r: new THREE.Vector3() };
  const focus = new THREE.Vector3();
  const proj = new THREE.Vector3();
  let last = performance.now();
  let fpsAcc = 0, fpsFrames = 0, degraded = false;

  renderer.setAnimationLoop(() => {
    const now = performance.now();
    let dtReal = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (slowUntil && now > slowUntil) {
      timeScale += (1 - timeScale) * 0.08;
      if (timeScale > 0.98) { timeScale = 1; slowUntil = 0; }
    }
    const dt = dtReal * timeScale;

    // simülasyon
    if (phase === 'race' || phase === 'results') {
      const fast = phase === 'results' ? 3 : 1; // sonuç ekranında botları hızlıca bitir
      acc += dt * fast;
      let guard = 0;
      while (acc >= DT && guard++ < 12) {
        prevSnap = race.runners.map((r) => ({ z: r.z, x: r.x, y: r.y }));
        const actions = [];
        if (playerQueue.length) actions.push(...playerQueue.splice(0));
        race.runners.forEach((r, i) => brains[i] && actions.push(...botThink(brains[i], race, r)));
        handleEvents(step(race, actions));
        acc -= DT;
      }
    }
    const alpha = phase === 'race' || phase === 'results' ? acc / DT : 1;

    // görüntü
    race.runners.forEach((r, i) => visuals[i] && updateRunnerVisual(visuals[i], r, prevSnap[i], alpha, path, world, dt * (phase === 'intro' || phase === 'countdown' ? 0.5 : 1)));
    const me = race.runners[0];
    const f = path.frame(prevSnap[0].z + (me.z - prevSnap[0].z) * alpha, frameTmp.p, frameTmp.t, frameTmp.r);
    if (visuals[0]) focus.copy(visuals[0].root.position);
    else focus.copy(f.pos);
    follow.update(dtReal, focus, f, me.speed, { portrait: window.innerHeight > window.innerWidth, zip: me.state === 'zip', lateral: me.x });
    world.followSun(focus);
    world.update(now, camera);
    dust.update(dt);

    // arayüz
    if (phase === 'race') {
      $('sure').textContent = fmt(race.tick / 60);
      const st = standings(race);
      $('sira').textContent = `${st.findIndex((r) => r.id === 0) + 1}/${st.length}`;
      const b = sectionAt(course, me.z).name;
      if (b !== lastBolum) {
        lastBolum = b;
        $('bolum').textContent = b;
      }
      race.runners.forEach((r, i) => (dots[i].style.left = `${Math.min(100, (r.z / course.length) * 100)}%`));
      $('dokun').classList.toggle('gizli', !isZipZone());
      if (me.state === 'finished' && finishShownAt && now > finishShownAt) showResults();
    }
    // rakip etiketleri
    labels.forEach((el, i) => {
      if (!el) return;
      const v = visuals[i];
      if (!v || phase === 'results') { el.style.display = 'none'; return; }
      proj.copy(v.root.position).add({ x: 0, y: 2.05, z: 0 }).project(camera);
      const vis = proj.z < 1 && Math.abs(proj.x) < 1.1 && Math.abs(proj.y) < 1.1 && v.root.position.distanceTo(camera.position) < 45;
      el.style.display = vis ? 'block' : 'none';
      if (vis) el.style.transform = `translate(${(proj.x * 0.5 + 0.5) * window.innerWidth}px, ${(-proj.y * 0.5 + 0.5) * window.innerHeight}px) translate(-50%, -100%)`;
    });

    if (post) post.render();
    else renderer.render(scene, camera);

    // kare hızı koruması: telefon zorlanırsa çözünürlüğü düşür
    if (phase === 'race' && !degraded) {
      fpsAcc += dtReal;
      fpsFrames++;
      if (fpsAcc > 4) {
        const fps = fpsFrames / fpsAcc;
        if (fps < 30) {
          degraded = true;
          renderer.setPixelRatio(Math.max(0.75, renderer.getPixelRatio() * 0.7));
          onResize();
        }
        fpsAcc = 0;
        fpsFrames = 0;
      }
    }
  });
}

boot().catch((e) => {
  console.error(e);
  $('yukleme-yazi').textContent = 'Bir sorun oldu: ' + (e?.message || e);
});
