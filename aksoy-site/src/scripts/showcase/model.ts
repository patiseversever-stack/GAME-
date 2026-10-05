// Kodla üretilmiş uçlu U-matkap (geçici model). Ölçüler mm; dış grup 0.01 ile ölçeklenir (1 birim = 100 mm).
// Gövde, kullanıcının getireceği GLB ile değiştirilebilir; uçlar, torx vidalar ve soğutma noktaları kodda kalır.
import * as THREE from 'three';
import { buildInsert as buildChipbreakerInsert } from '../three/tools3d';

export interface InsertPart {
  /** Uç + vidanın bağlı olduğu yuva (seat) noktası */
  seat: THREE.Group;
  /** Uçun hareket eden kısmı (havalanma, dönme) */
  insert: THREE.Group;
  screw: THREE.Group;
  /** Körelmiş kesme kenarı parıltısı (uçla birlikte döner) */
  wear: THREE.Mesh;
  /** Havalanma yönü (yuva yerel ekseninde +Z) */
  liftForward: number;
}

export interface Drill {
  /** Dış grup: sahnede bu döndürülür/ölçeklenir */
  root: THREE.Group;
  /** Ekseni +X'e çeviren iç grup (tasarım ekseni +Y) */
  frame: THREE.Group;
  /** GLB ile değiştirilebilecek gövde grubu */
  body: THREE.Group;
  inserts: InsertPart[];
  coolant: { pos: THREE.Vector3; dir: THREE.Vector3 }[];
  anchors: Record<string, THREE.Object3D>;
  materials: Record<string, THREE.MeshPhysicalMaterial | THREE.MeshBasicMaterial>;
  /** Tasarım ekseni boyunca ölçüler (mm) */
  dims: { shankEnd: number; tip: number; bodyStart: number; R: number; shankR: number };
}

const SHANK_R = 16;
const R = 12.5; // Ø25
const A_END = -120;
const A_WELDON_0 = -112;
const A_WELDON_1 = -74;
const A_BODY0 = -41;
const A_TIP = 56;

function latheGeo(pts: [number, number][], seg = 96) {
  return new THREE.LatheGeometry(pts.map(([r, a]) => new THREE.Vector2(r, a)), seg);
}

/** Daireden Weldon düzlüğü kesilmiş kesit */
function weldonShape() {
  const s = new THREE.Shape();
  const yFlat = 13;
  const t0 = Math.asin(yFlat / SHANK_R); // ~54°
  const start = Math.PI - t0;
  const end = 2 * Math.PI + t0;
  const n = 96;
  for (let i = 0; i <= n; i++) {
    const t = start + ((end - start) * i) / n;
    const x = Math.cos(t) * SHANK_R, y = Math.sin(t) * SHANK_R;
    i === 0 ? s.moveTo(x, y) : s.lineTo(x, y);
  }
  s.closePath();
  return s;
}

/** İki düz talaş oluklu gövde kesiti */
function fluteShape() {
  const s = new THREE.Shape();
  const n = 220;
  const D = 7.6; // oluk derinliği → ağız kalınlığı ~9.8 mm
  const w = (58 * Math.PI) / 180;
  const centers = [Math.PI / 2, (3 * Math.PI) / 2];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2;
    let r = R;
    for (const c of centers) {
      let d = Math.abs(t - c);
      d = Math.min(d, Math.PI * 2 - d);
      if (d < w) {
        const u = d / w;
        // U biçimli oluk: tabanda yassı, ağızda keskin
        r = Math.min(r, R - D * Math.pow(Math.cos((Math.PI / 2) * Math.pow(u, 3.2)), 0.55));
      }
    }
    const x = Math.cos(t) * r, y = Math.sin(t) * r;
    i === 0 ? s.moveTo(x, y) : s.lineTo(x, y);
  }
  s.closePath();
  return s;
}

function roundedSquare(size: number, rad: number) {
  const h = size / 2;
  const s = new THREE.Shape();
  s.moveTo(-h + rad, -h);
  s.lineTo(h - rad, -h);
  s.quadraticCurveTo(h, -h, h, -h + rad);
  s.lineTo(h, h - rad);
  s.quadraticCurveTo(h, h, h - rad, h);
  s.lineTo(-h + rad, h);
  s.quadraticCurveTo(-h, h, -h, h - rad);
  s.lineTo(-h, -h + rad);
  s.quadraticCurveTo(-h, -h, -h + rad, -h);
  return s;
}

function torxPath(rOuter: number, rInner: number, lobes = 6) {
  const p = new THREE.Path();
  const n = lobes * 24;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2;
    const k = 0.5 + 0.5 * Math.cos(t * lobes);
    const r = rInner + (rOuter - rInner) * Math.pow(k, 0.7);
    const x = Math.cos(t) * r, y = Math.sin(t) * r;
    i === 0 ? p.moveTo(x, y) : p.lineTo(x, y);
  }
  return p;
}

function makeMaterials() {
  // Gövde: koyu nikel kaplama; oluk içleri köşe rengiyle daha koyu, taşlanmış pahlar parlak
  const body = new THREE.MeshPhysicalMaterial({ color: 0x6a7078, metalness: 1, roughness: 0.32, envMapIntensity: 1.1, vertexColors: true, clearcoat: 0.25, clearcoatRoughness: 0.35 });
  const shank = new THREE.MeshPhysicalMaterial({ color: 0x9da3ab, metalness: 1, roughness: 0.25, envMapIntensity: 1.0 });
  const flat = new THREE.MeshPhysicalMaterial({ color: 0x7a8088, metalness: 1, roughness: 0.5 });
  const flute = new THREE.MeshPhysicalMaterial({ color: 0x4f545b, metalness: 1, roughness: 0.3 });
  const insert = new THREE.MeshPhysicalMaterial({ color: 0xd8a64a, metalness: 1, roughness: 0.27, clearcoat: 0.25, clearcoatRoughness: 0.4, envMapIntensity: 1.25 });
  const screw = new THREE.MeshPhysicalMaterial({ color: 0x3c4046, metalness: 1, roughness: 0.36 });
  const hole = new THREE.MeshBasicMaterial({ color: 0x050506 });
  return { body, shank, flat, flute, insert, screw, hole };
}

function buildInsert(mat: THREE.MeshPhysicalMaterial, holeMat: THREE.MeshBasicMaterial, screwMat: THREE.MeshPhysicalMaterial) {
  const size = 8, th = 3.18;
  const h = size / 2;
  const g = new THREE.Group();
  // Kare SPMG benzeri uç: kesme kenarı bandı, talaş kırıcı oluğu, plato ve havşalı delik
  const body = buildChipbreakerInsert([new THREE.Vector2(h, -h), new THREE.Vector2(h, h), new THREE.Vector2(-h, h), new THREE.Vector2(-h, -h)],
    { rad: 0.8, th, hole: 1.75, land: 0.45, breaker: 1.55 }, { screw: screwMat, hole: holeMat } as any, mat);
  body.position.z = -th / 2;
  g.add(body);
  // Körelmiş kenar: üst yüzde tek bir kesme kenarı boyunca turuncu ısı izi
  const wear = new THREE.Mesh(
    new THREE.BoxGeometry(size - 1.6, 0.55, 0.2),
    new THREE.MeshBasicMaterial({ color: 0xff6a12, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  wear.position.set(0, size / 2 - 0.35, th / 2 + 0.05);
  g.add(wear);
  g.userData.wear = wear;
  return g;
}

/** Markalama: yaka üzerine lazerle yazılmış ölçü (koyu, yarı mat) */
function markingTexture(text: string) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 96;
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, c.width, c.height);
  g.font = '600 54px "IBM Plex Mono", ui-monospace, monospace';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = 'rgba(14,15,17,0.88)';
  g.fillText(text, c.width / 2, c.height / 2 + 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function buildScrew(mat: THREE.Material, holeMat: THREE.Material) {
  const g = new THREE.Group();
  const head = new THREE.Shape();
  head.absarc(0, 0, 2.3, 0, Math.PI * 2, false);
  head.holes.push(torxPath(1.15, 0.82));
  const hg = new THREE.ExtrudeGeometry(head, { depth: 1.1, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.2, bevelSegments: 2, curveSegments: 32 });
  const hm = new THREE.Mesh(hg, mat);
  hm.position.z = -0.6;
  g.add(hm);
  const recess = new THREE.Mesh(new THREE.CircleGeometry(1.0, 24), holeMat);
  recess.position.z = -0.35;
  g.add(recess);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 7, 20), mat);
  shaft.rotation.x = Math.PI / 2;
  shaft.position.z = -4.1;
  g.add(shaft);
  return g;
}

export function buildDrill(): Drill {
  const materials = makeMaterials();
  const root = new THREE.Group();
  root.name = 'drill-root';
  const frame = new THREE.Group(); // tasarım ekseni +Y → dünya +X
  frame.rotation.z = -Math.PI / 2;
  root.add(frame);
  const scaler = new THREE.Group();
  scaler.scale.setScalar(0.01);
  frame.add(scaler);
  const body = new THREE.Group();
  body.name = 'body';
  scaler.add(body);

  // Sap ucu
  body.add(new THREE.Mesh(latheGeo([[0, A_END], [14.6, A_END], [16, A_END + 1.4], [16, A_WELDON_0]]), materials.shank));
  // Weldon düzlüklü bölüm
  const wg = new THREE.ExtrudeGeometry(weldonShape(), { depth: A_WELDON_1 - A_WELDON_0, bevelEnabled: false, curveSegments: 96 });
  wg.rotateX(-Math.PI / 2);
  wg.translate(0, A_WELDON_0, 0);
  // Düzlük yüzeyini ayrı malzemeyle boya: grup 0 = kapaklar, 1 = yan yüzler; düz yüz yan yüzlerin bir parçası.
  body.add(new THREE.Mesh(wg, [materials.shank, materials.shank]));
  const flatPlate = new THREE.Mesh(new THREE.PlaneGeometry(2 * Math.sqrt(SHANK_R ** 2 - 13 ** 2) - 0.2, A_WELDON_1 - A_WELDON_0 - 0.2), materials.flat);
  // Kesitte düzlük y=+13; rotateX(-90°) sonrası z = -13 düzlemi, dışa (-Z) bakar.
  flatPlate.position.set(0, (A_WELDON_0 + A_WELDON_1) / 2, -13.03);
  flatPlate.rotation.set(0, Math.PI, 0);
  body.add(flatPlate);

  // Sap devamı, boyun, flanş (yaka) ve gövdeye geçiş
  body.add(
    new THREE.Mesh(
      latheGeo([
        [16, A_WELDON_1], [16, -63.2], [15.2, -62], [14, -61.6], [14, -59.8], [20.6, -58], [22, -56.6],
        [22, -45.4], [20.6, -44], [14.2, -43.4], [12.9, -41.5], [12.9, -40.5], [0, -40.5],
      ]),
      materials.shank,
    ),
  );

  // Oluklu gövde
  const fg = new THREE.ExtrudeGeometry(fluteShape(), { depth: A_TIP - A_BODY0, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.35, bevelSegments: 2, curveSegments: 220 });
  fg.rotateX(-Math.PI / 2);
  fg.translate(0, A_BODY0, 0);
  // Oluk içini koyulaştır: köşe noktası yarıçapına göre köşe rengi (metal tonu çarpanı)
  {
    const pos = fg.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const nrm = fg.attributes.normal;
    for (let i = 0; i < pos.count; i++) {
      const r = Math.hypot(pos.getX(i), pos.getZ(i));
      const k = THREE.MathUtils.smoothstep(r, R - 2.2, R - 0.2);
      let c = 0.58 + 0.42 * k;
      // Uç yüzü (kesme tarafı) taşlanmış ama koyu: düz "tıpa" görünmesin
      if (nrm.getY(i) > 0.9 && pos.getY(i) > A_TIP - 1) c = 0.5;
      col[i * 3] = c; col[i * 3 + 1] = c; col[i * 3 + 2] = c * 1.02;
    }
    fg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  body.add(new THREE.Mesh(fg, materials.body));

  // Yaka üzerinde lazer markalama (ön yüz)
  const mark = new THREE.Mesh(
    new THREE.CylinderGeometry(22.04, 22.04, 7, 96, 1, true, -0.62, 1.24),
    new THREE.MeshPhysicalMaterial({ map: markingTexture('Ø25 · 4×D · IC 08'), transparent: true, depthWrite: false, metalness: 0.4, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2 }),
  );
  mark.position.y = -51;
  body.add(mark);
  // Sap arkasında içten soğutma girişi
  const inlet = new THREE.Mesh(new THREE.CircleGeometry(3.2, 32), materials.hole);
  inlet.rotation.x = Math.PI / 2;
  inlet.position.y = A_END - 0.02;
  body.add(inlet);

  // Uç yüzü: soğutma delikleri
  const coolant: Drill['coolant'] = [];
  const anchors: Record<string, THREE.Object3D> = {};
  const holes = [
    new THREE.Vector3(3.2, A_TIP + 0.52, -2.4),
    new THREE.Vector3(-3.2, A_TIP + 0.52, 2.4),
  ];
  holes.forEach((p, i) => {
    const h = new THREE.Mesh(new THREE.CircleGeometry(1.25, 24), materials.hole);
    h.position.copy(p);
    h.rotation.x = -Math.PI / 2;
    body.add(h);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.25, 1.6, 24), materials.screw);
    ring.position.copy(p).add(new THREE.Vector3(0, 0.01, 0));
    ring.rotation.x = -Math.PI / 2;
    body.add(ring);
    coolant.push({ pos: p.clone().add(new THREE.Vector3(0, 0.3, 0)), dir: new THREE.Vector3(i ? -0.05 : 0.05, 1, 0).normalize() });
  });

  // Uçlar ve torx vidalar (öne bakan olukta: +Z)
  const inserts: InsertPart[] = [];
  // Gerçek U-matkaptaki gibi: merkez ucu bir olukta eksene yakın, çevre ucu karşı olukta dış çapta;
  // kesme kenarları ortada üst üste biner ve uç yüzünden ~0,6 mm öne taşar.
  const seats = [
    { name: 'cevre', pos: new THREE.Vector3(8.7, A_TIP - 3.4, -5.5), rot: new THREE.Euler(-0.08, Math.PI + 0.05, -0.1) },
    { name: 'merkez', pos: new THREE.Vector3(1.0, A_TIP - 3.5, 5.5), rot: new THREE.Euler(0.08, -0.04, -0.06) },
  ];
  for (const s of seats) {
    const seat = new THREE.Group();
    seat.position.copy(s.pos);
    seat.rotation.copy(s.rot);
    scaler.add(seat);
    const ins = new THREE.Group();
    const insMesh = buildInsert(materials.insert, materials.hole, materials.screw);
    ins.add(insMesh);
    seat.add(ins);
    // Uç cebi: uçtan biraz büyük karanlık oyuk, kenarlarda gölge çizgisi olarak görünür
    const pocket = new THREE.Mesh(new THREE.BoxGeometry(9.0, 8.6, 1.3), materials.hole);
    pocket.position.set(0, -0.75, -2.0);
    seat.add(pocket);
    const screw = buildScrew(materials.screw, materials.hole);
    screw.position.z = 1.9;
    seat.add(screw);
    inserts.push({ seat, insert: ins, screw, wear: insMesh.userData.wear, liftForward: s.name === 'cevre' ? 1 : 0.6 });
    // Etiket noktası ucun kendisine bağlı: uç yerinden çıkınca etiket de onunla gider
    const a = new THREE.Object3D();
    ins.add(a);
    a.position.set(0, 0, 2);
    anchors[`insert-${s.name}`] = a;
    const sa = new THREE.Object3D();
    screw.add(sa);
    sa.position.set(0, 0, 0.6);
    anchors[`screw-${s.name}`] = sa;
  }

  // Ölçü ve etiket çapaları (tasarım ekseninde)
  const add = (name: string, x: number, a: number, z: number) => {
    const o = new THREE.Object3D();
    o.position.set(x, a, z);
    scaler.add(o);
    anchors[name] = o;
  };
  add('dia-a', R + 0.4, A_TIP + 1, 0);
  add('dia-b', -R - 0.4, A_TIP + 1, 0);
  add('len-a', R + 7, -44, 0);
  add('len-b', R + 7, A_TIP, 0);
  add('len-a0', R + 1, -44, 0);
  add('len-b0', R + 1, A_TIP, 0);
  add('shank', -SHANK_R, (A_WELDON_0 + A_WELDON_1) / 2, 4);
  add('collar', -22, -51, 6);
  add('cool', holes[0].x, holes[0].y + 2, holes[0].z);
  add('tip', 0, A_TIP, 0);
  add('flute', 0, 10, 8);

  return {
    root,
    frame,
    body,
    inserts,
    coolant: coolant.map((c) => ({ pos: c.pos, dir: c.dir })),
    anchors,
    materials,
    dims: { shankEnd: A_END, tip: A_TIP, bodyStart: -44, R, shankR: SHANK_R },
  };
}

/** Tasarım ekseninde (mm) bir noktayı ölçekli gruba göre yerelleştirir */
export const MM = 0.01;
