// Tam ekran "şov alanı": kenarsız, ekranı baştan başa dolduran dokulu çuha.
// Ortada altın varaklı pişti arenası, üstten spot ışık havuzu, kenarlara doğru sinematik karanlık.
// Işık dokuya gömülüdür (ışıksız malzeme): çuha 1 + arena 1 çizim çağrısı, ekstra ışık maliyeti yok.
import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import type {Stage} from './stage';
import {TABLE} from '../game/layout';

function prng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

/** Ölçüler (metre). Arena pişti yığınının altında durur. */
export const STAGE_FELT = {
  size: 9, // çuha düzleminin kenarı: her kamera açısında ekranı doldurur
  lightSpan: 2.6, // ışık/renk dokusunun kapladığı alan; dışı kenar rengine kenetlenir
  tile: 0.3, // desen karosunun kenarı
  arena: 0.44, // arena dokusunun kenarı (iç halka yığının çaprazından geniş)
};

/**
 * Tekrarlanan detay karosu (gri tonlu, renk ışık dokusundan gelir): çuha lifleri +
 * kabartma Osmanlı kafes deseni (lale + baklava). Kenarları dikişsiz.
 */
function tileTexture(N: number): THREE.CanvasTexture {
  const [c, g] = canvas(N, N);
  const r = prng(11);
  g.fillStyle = '#e4e4e4';
  g.fillRect(0, 0, N, N);
  // kabartma çizici: önce koyu gölge (aşağı-sağ), sonra açık vurgu (yukarı-sol)
  const emboss = (draw: (dx: number, dy: number) => void, a: number) => {
    for (const [ox, oy] of [[0, 0], [N, 0], [-N, 0], [0, N], [0, -N], [N, N], [-N, -N], [N, -N], [-N, N]]) {
      g.save();
      g.translate(ox, oy);
      g.fillStyle = g.strokeStyle = `rgba(0,0,0,${a})`;
      draw(N * 0.004, N * 0.004);
      g.fillStyle = g.strokeStyle = `rgba(255,255,255,${a * 0.55})`;
      draw(-N * 0.003, -N * 0.003);
      g.restore();
    }
  };
  // baklava kafes: karo başına 2×2 hücre
  const cell = N / 2;
  emboss((dx, dy) => {
    g.lineWidth = N * 0.006;
    g.beginPath();
    for (let i = -2; i <= 4; i++) {
      g.moveTo(i * cell + dx, 0 + dy);
      g.lineTo(i * cell + cell * 2 + dx, N + dy);
      g.moveTo(i * cell + dx, N + dy);
      g.lineTo(i * cell + cell * 2 + dx, 0 + dy);
    }
    g.stroke();
  }, 0.07);
  // rozet: kafes düğümlerinde dört yapraklı çiçek, hücre ortalarında nokta (kart işaretlerine benzemesin)
  const rosette = (x: number, y: number, s: number, dx: number, dy: number) => {
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2;
      g.beginPath();
      g.ellipse(x + Math.cos(a) * s * 0.5 + dx, y + Math.sin(a) * s * 0.5 + dy, s * 0.42, s * 0.24, a, 0, Math.PI * 2);
      g.fill();
    }
  };
  emboss((dx, dy) => {
    for (let i = 0; i <= 2; i++) for (let j = 0; j <= 2; j++) rosette(i * cell, j * cell, N * 0.05, dx, dy);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const x = (i + 0.5) * cell, y = (j + 0.5) * cell;
      g.beginPath();
      g.arc(x + dx, y + dy, N * 0.01, 0, Math.PI * 2);
      g.fill();
    }
  }, 0.07);
  // çuha lifleri
  g.lineCap = 'round';
  const n = Math.round((N * N) / 34);
  for (let i = 0; i < n; i++) {
    const x = r() * N, y = r() * N, a = r() * Math.PI, l = N * (0.003 + r() * 0.008);
    g.strokeStyle = r() < 0.5 ? `rgba(255,255,255,${0.05 + r() * 0.07})` : `rgba(0,0,0,${0.05 + r() * 0.07})`;
    g.lineWidth = N * (0.0012 + r() * 0.0012);
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Renk + ışık: ortada sıcak spot havuzu, dışa doğru zümrütten neredeyse siyaha. */
function lightTexture(N: number): THREE.CanvasTexture {
  const [c, g] = canvas(N, N);
  const cx = N / 2, cy = N / 2;
  g.fillStyle = '#020b06';
  g.fillRect(0, 0, N, N);
  // elips havuz (dikey ekran için biraz uzun)
  g.save();
  g.translate(cx, cy);
  g.scale(1, 1.22);
  const pool = g.createRadialGradient(0, 0, 0, 0, 0, N * 0.42);
  pool.addColorStop(0, '#46b877');
  pool.addColorStop(0.18, '#2f9a5d');
  pool.addColorStop(0.42, '#1b7442');
  pool.addColorStop(0.7, '#0c4426');
  pool.addColorStop(1, '#020b06');
  g.fillStyle = pool;
  g.beginPath();
  g.arc(0, 0, N * 0.42, 0, Math.PI * 2);
  g.fill();
  g.restore();
  // lambanın sıcak merkezi
  const warm = g.createRadialGradient(cx, cy, 0, cx, cy, N * 0.2);
  warm.addColorStop(0, 'rgba(255,214,140,0.30)');
  warm.addColorStop(1, 'rgba(255,214,140,0)');
  g.globalCompositeOperation = 'screen';
  g.fillStyle = warm;
  g.fillRect(0, 0, N, N);
  g.globalCompositeOperation = 'source-over';
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.channel = 0;
  return t;
}

/** Altın varak yazı/çizgi dolgusu. */
function goldFill(g: CanvasRenderingContext2D, y0: number, y1: number): CanvasGradient {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, '#fff2b0');
  gr.addColorStop(0.35, '#f0c862');
  gr.addColorStop(0.65, '#c08a2c');
  gr.addColorStop(1, '#f6d77a');
  return gr;
}

/** Pişti arenası: altın çift halka, kemerli yazı bandı, laleler ve iç ışıltı. Saydam zemin. */
function arenaTexture(N: number): THREE.CanvasTexture {
  const [c, g] = canvas(N, N);
  const C = N / 2;
  const R = (k: number) => k * C; // yarıçap oranı → piksel
  // iç parıltı
  const glow = g.createRadialGradient(C, C, 0, C, C, R(0.86));
  glow.addColorStop(0, 'rgba(255,230,160,0.20)');
  glow.addColorStop(0.7, 'rgba(255,220,140,0.07)');
  glow.addColorStop(1, 'rgba(255,220,140,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, N, N);
  // yazı bandı zemini: koyu kadife
  g.beginPath();
  g.arc(C, C, R(0.93), 0, Math.PI * 2);
  g.arc(C, C, R(0.74), 0, Math.PI * 2, true);
  g.fillStyle = 'rgba(0,26,12,0.42)';
  g.fill();
  const ring = (rad: number, w: number, a = 1) => {
    g.globalAlpha = a;
    // gölge
    g.beginPath();
    g.arc(C + N * 0.003, C + N * 0.004, rad, 0, Math.PI * 2);
    g.lineWidth = w;
    g.strokeStyle = 'rgba(0,0,0,0.45)';
    g.stroke();
    g.beginPath();
    g.arc(C, C, rad, 0, Math.PI * 2);
    g.strokeStyle = goldFill(g, C - rad, C + rad);
    g.stroke();
    g.globalAlpha = 1;
  };
  ring(R(0.955), N * 0.013);
  ring(R(0.915), N * 0.0045);
  ring(R(0.755), N * 0.0045);
  ring(R(0.715), N * 0.011);
  // halka üstü inci dizisi
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2, rr = R(0.62);
    g.beginPath();
    g.arc(C + Math.cos(a) * rr, C + Math.sin(a) * rr, N * (i % 2 ? 0.0028 : 0.0048), 0, Math.PI * 2);
    g.fillStyle = i % 2 ? 'rgba(240,200,100,0.45)' : 'rgba(250,215,120,0.75)';
    g.fill();
  }
  // kemerli yazı
  const text = (s: string, mid: number, outward: boolean) => {
    const fs = N * 0.07;
    g.font = `400 ${fs}px "Lilita One", "Nunito", sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const rr = R(0.835);
    const track = fs * 0.16;
    const widths = [...s].map(ch => g.measureText(ch).width + track);
    const total = widths.reduce((a, b) => a + b, 0) - track;
    let ang = mid - ((outward ? 1 : -1) * total) / rr / 2;
    for (let i = 0; i < s.length; i++) {
      const w = widths[i];
      const a = ang + ((outward ? 1 : -1) * (w - track)) / rr / 2;
      g.save();
      g.translate(C + Math.cos(a) * rr, C + Math.sin(a) * rr);
      g.rotate(a + (outward ? Math.PI / 2 : -Math.PI / 2));
      g.fillStyle = 'rgba(0,0,0,0.5)';
      g.fillText(s[i], fs * 0.04, fs * 0.06);
      g.fillStyle = goldFill(g, -fs / 2, fs / 2);
      g.fillText(s[i], 0, 0);
      g.restore();
      ang += ((outward ? 1 : -1) * w) / rr;
    }
  };
  text('KAHVEHANE', -Math.PI / 2, true);
  text('PİŞTİ', Math.PI / 2, false);
  // yanlarda laleler
  const tulip = (a: number) => {
    const rr = R(0.835), s = N * 0.05;
    g.save();
    g.translate(C + Math.cos(a) * rr, C + Math.sin(a) * rr);
    g.rotate(a + Math.PI / 2);
    g.beginPath();
    g.moveTo(0, s * 0.55);
    g.bezierCurveTo(-s * 0.6, s * 0.2, -s * 0.55, -s * 0.35, -s * 0.2, -s * 0.6);
    g.quadraticCurveTo(-s * 0.1, -s * 0.15, 0, -s * 0.7);
    g.quadraticCurveTo(s * 0.1, -s * 0.15, s * 0.2, -s * 0.6);
    g.bezierCurveTo(s * 0.55, -s * 0.35, s * 0.6, s * 0.2, 0, s * 0.55);
    g.fillStyle = 'rgba(0,0,0,0.45)';
    g.save();
    g.translate(N * 0.002, N * 0.003);
    g.fill();
    g.restore();
    g.fillStyle = goldFill(g, -s * 0.7, s * 0.55);
    g.fill();
    g.restore();
  };
  tulip(0);
  tulip(Math.PI);
  // dört yöne altın baklava
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2, rr = R(0.835), s = N * 0.016;
    g.save();
    g.translate(C + Math.cos(a) * rr, C + Math.sin(a) * rr);
    g.rotate(a);
    g.beginPath();
    g.moveTo(0, -s * 1.6);
    g.lineTo(s, 0);
    g.lineTo(0, s * 1.6);
    g.lineTo(-s, 0);
    g.closePath();
    g.fillStyle = goldFill(g, -s, s);
    g.fill();
    g.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export interface StageDecor {
  arena: THREE.Mesh;
}

export async function buildEnvironment(stage: Stage, pileAt = new THREE.Vector3(0, TABLE.y, 0)): Promise<StageDecor> {
  const {scene, renderer} = stage;
  const hi = stage.q.tier !== 'low';
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  pmrem.dispose();
  await document.fonts?.load('400 64px "Lilita One"', 'KAHVEHANE PİŞTİ').catch(() => undefined);
  const aniso = Math.min(stage.q.anisotropy, renderer.capabilities.getMaxAnisotropy());

  // Çuha: detay karosu × ışık dokusu (ışıksız; ışık dokuya gömülü)
  const S = STAGE_FELT;
  const tile = tileTexture(hi ? 512 : 256);
  tile.repeat.set(S.size / S.tile, S.size / S.tile);
  tile.anisotropy = aniso;
  const light = lightTexture(hi ? 512 : 256);
  // ışık dokusu yalnız ortadaki lightSpan alanını kaplar (kenar rengi dışarı uzar)
  const k = S.size / S.lightSpan;
  light.repeat.set(k, k);
  light.offset.set(0.5 - k / 2 - pileAt.x / S.lightSpan, 0.5 - k / 2 + pileAt.z / S.lightSpan);
  const felt = new THREE.Mesh(
    new THREE.PlaneGeometry(S.size, S.size),
    new THREE.MeshBasicMaterial({map: tile, lightMap: light, lightMapIntensity: Math.PI * 1.08, toneMapped: false}),
  );
  felt.rotation.x = -Math.PI / 2;
  felt.position.y = TABLE.y - 0.0004;
  scene.add(felt);

  // Pişti arenası
  const arenaTex = arenaTexture(hi ? 1024 : 512);
  arenaTex.anisotropy = aniso;
  const arena = new THREE.Mesh(
    new THREE.PlaneGeometry(S.arena, S.arena),
    new THREE.MeshBasicMaterial({map: arenaTex, transparent: true, depthWrite: false, toneMapped: false}),
  );
  arena.rotation.x = -Math.PI / 2;
  arena.position.set(pileAt.x, TABLE.y - 0.0002, pileAt.z);
  arena.renderOrder = -1;
  scene.add(arena);

  scene.background = new THREE.Color(0x020b06);
  return {arena};
}
