// Arazi: yolun çevresinde ince, yoğun bir şerit (kameranın gördüğü yer) + adanın geri kalanı için kaba ızgara.
// Bölümler: kalıntı platosu, deniz uçurumu, köprülü vadi, ip geçişi koyu, lagün kumsalı.
import * as THREE from 'three/webgpu';
import { smoothstep, lerp, valueNoise2 } from './util.js';

export function createTerrain({ scene, course, path, quality, detailNormal }) {
  const noise = valueNoise2(42);
  const sec = Object.fromEntries(course.sections.map((s) => [s.id, s]));
  const zip = course.hazards.find((h) => h.type === 'zip');
  const gaps = course.hazards.filter((h) => h.type === 'gap');
  const bridge = course.hazards.find((h) => h.type === 'bridge');
  const deckHalf = 3.0;
  const windowAt = (s, a, b, edge) => smoothstep(a - edge, a + edge, s) * (1 - smoothstep(b - edge, b + edge, s));
  const terrace = (h, step, sharp = 0.68) => {
    const q = Math.floor(h / step) * step;
    const f = (h - q) / step;
    return q + step * (f < sharp ? (f * 0.22) / sharp : 0.22 + ((f - sharp) / (1 - sharp)) * 0.78);
  };

  // yol koordinatında yükseklik: s (yol boyunca), x (yana, sağ +), y (yolun yüksekliği)
  function heightPath(s, x, y, wx, wz) {
    const d = Math.abs(x);
    const side = x >= 0 ? 1 : -1;
    const nz = noise(wx * 0.014, wz * 0.014, 5);
    const nz2 = noise(wx * 0.055 + 31, wz * 0.055 + 7, 4);
    const nz3 = noise(wx * 0.2 + 3, wz * 0.2 + 11, 2);
    // iç kara: dalgalı orman platosu, uzakta basamaklı tepeler
    let inland = y - 0.55 + smoothstep(5, 50, d) * (4 + 20 * nz) + (nz2 - 0.5) * 1.6 * smoothstep(4, 14, d);
    inland = lerp(inland, terrace(inland, 3.6), smoothstep(14, 30, d) * 0.75);
    let h = inland;

    // deniz uçurumu (sağ): önce kenar kayalığı, sonra kademeli dik iniş ve kayalık kıyı
    const cliffW = windowAt(s, sec.ucurum.z0 - 36, sec.kopru.z0 + 12, 14);
    if (side > 0 && cliffW > 0) {
      const edge = 5.8 + nz2 * 2.2;
      const t = smoothstep(edge, edge + 5 + 3 * nz, d);
      let cliff = lerp(y - 0.55, -3.5 + nz3 * 1.2, t);
      cliff = lerp(cliff, terrace(cliff, 5.2, 0.5), t * (1 - t) * 3.2);
      cliff -= smoothstep(edge + 9, edge + 40, d) * 6;
      h = lerp(h, cliff, cliffW);
    }
    // köprülü vadi: iki yanda kayalık duvarlar, dipte dere
    const rav = windowAt(s, bridge.z0 + 2, bridge.z1 - 2, 7);
    if (rav > 0) {
      const floor = -1.6 + nz2 * 0.8 + nz3 * 0.5;
      const wallT = smoothstep(9 + nz2 * 4, 34, d);
      const wall = lerp(floor, inland, wallT);
      h = lerp(h, lerp(wall, terrace(wall, 4.2, 0.55), wallT * (1 - wallT) * 3), rav);
    }
    // ip geçişi: deniz koyu
    const inlet = windowAt(s, zip.z0 + 4, zip.z1 - 4, 6);
    if (inlet > 0) h = lerp(h, lerp(-7 + nz2 * 2.5, inland, smoothstep(26 + nz * 10, 64, d)), inlet);
    // lagün: solda kumsal ve palmiye kuşağı, sağda sığ lagün, kum adacıkları
    const fin = smoothstep(sec.final.z0 - 12, sec.final.z0 + 6, s);
    if (fin > 0) {
      const beach = y - 0.6 + smoothstep(11, 70, d) * (2.5 + 13 * nz) + (nz3 - 0.5) * 0.25;
      let lagoon = lerp(y - 0.75, -1.4 + nz2 * 0.9, smoothstep(6, 14, d));
      lagoon += Math.max(0, nz3 - 0.62) * 5 * smoothstep(16, 30, d); // kum adacıkları
      lagoon += smoothstep(55, 80, d) * 1.2;
      h = lerp(h, side > 0 ? lagoon : beach, fin);
    }
    // başlangıç düzlüğü
    // yol koridoru
    let corr = y - 0.5;
    for (const g of gaps) if (s > g.z0 - 0.4 && s < g.z1 + 0.4) corr = y - 18;
    const flat = 1 - smoothstep(deckHalf + 0.7, deckHalf + 4.5, d);
    h = lerp(h, corr, flat * (1 - Math.max(rav, inlet)));
    // adanın kıyı çizgisi
    h = lerp(h, -13, smoothstep(95 + 35 * nz, 150, d));
    return h;
  }
  function heightAt(wx, wz) {
    const n = path.nearest(wx, wz);
    return heightPath(n.s, n.side * n.d, n.y, wx, wz);
  }

  // renk paleti: doğal, elle boyanmış hissi
  const C = {
    grassA: new THREE.Color(0x5e8f34), grassB: new THREE.Color(0x86ad43), grassDry: new THREE.Color(0xa9a254),
    grassDark: new THREE.Color(0x3b682a), dirt: new THREE.Color(0x8d6c47), sand: new THREE.Color(0xe8d29e),
    wetSand: new THREE.Color(0xc3a26c), under: new THREE.Color(0xd8c48e), rockA: new THREE.Color(0xa38c73),
    rockB: new THREE.Color(0x7b6652), rockDark: new THREE.Color(0x5a4a3d), moss: new THREE.Color(0x4f7a2e),
  };
  const tc = new THREE.Color(), tr = new THREE.Color();
  function colorAt(wx, y, wz, slope, dPath) {
    const n1 = noise(wx * 0.035, wz * 0.035, 3);
    const n2 = noise(wx * 0.15 + 5, wz * 0.15 + 9, 3);
    const n3 = noise(wx * 0.6 + 2, wz * 0.6 + 4, 2);
    if (y < 0.6) tc.copy(C.under).lerp(C.wetSand, smoothstep(-3, 0.6, y));
    else if (y < 2.8 && slope < 0.25) tc.copy(C.sand).lerp(C.wetSand, (1 - smoothstep(0.6, 1.3, y)) * 0.7);
    else {
      tc.copy(C.grassDark).lerp(C.grassA, smoothstep(0.25, 0.6, n1)).lerp(C.grassB, smoothstep(0.55, 0.85, n1) * 0.8);
      tc.lerp(C.grassDry, smoothstep(0.62, 0.9, n2) * 0.45);
      // yol kenarında aşınmış toprak
      if (dPath != null) tc.lerp(C.dirt, (1 - smoothstep(3.2, 6 + n2 * 2, dPath)) * 0.65);
      // kumsala geçiş
      tc.lerp(C.sand, (1 - smoothstep(2.6, 4.2, y)) * 0.8);
    }
    const rockT = smoothstep(0.3, 0.52, slope);
    if (rockT > 0) {
      const band = Math.sin(y * 1.4 + n2 * 4) * 0.5 + 0.5;
      tr.copy(C.rockA).lerp(C.rockB, band * 0.7).lerp(C.rockDark, smoothstep(0.6, 0.9, n3) * 0.4);
      // kaya üstlerinde yosun
      tr.lerp(C.moss, smoothstep(0.62, 0.85, n2) * (1 - smoothstep(0.45, 0.7, slope)) * 0.7);
      tc.lerp(tr, rockT);
    }
    tc.multiplyScalar(0.9 + n3 * 0.2);
    return tc;
  }

  const matNear = new THREE.MeshLambertNodeMaterial({ vertexColors: true, normalMap: detailNormal, normalScale: new THREE.Vector2(0.55, 0.55) });
  const matFar = new THREE.MeshLambertNodeMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 4 });

  // --- yol şeridi: ince ızgara
  const W = 40;
  const xs = quality.key === 'dusuk' ? 1.6 : quality.key === 'orta' ? 1.0 : 0.7;
  const zs = quality.key === 'dusuk' ? 1.6 : quality.key === 'orta' ? 1.05 : 0.75;
  {
    const zA = path.zMin, zB = path.zMax;
    const nz = Math.ceil((zB - zA) / zs) + 1;
    const nx = Math.ceil((2 * W) / xs) + 1;
    const pos = new Float32Array(nz * nx * 3);
    const uv = new Float32Array(nz * nx * 2);
    const dist = new Float32Array(nz * nx);
    for (let j = 0; j < nz; j++) {
      const s = zA + j * zs;
      const f = path.frame(s);
      for (let i = 0; i < nx; i++) {
        const x = -W + i * xs;
        const wx = f.pos.x + f.right.x * x, wz = f.pos.z + f.right.z * x;
        const k = j * nx + i;
        pos.set([wx, heightPath(s, x, f.pos.y, wx, wz), wz], k * 3);
        uv.set([wx / 5, wz / 5], k * 2);
        dist[k] = Math.abs(x);
      }
    }
    const idx = [];
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    const nrm = g.attributes.normal;
    const col = new Float32Array(nz * nx * 3);
    for (let k = 0; k < nz * nx; k++) {
      const c = colorAt(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2], 1 - nrm.getY(k), dist[k]);
      col.set([c.r, c.g, c.b], k * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    // dış kenarlarda hafif içe batırma: kaba araziyle birleşim izi görünmesin
    const m = new THREE.Mesh(g, matNear);
    m.receiveShadow = quality.shadows;
    scene.add(m);
  }

  // --- adanın geri kalanı: kaba ızgara (yol şeridinin altında saklanır)
  {
    const pts = [];
    for (let z = path.zMin; z <= path.zMax; z += 8) pts.push(path.frame(z).pos.clone());
    const box = new THREE.Box3().setFromPoints(pts).expandByVector(new THREE.Vector3(165, 0, 165));
    const w = box.max.x - box.min.x, dz = box.max.z - box.min.z;
    const res = quality.key === 'dusuk' ? 110 : quality.key === 'orta' ? 150 : 200;
    const g = new THREE.PlaneGeometry(w, dz, Math.round(res * (w / dz)), res);
    g.rotateX(-Math.PI / 2);
    g.translate((box.min.x + box.max.x) / 2, 0, (box.min.z + box.max.z) / 2);
    const p = g.attributes.position;
    const near = new Uint8Array(p.count);
    for (let i = 0; i < p.count; i++) {
      const wx = p.getX(i), wz = p.getZ(i);
      const n = path.nearest(wx, wz);
      let h = heightPath(n.s, n.side * n.d, n.y, wx, wz);
      if (n.d < W - 3 && n.s > path.zMin + 2 && n.s < path.zMax - 2) {
        h -= 6;
        near[i] = 1;
      }
      p.setY(i, h);
    }
    g.computeVertexNormals();
    const nrm = g.attributes.normal;
    const col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const c = colorAt(p.getX(i), p.getY(i), p.getZ(i), 1 - nrm.getY(i), null);
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.deleteAttribute('uv');
    const m = new THREE.Mesh(g, matFar);
    m.receiveShadow = quality.shadows;
    scene.add(m);
    return { heightAt, heightPath, bounds: box, stripWidth: W };
  }
}
