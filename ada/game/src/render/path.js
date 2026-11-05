// Parkurun dünyadaki yolu: kural motorundaki tek boyutlu z, kıvrımlı ve inişli çıkışlı bir eğriye giydirilir.
// Yatay şekil bir eğriden, yükseklik ise bölümlere göre çizilmiş bir profilden gelir.
import * as THREE from 'three/webgpu';

// Yatay şekil (x, z). İleri yön -Z.
const SHAPE = [
  [0, 40], [0, 0], [6, -45], [-7, -95], [-2, -140], [10, -178], [30, -212], [50, -246],
  [60, -272], [66, -305], [71, -336], [76, -366], [82, -394], [86, -425], [82, -462], [74, -500], [70, -540], [66, -600],
];

const smooth = (t) => t * t * (3 - 2 * t);

function elevationProfile(course) {
  const s = Object.fromEntries(course.sections.map((x) => [x.id, x]));
  const zip = course.hazards.find((h) => h.type === 'zip');
  const keys = [
    [-60, 34], [s.kalinti.z0, 34], [s.kalinti.z1, 32.2], [s.ucurum.z1, 29.6], [s.kopru.z1, 28.6],
    [zip.z0, 28.6], [zip.z1, 6.5], [zip.z1 + 7, 3.4], [s.final.z0 + 10, 2.7], [course.length + 80, 2.4],
  ];
  return (z) => {
    if (z <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      if (z <= keys[i][0]) {
        const [z0, y0] = keys[i - 1];
        const [z1, y1] = keys[i];
        const t = (z - z0) / (z1 - z0);
        // ip bölümünde iniş doğrusal (ip çizgisi), diğerlerinde yumuşak
        const isZip = z0 === zip.z0;
        return y0 + (y1 - y0) * (isZip ? t : smooth(t));
      }
    }
    return keys[keys.length - 1][1];
  };
}

export function buildPath(course) {
  const curve = new THREE.CatmullRomCurve3(SHAPE.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
  const total = curve.getLength();
  const startOffset = 40; // z=0, eğrinin 40 m içinde başlar
  const elev = elevationProfile(course);
  const STEP = 0.25;
  const zMin = -40;
  const zMax = Math.min(total - startOffset - 1, course.length + 90);
  const N = Math.ceil((zMax - zMin) / STEP);
  const data = new Float32Array((N + 1) * 6);
  const p = new THREE.Vector3();
  const t = new THREE.Vector3();
  for (let i = 0; i <= N; i++) {
    const z = zMin + i * STEP;
    const u = THREE.MathUtils.clamp((z + startOffset) / total, 0, 1);
    curve.getPointAt(u, p);
    curve.getTangentAt(u, t);
    const y = elev(z);
    const dy = (elev(z + 0.5) - elev(z - 0.5)) / 1.0;
    data.set([p.x, y, p.z, t.x, dy, t.z], i * 6);
  }

  const up = new THREE.Vector3(0, 1, 0);
  function frame(z, outPos = new THREE.Vector3(), outTan = new THREE.Vector3(), outRight = new THREE.Vector3()) {
    const f = THREE.MathUtils.clamp((z - zMin) / STEP, 0, N - 1e-4);
    const i = Math.floor(f);
    const a = f - i;
    const o = i * 6, q = o + 6;
    outPos.set(data[o] + (data[q] - data[o]) * a, data[o + 1] + (data[q + 1] - data[o + 1]) * a, data[o + 2] + (data[q + 2] - data[o + 2]) * a);
    outTan.set(data[o + 3] + (data[q + 3] - data[o + 3]) * a, data[o + 4] + (data[q + 4] - data[o + 4]) * a, data[o + 5] + (data[q + 5] - data[o + 5]) * a).normalize();
    outRight.set(outTan.x, 0, outTan.z).normalize().cross(up).normalize();
    return { pos: outPos, tan: outTan, right: outRight };
  }

  // dünya noktası için yola en yakın nokta: arazi ve yerleşim için
  const coarse = [];
  for (let z = zMin; z <= zMax; z += 2) {
    const f = frame(z);
    coarse.push({ z, x: f.pos.x, zz: f.pos.z });
  }
  const tmp = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  function nearest(x, zw) {
    let best = 1e18, bi = 0;
    for (let i = 0; i < coarse.length; i++) {
      const c = coarse[i];
      const dx = x - c.x, dz = zw - c.zz;
      const d = dx * dx + dz * dz;
      if (d < best) { best = d; bi = i; }
    }
    let s = coarse[bi].z;
    let bestD = Math.sqrt(best);
    for (let k = -2; k <= 2; k += 0.5) {
      const zz = coarse[bi].z + k;
      const f = frame(zz, tmp[0], tmp[1], tmp[2]);
      const d = Math.hypot(x - f.pos.x, zw - f.pos.z);
      if (d < bestD) { bestD = d; s = zz; }
    }
    const f = frame(s, tmp[0], tmp[1], tmp[2]);
    const side = Math.sign((x - f.pos.x) * f.right.x + (zw - f.pos.z) * f.right.z) || 1;
    return { s, d: bestD, side, y: f.pos.y };
  }

  return { frame, nearest, elev, zMin, zMax, length: course.length };
}
