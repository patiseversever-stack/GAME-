// Parkurun kendisi: parke taşlı yol, tahta köprü, ip geçişi kuleleri, engeller, kapılar ve bayraklar.
import * as THREE from 'three/webgpu';
import { positionLocal, time, sin, vec3 } from 'three/tsl';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { LANE_WIDTH } from '../../core/constants.js';
import { paint, blob, merge, rng, pathTools, UP } from './util.js';
import { bannerTexture } from '../textures.js';

export function createTrack({ scene, course, path, quality, instanced, mats, detailNormal }) {
  const { along, yawAt, quatAt } = pathTools(path);
  const sec = Object.fromEntries(course.sections.map((s) => [s.id, s]));
  const zip = course.hazards.find((h) => h.type === 'zip');
  const gaps = course.hazards.filter((h) => h.type === 'gap');
  const bridge = course.hazards.find((h) => h.type === 'bridge');
  const shadows = quality.shadows;
  const deckWidth = LANE_WIDTH * 3 + 0.9;
  const R = rng(99);
  const tint = (hex, j = 0.08) => new THREE.Color(hex).multiplyScalar(1 - j + R() * j * 2);
  const cut = [...gaps.map((g) => [g.z0, g.z1]), [zip.z0, zip.z1]];
  const isCut = (z, pad = 0) => cut.some(([a, b]) => z > a - pad && z < b + pad);

  // --- geometri kiti
  const K = {
    cobble: paint(new RoundedBoxGeometry(0.56, 0.22, 0.5, 2, 0.07), 0xffffff, { bottom: 0.7, top: 1.04 }),
    curb: paint(new RoundedBoxGeometry(1, 1, 1, 2, 0.12), 0xffffff, { bottom: 0.7, top: 1.06 }),
    plank: paint(new RoundedBoxGeometry(1, 0.13, 0.38, 2, 0.045), 0xffffff, { bottom: 0.68, top: 1.04 }),
    beam: paint(new THREE.BoxGeometry(1, 1, 1), 0xffffff, { bottom: 0.8, top: 1.0 }),
    column: paint(new THREE.CylinderGeometry(0.46, 0.52, 1, 16, 4), 0xffffff, { bottom: 0.78, top: 1.06, noiseAmt: 0.12, seed: 4 }),
    block: paint(new RoundedBoxGeometry(1, 1, 1, 2, 0.1), 0xffffff, { bottom: 0.72, top: 1.08 }),
    moss: paint(blob(0.6, 2, 0.45, 3, 2, 0.55), 0x4f8a30, { bottom: 0.75, top: 1.15, topColor: 0x86bb45 }),
    log: (() => {
      const g = new THREE.CylinderGeometry(1, 1, 1, 16, 1);
      const p = g.attributes.position, n = g.attributes.normal;
      const col = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) {
        const c = Math.abs(n.getY(i)) > 0.9 ? new THREE.Color(0xd9ab72) : new THREE.Color(0x6e4a2e);
        col.set([c.r, c.g, c.b], i * 3);
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      return g;
    })(),
    post: paint(new THREE.CylinderGeometry(1, 1.08, 1, 8, 1), 0xffffff, { bottom: 0.75, top: 1.04 }),
    rope: paint(new THREE.CylinderGeometry(1, 1, 1, 6, 1), 0xd2b07a, { bottom: 1, top: 1 }),
    rock: paint(blob(1, 3, 0.55, 9, 0.8), 0xffffff, { bottom: 0.65, top: 1.12, noiseAmt: 0.2, seed: 7 }),
  };
  const L = { cobble: [], curb: [], plank: [], beam: [], column: [], block: [], moss: [], log: [], post: [], rope: [], rock: [], paint: [] };
  const STONE = () => tint(0xdccbaa, 0.07);

  // --- parke taşlı yol (kalıntılar ve uçurum)
  const stoneCols = [0xd9c9a8, 0xc9b692, 0xbfa985, 0xd2c09e];
  for (let z = -26; z < sec.ucurum.z1; z += 0.56) {
    if (isCut(z, 0.4)) continue;
    const row = Math.round(z / 0.56);
    const n = 10;
    for (let k = 0; k < n; k++) {
      const off = (row % 2) * 0.5;
      const xi = -deckWidth / 2 + ((k + 0.5 + off) / (n + 0.5)) * deckWidth;
      const p = along(z, xi, -0.12 + R() * 0.035);
      L.cobble.push({ x: p.x, y: p.y, z: p.z, q: quatAt(z, new THREE.Euler((R() - 0.5) * 0.06, (R() - 0.5) * 0.2, (R() - 0.5) * 0.06)), sx: 0.86 + R() * 0.16, sy: 0.9 + R() * 0.2, sz: 0.86 + R() * 0.14, color: tint(stoneCols[(row * 3 + k) % 4], 0.06) });
    }
    if (row % 4 === 0) for (const sx of [-1, 1]) {
      const p = along(z, sx * (deckWidth / 2 + 0.3), -0.02 + R() * 0.05);
      L.curb.push({ x: p.x, y: p.y, z: p.z, q: quatAt(z, new THREE.Euler(0, (R() - 0.5) * 0.08, 0)), sx: 0.5, sy: 0.42, sz: 1.92, color: tint(0xb39b78, 0.06) });
    }
  }
  // taşların arası: koyu derz
  {
    const pos = [], idx = [];
    const strip = (z0, z1) => {
      const start = pos.length / 3;
      for (let z = z0, i = 0; z <= z1 + 1e-6; z += 1, i++) {
        const f = path.frame(z);
        const a = f.pos.clone().addScaledVector(f.right, -deckWidth / 2 - 0.1).addScaledVector(UP, -0.22);
        const b = f.pos.clone().addScaledVector(f.right, deckWidth / 2 + 0.1).addScaledVector(UP, -0.22);
        pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
        if (i > 0) {
          const n = start + i * 2;
          idx.push(n - 2, n, n - 1, n - 1, n, n + 1);
        }
      }
    };
    let a = -26;
    for (const [c0, c1] of [...cut].sort((x, y) => x[0] - y[0]).filter((c) => c[0] < sec.ucurum.z1)) {
      strip(a, c0 - 0.45);
      a = c1 + 0.45;
    }
    strip(a, sec.ucurum.z1);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshLambertNodeMaterial({ color: 0x5e4d3b }));
    m.receiveShadow = shadows;
    scene.add(m);
  }

  // --- tahta güverteler
  const plankRun = (z0, z1, width) => {
    for (let z = z0; z < z1; z += 0.42) {
      if (isCut(z, 0.15)) continue;
      const p = along(z, (R() - 0.5) * 0.04, -0.07 + (R() - 0.5) * 0.02);
      L.plank.push({ x: p.x, y: p.y, z: p.z, q: quatAt(z, new THREE.Euler(0, (R() - 0.5) * 0.035, (R() - 0.5) * 0.025)), sx: width * (0.96 + R() * 0.06), sy: 1, sz: 1, color: tint([0xb7845a, 0xa8764c, 0xc69563, 0x9e6e47][Math.floor(R() * 4)], 0.06) });
    }
  };
  plankRun(sec.kopru.z0, bridge.z0, deckWidth);
  plankRun(bridge.z0, bridge.z1, LANE_WIDTH + 0.35);
  plankRun(bridge.z1, zip.z0, deckWidth);
  plankRun(zip.z1, course.length + 50, deckWidth);
  for (const [a, b] of [[sec.kopru.z0, zip.z0], [zip.z1, course.length + 50]]) {
    for (let z = a; z < b; z += 2) {
      if (isCut(z, 0.6)) continue;
      const inBridge = z > bridge.z0 - 1 && z < bridge.z1 + 1;
      for (const sx of [-1, 1]) {
        const xx = inBridge ? sx * (LANE_WIDTH / 2 + 0.12) : sx * (deckWidth / 2 - 0.3);
        const p = along(z + 1, xx, -0.3);
        L.beam.push({ x: p.x, y: p.y, z: p.z, q: quatAt(z + 1), sx: 0.2, sy: 0.22, sz: 2.04, color: tint(0x5e4029, 0.05) });
      }
      // lagün iskelesi: suya inen kazıklar
      if (!inBridge && z > zip.z1 && Math.round(z) % 4 === 0) for (const sx of [-1, 1]) {
        const p = along(z + 1, sx * (deckWidth / 2 - 0.3), -1.6);
        L.post.push({ x: p.x, y: p.y, z: p.z, sx: 0.17, sy: 2.8, sz: 0.17, color: tint(0x5e4029, 0.05) });
      }
    }
  }

  // --- engeller
  const laneSpan = (lanes) => {
    const a = Math.min(...lanes), b = Math.max(...lanes);
    return { center: ((a + b) / 2) * LANE_WIDTH, width: (b - a + 1) * LANE_WIDTH };
  };
  for (const o of course.obstacles) {
    const { center, width } = laneSpan(o.lanes);
    const zc = o.z + o.depth / 2;
    const yaw = yawAt(zc);
    if (o.style === 'sutun') {
      const drums = Math.max(2, Math.round(width / 1.25));
      for (let i = 0; i < drums; i++) {
        const xi = center - width / 2 + (i + 0.5) * (width / drums);
        const p = along(zc + (R() - 0.5) * 0.12, xi, 0.45);
        L.column.push({ x: p.x, y: p.y, z: p.z, q: quatAt(zc, new THREE.Euler(0, (R() - 0.5) * 0.08, Math.PI / 2 + (R() - 0.5) * 0.06)), sx: 0.9, sy: width / drums - 0.05, sz: 0.9, color: STONE() });
        if (R() < 0.6) {
          const m = along(zc, xi + (R() - 0.5) * 0.4, 0.86);
          L.moss.push({ x: m.x, y: m.y, z: m.z, s: 0.42 + R() * 0.2, sy: 0.45, ry: R() * 3 });
        }
      }
    } else if (o.style === 'kemer') {
      for (const sx of [-1, 1]) {
        const p = along(zc, sx * (deckWidth / 2 + 0.5), 1.4);
        L.block.push({ x: p.x, y: p.y, z: p.z, ry: yaw, sx: 1.0, sy: 2.8, sz: 1.05, color: STONE() });
        const m = along(zc, sx * (deckWidth / 2 + 0.5), 2.85);
        L.moss.push({ x: m.x, y: m.y, z: m.z, s: 0.75, sy: 0.45, ry: R() * 3 });
      }
      const p = along(zc, 0, 1.62);
      L.block.push({ x: p.x, y: p.y, z: p.z, ry: yaw, rz: (R() - 0.5) * 0.035, sx: deckWidth + 2.1, sy: 1.0, sz: 0.98, color: STONE() });
      for (let k = 0; k < 4; k++) {
        const m = along(zc + (R() - 0.5) * 0.5, (R() - 0.5) * deckWidth, 2.15);
        L.moss.push({ x: m.x, y: m.y, z: m.z, s: 0.45 + R() * 0.35, sy: 0.4, ry: R() * 3 });
      }
    } else if (o.style === 'duvar') {
      const cols = Math.round(width / 0.9);
      for (let c = 0; c < cols; c++) {
        const hmax = 3 + Math.floor(R() * 2);
        for (let k = 0; k < hmax; k++) {
          const xi = center - width / 2 + (c + 0.5) * (width / cols) + (R() - 0.5) * 0.05;
          const p = along(zc, xi, 0.32 + k * 0.6);
          L.block.push({ x: p.x, y: p.y, z: p.z, ry: yaw + (R() - 0.5) * 0.12, sx: width / cols - 0.04, sy: 0.58, sz: o.depth * (0.85 + R() * 0.2), color: STONE() });
        }
        if (R() < 0.6) {
          const m = along(zc, center - width / 2 + (c + 0.5) * (width / cols), 0.32 + hmax * 0.6);
          L.moss.push({ x: m.x, y: m.y, z: m.z, s: 0.5, sy: 0.35, ry: R() * 3 });
        }
      }
    } else if (o.style === 'kaya') {
      for (const l of o.lanes) {
        const p = along(zc, l * LANE_WIDTH, 0.85);
        L.rock.push({ x: p.x, y: p.y, z: p.z, rx: R() * 3, ry: R() * 3, s: 1.15 + R() * 0.25, sy: 1.0, color: tint(0xa88f75, 0.06) });
      }
    } else if (o.style === 'kutuk') {
      const p = along(zc, center, 0.42);
      L.log.push({ x: p.x, y: p.y, z: p.z, q: quatAt(zc, new THREE.Euler(0, 0.06, Math.PI / 2)), sx: 0.42, sy: width + 0.9, sz: 0.42 });
    } else if (o.style === 'ip_bariyer') {
      for (const sx of [-1, 1]) {
        const p = along(zc, sx * 1.08, 0.92);
        L.post.push({ x: p.x, y: p.y, z: p.z, ry: yaw, sx: 0.12, sy: 1.85, sz: 0.12, color: tint(0x5e4029, 0.05) });
      }
      for (const yy of [1.24, 1.58]) {
        const p = along(zc, 0, yy);
        L.rope.push({ x: p.x, y: p.y, z: p.z, q: quatAt(zc, new THREE.Euler(0, 0, Math.PI / 2)), sx: 0.055, sy: 2.25, sz: 0.055 });
      }
    } else if (o.style === 'ahsap_engel') {
      for (const sx of [-1, 1]) {
        const p = along(zc, center + sx * (width / 2 + 0.12), 0.56);
        L.post.push({ x: p.x, y: p.y, z: p.z, ry: yaw, sx: 0.15, sy: 1.12, sz: 0.15, color: tint(0xefe9dc, 0.03) });
      }
      const segs = 6;
      for (let k = 0; k < segs; k++) {
        const xi = center - width / 2 + (k + 0.5) * (width / segs);
        const p = along(zc, xi, 0.75);
        L.paint.push({ x: p.x, y: p.y, z: p.z, ry: yaw, sx: width / segs + 0.01, sy: 0.24, sz: 0.24, color: new THREE.Color(k % 2 ? 0xf3efe6 : 0xe9701f) });
      }
    } else if (o.style === 'ahsap_duvar') {
      const p = along(zc, center, 1.2);
      L.paint.push({ x: p.x, y: p.y, z: p.z, ry: yaw, sx: width, sy: 2.38, sz: 0.36, color: new THREE.Color(0x1f9ea6) });
      for (const yy of [0.06, 2.44]) {
        const q = along(zc, center, yy);
        L.paint.push({ x: q.x, y: q.y, z: q.z, ry: yaw, sx: width + 0.14, sy: 0.2, sz: 0.46, color: new THREE.Color(0xf3efe6) });
      }
    } else if (o.style === 'ahsap_kemer') {
      for (const sx of [-1, 1]) {
        const p = along(zc, sx * (deckWidth / 2 + 0.25), 1.68);
        L.post.push({ x: p.x, y: p.y, z: p.z, ry: yaw, sx: 0.28, sy: 3.36, sz: 0.28, color: tint(0xefe9dc, 0.03) });
      }
      const p = along(zc, 0, 1.52);
      L.paint.push({ x: p.x, y: p.y, z: p.z, ry: yaw, sx: deckWidth + 0.8, sy: 0.34, sz: 0.34, color: new THREE.Color(0xe9701f) });
      const p2 = along(zc, 0, 3.3);
      L.paint.push({ x: p2.x, y: p2.y, z: p2.z, ry: yaw, sx: deckWidth + 1.1, sy: 0.36, sz: 0.36, color: new THREE.Color(0xf3efe6) });
    }
  }
  // boşluk kenarları: kırık taşlar
  for (const g of gaps) {
    for (const zz of [g.z0, g.z1]) for (let k = 0; k < 7; k++) {
      const p = along(zz + (R() - 0.5) * 0.7, (R() - 0.5) * deckWidth, -0.35 - R() * 0.35);
      L.rock.push({ x: p.x, y: p.y, z: p.z, rx: R() * 3, ry: R() * 3, s: 0.28 + R() * 0.3, color: tint(0xc4ad88, 0.06) });
    }
  }

  // --- köprü direkleri ve korkuluk ipleri
  for (let z = bridge.z0; z <= bridge.z1; z += 3) for (const sx of [-1, 1]) {
    const p = along(z, sx * (LANE_WIDTH / 2 + 0.32), 0.56);
    L.post.push({ x: p.x, y: p.y, z: p.z, ry: yawAt(z), sx: 0.12, sy: 1.38, sz: 0.12, color: tint(0x5e4029, 0.05) });
  }
  const ropeMat = new THREE.MeshLambertNodeMaterial({ color: 0xd2b07a });
  const tube = (pts, r) => {
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 3, r, 6), ropeMat);
    m.castShadow = shadows;
    scene.add(m);
  };
  for (const sx of [-1, 1]) for (const hy of [1.15, 0.62]) {
    const pts = [];
    for (let z = bridge.z0; z <= bridge.z1; z += 1.5) pts.push(along(z, sx * (LANE_WIDTH / 2 + 0.32), hy - 0.12 * Math.sin((((z - bridge.z0) % 3) / 3) * Math.PI)));
    tube(pts, hy > 1 ? 0.045 : 0.03);
  }
  // köprüyü tutan ana halatlar: vadi kenarındaki kazıklara bağlı
  for (const sx of [-1, 1]) {
    const pts = [];
    for (let z = bridge.z0 - 6; z <= bridge.z1 + 6; z += 2) {
      const t = (z - (bridge.z0 - 6)) / (bridge.z1 - bridge.z0 + 12);
      pts.push(along(z, sx * (LANE_WIDTH / 2 + 0.15), -0.28 - Math.sin(t * Math.PI) * 0.35));
    }
    tube(pts, 0.07);
  }

  // --- ip geçişi kuleleri ve halat
  const zipTop0 = along(zip.grab0 + 1, 0, 5.4);
  const zipTop1 = along(zip.z1 + 1.5, 0, 3.4);
  for (const [zc, hgt] of [[zip.grab0 + 1, 5.6], [zip.z1 + 1.5, 3.6]]) {
    for (const sx of [-1, 1]) for (const dz of [-1.2, 1.2]) {
      const p = along(zc + dz, sx * (deckWidth / 2 - 0.2), hgt / 2 - 1.6);
      L.post.push({ x: p.x, y: p.y, z: p.z, ry: yawAt(zc), sx: 0.28, sy: hgt + 3.2, sz: 0.28, color: tint(0x7a5232, 0.05) });
    }
    const p = along(zc, 0, hgt);
    L.paint.push({ x: p.x, y: p.y, z: p.z, ry: yawAt(zc), sx: deckWidth + 0.5, sy: 0.4, sz: 0.45, color: new THREE.Color(0xe9701f) });
    // çapraz destekler
    for (const sx of [-1, 1]) {
      const p2 = along(zc, sx * (deckWidth / 2 - 0.2), hgt * 0.45 - 1);
      L.beam.push({ x: p2.x, y: p2.y, z: p2.z, q: quatAt(zc, new THREE.Euler(0.7, 0, 0)), sx: 0.14, sy: 0.14, sz: Math.hypot(2.4, hgt), color: tint(0x5e4029, 0.05) });
    }
  }
  const zipCurve = new THREE.QuadraticBezierCurve3(zipTop0, zipTop0.clone().lerp(zipTop1, 0.5).add(new THREE.Vector3(0, -1.6, 0)), zipTop1);
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(zipCurve, 90, 0.06, 6), ropeMat));
  const zipRopeY = (z) => zipCurve.getPoint(THREE.MathUtils.clamp((z - (zip.grab0 + 1)) / (zip.z1 + 1.5 - (zip.grab0 + 1)), 0, 1));

  // --- bayraklar (rüzgârda dalgalanır)
  const flagGeo = new THREE.PlaneGeometry(1.5, 0.95, 14, 5).translate(0.75, 0, 0);
  const flagMat = (c) => {
    const m = new THREE.MeshLambertNodeMaterial({ color: c, side: THREE.DoubleSide });
    m.positionNode = positionLocal.add(vec3(0, sin(time.mul(4).add(positionLocal.x.mul(3))).mul(positionLocal.x).mul(0.05), sin(time.mul(6).add(positionLocal.x.mul(4.5))).mul(positionLocal.x).mul(0.16)));
    return m;
  };
  const flagO = flagMat(0xe9701f), flagT = flagMat(0x1f9ea6);
  function flag(z, x, yTop, m) {
    const pole = along(z, x, yTop / 2);
    L.post.push({ x: pole.x, y: pole.y, z: pole.z, sx: 0.055, sy: yTop + 0.3, sz: 0.055, color: new THREE.Color(0xefe9dc) });
    const f = new THREE.Mesh(flagGeo, m);
    f.position.copy(along(z, x, yTop - 0.5));
    f.rotation.y = yawAt(z) + Math.PI / 2 + (x > 0 ? 0 : Math.PI);
    f.castShadow = shadows;
    scene.add(f);
  }
  for (let z = sec.final.z0; z < course.length - 4; z += 8) {
    flag(z, deckWidth / 2 + 0.55, 3.4, flagO);
    flag(z + 4, -deckWidth / 2 - 0.55, 3.4, flagT);
  }
  for (const z of [1, 13]) {
    flag(z, deckWidth / 2 + 0.75, 3.8, flagO);
    flag(z, -deckWidth / 2 - 0.75, 3.8, flagT);
  }

  // --- başlangıç ve bitiş kapıları
  function gate(z, text) {
    for (const sx of [-1, 1]) {
      const p = along(z, sx * (deckWidth / 2 + 0.5), 2.5);
      L.post.push({ x: p.x, y: p.y, z: p.z, ry: yawAt(z), sx: 0.4, sy: 5, sz: 0.4, color: tint(0x7a5232, 0.04) });
      const top = along(z, sx * (deckWidth / 2 + 0.5), 5.15);
      L.block.push({ x: top.x, y: top.y, z: top.z, ry: yawAt(z), sx: 0.7, sy: 0.32, sz: 0.7, color: new THREE.Color(0xe9701f) });
    }
    const p = along(z, 0, 4.8);
    L.paint.push({ x: p.x, y: p.y, z: p.z, ry: yawAt(z), sx: deckWidth + 1.9, sy: 0.42, sz: 0.48, color: new THREE.Color(0x6e4a2e) });
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(deckWidth - 0.3, (deckWidth - 0.3) / 4), new THREE.MeshLambertNodeMaterial({ map: bannerTexture(text, '#e9701f', '#fff7ea'), side: THREE.DoubleSide }));
    banner.position.copy(along(z, 0, 3.92));
    banner.rotation.y = yawAt(z) + Math.PI;
    scene.add(banner);
  }
  gate(8, 'ADA');
  gate(course.length, 'BİTİŞ');

  const m = mats.vc;
  instanced(K.cobble, m, L.cobble, { shadow: false });
  instanced(K.curb, m, L.curb);
  instanced(K.plank, m, L.plank, { shadow: false });
  instanced(K.beam, m, L.beam);
  instanced(K.column, mats.stone, L.column);
  instanced(K.block, mats.stone, L.block);
  instanced(K.moss, m, L.moss, { shadow: false });
  instanced(K.log, m, L.log);
  instanced(K.post, m, L.post);
  instanced(K.rope, m, L.rope);
  instanced(K.rock, mats.stone, L.rock);
  instanced(K.block, m, L.paint);

  return { zipRopeY, deckWidth, kit: K };
}
