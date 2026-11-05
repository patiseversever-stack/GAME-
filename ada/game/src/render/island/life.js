// Canlılık ve şov havası: martılar, ışıkta uçuşan tozlar, kamera vinci, ışık kuleleri,
// yapım çadırı, kablolar, lagünde şamandıralar ve sandal.
import * as THREE from 'three/webgpu';
import { positionLocal, time, sin, vec3, abs, float } from 'three/tsl';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { paint, merge, rng, pathTools } from './util.js';
import { bannerTexture, softDot } from '../textures.js';

export function createLife({ scene, course, path, terrain, quality, instanced, mats, deckWidth }) {
  const { along, yawAt } = pathTools(path);
  const sec = Object.fromEntries(course.sections.map((s) => [s.id, s]));
  const zip = course.hazards.find((h) => h.type === 'zip');
  const R = rng(808);
  const updaters = [];
  const ground = (s, x) => {
    const f = path.frame(s);
    const wx = f.pos.x + f.right.x * x, wz = f.pos.z + f.right.z * x;
    return new THREE.Vector3(wx, terrain.heightPath(s, x, f.pos.y, wx, wz), wz);
  };

  // --- martılar: kanat çırpan basit kuşlar, uçurum ve lagün üzerinde daire çizer
  {
    const wing = new THREE.PlaneGeometry(0.9, 0.28, 4, 1);
    const parts = [];
    for (const sx of [-1, 1]) {
      const w = wing.clone().translate(0.45, 0, 0);
      w.rotateX(-Math.PI / 2);
      if (sx < 0) w.scale(-1, 1, 1);
      parts.push(paint(w, 0xf4f4f2, { bottom: 1, top: 1 }));
    }
    parts.push(paint(new THREE.CapsuleGeometry(0.09, 0.5, 3, 6).rotateX(Math.PI / 2), 0xffffff));
    const bird = merge(parts);
    const mat = new THREE.MeshLambertNodeMaterial({ vertexColors: true, side: THREE.DoubleSide });
    mat.positionNode = positionLocal.add(vec3(0, sin(time.mul(9.0)).mul(abs(positionLocal.x)).mul(0.55), 0));
    const flocks = [
      { c: along(sec.ucurum.z0 + 40, 30, 14), r: 22 },
      { c: along(sec.final.z0 + 40, 30, 10), r: 26 },
      { c: along(sec.kalinti.z0 + 60, -10, 26), r: 30 },
    ];
    const n = quality.key === 'dusuk' ? 8 : 18;
    const im = new THREE.InstancedMesh(bird, mat, n);
    im.frustumCulled = false;
    scene.add(im);
    const birds = Array.from({ length: n }, (_, i) => ({ f: flocks[i % flocks.length], ph: R() * Math.PI * 2, sp: 0.18 + R() * 0.12, rr: 0.6 + R() * 0.5, hy: (R() - 0.5) * 6 }));
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s1 = new THREE.Vector3(1, 1, 1);
    updaters.push((t) => {
      const ts = t * 0.001;
      birds.forEach((b, i) => {
        const a = b.ph + ts * b.sp;
        const r = b.f.r * b.rr;
        p.set(b.f.c.x + Math.cos(a) * r, b.f.c.y + b.hy + Math.sin(ts * 0.7 + b.ph) * 1.5, b.f.c.z + Math.sin(a) * r);
        e.set(0, -a, Math.sin(ts + b.ph) * 0.25);
        m4.compose(p, q.setFromEuler(e), s1);
        im.setMatrixAt(i, m4);
      });
      im.instanceMatrix.needsUpdate = true;
    });
  }

  // --- ışıkta uçuşan tozlar/polenler (kameranın çevresinde)
  {
    const n = quality.key === 'dusuk' ? 0 : 70;
    if (n) {
      const mat = new THREE.SpriteNodeMaterial({ map: softDot(), transparent: true, depthWrite: false, color: 0xfff3d6, opacity: 0.55 });
      const motes = [];
      for (let i = 0; i < n; i++) {
        const sp = new THREE.Sprite(mat);
        sp.scale.setScalar(0.05 + R() * 0.06);
        scene.add(sp);
        motes.push({ sp, o: new THREE.Vector3((R() - 0.5) * 16, R() * 6, (R() - 0.5) * 16), ph: R() * 10 });
      }
      updaters.push((t, cam) => {
        const ts = t * 0.001;
        for (const m of motes) {
          const x = ((m.o.x + Math.sin(ts * 0.3 + m.ph) * 1.2 + 8) % 16 + 16) % 16 - 8;
          const z = ((m.o.z + ts * 0.4 + 8) % 16 + 16) % 16 - 8;
          m.sp.position.set(cam.position.x + x, cam.position.y - 2 + m.o.y + Math.sin(ts * 0.5 + m.ph) * 0.4, cam.position.z + z);
        }
      });
    }
  }

  // --- şov ekipmanı
  const dark = new THREE.Color(0x2c2f33), metal = new THREE.Color(0x8d939a), orange = new THREE.Color(0xe9701f);
  const parts = { box: [], cyl: [] };
  const box = paint(new RoundedBoxGeometry(1, 1, 1, 2, 0.06), 0xffffff, { bottom: 0.75, top: 1.05 });
  const cyl = paint(new THREE.CylinderGeometry(1, 1, 1, 10), 0xffffff, { bottom: 0.8, top: 1.05 });

  // kamera vinci: başlangıçta, yolun sağında
  function crane(s, x, yaw) {
    const g = ground(s, x);
    parts.box.push({ x: g.x, y: g.y + 0.35, z: g.z, ry: yaw, sx: 1.6, sy: 0.7, sz: 1.2, color: dark });
    parts.cyl.push({ x: g.x, y: g.y + 1.9, z: g.z, sx: 0.18, sy: 2.8, sz: 0.18, color: metal });
    const armLen = 7;
    const dir = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const tip = g.clone().add(new THREE.Vector3(0, 3.3, 0)).addScaledVector(dir, armLen * 0.8).add(new THREE.Vector3(0, 2.2, 0));
    const base = g.clone().add(new THREE.Vector3(0, 3.3, 0));
    const mid = base.clone().lerp(tip, 0.5);
    const len = base.distanceTo(tip) + 2;
    const qq = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tip.clone().sub(base).normalize());
    parts.cyl.push({ x: mid.x, y: mid.y, z: mid.z, q: qq, sx: 0.12, sy: len, sz: 0.12, color: metal });
    parts.box.push({ x: tip.x, y: tip.y - 0.25, z: tip.z, ry: yaw, sx: 0.5, sy: 0.4, sz: 0.7, color: dark });
    parts.cyl.push({ x: tip.x, y: tip.y - 0.25, z: tip.z, q: new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, yaw, 0, 'YXZ')), sx: 0.12, sy: 0.4, sz: 0.12, color: new THREE.Color(0x111111) });
    const back = base.clone().addScaledVector(dir, -2.2).add(new THREE.Vector3(0, -0.6, 0));
    parts.box.push({ x: back.x, y: back.y, z: back.z, ry: yaw, sx: 0.6, sy: 0.6, sz: 0.6, color: dark });
  }
  crane(4, deckWidth / 2 + 5, yawAt(4) + Math.PI * 0.85);
  crane(sec.final.z0 + 60, -(deckWidth / 2 + 5), yawAt(sec.final.z0 + 60) - Math.PI * 0.2);

  // ışık kuleleri: lagün finali boyunca
  for (let s = sec.final.z0 + 12; s < course.length; s += 28) {
    for (const sx of [-1, 1]) {
      const g = ground(s, sx * (deckWidth / 2 + 6));
      if (g.y < 0.6) continue;
      parts.cyl.push({ x: g.x, y: g.y + 3, z: g.z, sx: 0.09, sy: 6, sz: 0.09, color: metal });
      for (let k = 0; k < 3; k++) parts.box.push({ x: g.x + (k - 1) * 0.5, y: g.y + 6.1, z: g.z, ry: yawAt(s), rx: -0.4, sx: 0.4, sy: 0.4, sz: 0.3, color: dark });
      parts.box.push({ x: g.x, y: g.y + 5.85, z: g.z, ry: yawAt(s), sx: 1.6, sy: 0.08, sz: 0.1, color: metal });
    }
  }

  // yapım çadırı ve kablolar: başlangıcın solunda
  {
    const s = 10;
    const g = ground(s, -(deckWidth / 2 + 7));
    const tentMat = new THREE.MeshLambertNodeMaterial({ color: 0xf2ede2, side: THREE.DoubleSide });
    const tent = new THREE.Mesh(new THREE.ConeGeometry(3.4, 2.4, 4, 1, true).rotateY(Math.PI / 4), tentMat);
    tent.position.set(g.x, g.y + 3.3, g.z);
    tent.rotation.y = yawAt(s);
    tent.castShadow = quality.shadows;
    scene.add(tent);
    for (const [dx, dz] of [[-2.3, -2.3], [2.3, -2.3], [-2.3, 2.3], [2.3, 2.3]]) {
      const v = new THREE.Vector3(dx, 0, dz).applyAxisAngle(new THREE.Vector3(0, 1, 0), yawAt(s));
      parts.cyl.push({ x: g.x + v.x, y: g.y + 1.05, z: g.z + v.z, sx: 0.06, sy: 2.1, sz: 0.06, color: metal });
    }
    for (let k = 0; k < 3; k++) {
      const v = new THREE.Vector3((k - 1) * 1.2, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yawAt(s));
      parts.box.push({ x: g.x + v.x, y: g.y + 0.5, z: g.z + v.z, ry: yawAt(s) + R() * 0.3, sx: 0.9, sy: 0.8, sz: 0.6, color: k === 1 ? orange : dark });
    }
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.8), new THREE.MeshLambertNodeMaterial({ map: bannerTexture('ADA', '#1f9ea6', '#fff7ea'), side: THREE.DoubleSide }));
    banner.position.set(g.x, g.y + 2.25, g.z);
    banner.rotation.y = yawAt(s) - Math.PI / 2;
    scene.add(banner);
    // kablo: çadırdan vince
    const cableMat = new THREE.MeshLambertNodeMaterial({ color: 0x1b1d20 });
    const a = ground(s, -(deckWidth / 2 + 4.5)), b = ground(3, deckWidth / 2 + 4);
    const pts = [];
    for (let k = 0; k <= 12; k++) {
      const t = k / 12;
      const p = a.clone().lerp(b, t);
      pts.push(new THREE.Vector3(p.x + Math.sin(t * 9) * 0.4, p.y + 0.04, p.z));
    }
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.035, 4), cableMat));
  }

  // lagün: kulvar şamandıraları ve demirli sandal
  {
    const buoys = [];
    for (let s = zip.z1 + 8; s < course.length + 20; s += 3.2) {
      for (const x of [9, 13]) {
        const g = ground(s, x);
        if (g.y > -0.3) continue;
        buoys.push({ x: g.x, y: 0.05, z: g.z, s: 0.24, color: Math.round(s / 3.2) % 2 ? new THREE.Color(0xe9701f) : new THREE.Color(0xf3efe6) });
      }
    }
    const buoyGeo = paint(new THREE.SphereGeometry(1, 10, 6), 0xffffff, { bottom: 0.7, top: 1.05 });
    const bm = instanced(buoyGeo, mats.vc, buoys, { shadow: false });
    if (bm) updaters.push((t) => (bm.position.y = Math.sin(t * 0.002) * 0.05));
    const g = ground(sec.final.z0 + 45, 26);
    if (g.y < -0.4) {
      const hull = paint(merge([
        new RoundedBoxGeometry(1.4, 0.5, 3.6, 2, 0.2),
        new RoundedBoxGeometry(1.2, 0.1, 0.4, 1, 0.04).translate(0, 0.25, 0.4),
      ]), 0xb27c4a, { bottom: 0.7, top: 1.05 });
      const boat = new THREE.Mesh(hull, mats.vc);
      boat.position.set(g.x, 0.12, g.z);
      boat.rotation.y = yawAt(sec.final.z0 + 45) + 0.6;
      boat.castShadow = quality.shadows;
      scene.add(boat);
      updaters.push((t) => {
        boat.rotation.z = Math.sin(t * 0.0012) * 0.04;
        boat.position.y = 0.12 + Math.sin(t * 0.0016) * 0.04;
      });
    }
  }

  instanced(box, mats.vc, parts.box);
  instanced(cyl, mats.vc, parts.cyl);
  return { update: (t, cam) => updaters.forEach((u) => u(t, cam)) };
}
