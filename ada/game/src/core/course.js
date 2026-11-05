// Hız parkuru üretici. Aynı tohum her zaman aynı parkuru verir.
// Parkur tek boyutlu bir yol (z: başlangıçtan uzaklık) ve üç şeritten (-1, 0, 1) oluşur.
// Görüntü katmanı bu yolu kıvrımlı bir dünya eğrisine giydirir; kurallar bundan habersizdir.
import { createRng } from './rng.js';
import { OBSTACLE } from './constants.js';

// Bölümler: sinematik sırayla. Görüntü katmanı aynı bölüm adlarını çevre seçimi için kullanır.
export const SECTION_LAYOUT = [
  { id: 'baslangic', name: 'Başlangıç', length: 28 },
  { id: 'kalinti', name: 'Kalıntı Yolu', length: 150 },
  { id: 'ucurum', name: 'Uçurum Kenarı', length: 95 },
  { id: 'kopru', name: 'Tahta Köprü', length: 62 },
  { id: 'ip', name: 'İp Geçişi', length: 58 },
  { id: 'final', name: 'Lagün Finali', length: 112 },
];

const ALL = [-1, 0, 1];

export function generateCourse(seed = 1) {
  const rng = createRng(seed ^ 0x9e3779b9);
  const sections = [];
  let z = 0;
  for (const s of SECTION_LAYOUT) {
    sections.push({ ...s, z0: z, z1: z + s.length });
    z += s.length;
  }
  const length = z;
  const obstacles = [];
  const hazards = []; // boşluklar, köprü ve ip: düşme bölgeleri
  const checkpoints = [0];
  let nextId = 1;
  const add = (o) => obstacles.push({ id: nextId++, ...o });

  const sec = Object.fromEntries(sections.map((s) => [s.id, s]));

  // Kalıntı yolu: devrik sütunlar, alçak kemerler, yıkık duvar parçaları
  {
    const s = sec.kalinti;
    let p = s.z0 + 12;
    let last = null;
    while (p < s.z1 - 10) {
      let type = rng.pick(['hurdle', 'hurdle', 'arch', 'block', 'block']);
      if (type === last && rng.chance(0.6)) type = rng.pick(['hurdle', 'arch', 'block']);
      last = type;
      if (type === 'block') {
        const free = rng.pick(ALL);
        const lanes = ALL.filter((l) => l !== free);
        add({ type, z: p, depth: OBSTACLE.block.depth, lanes, style: 'duvar' });
      } else if (type === 'hurdle') {
        const lanes = rng.chance(0.65) ? ALL : ALL.filter((l) => l !== rng.pick(ALL));
        add({ type, z: p, depth: OBSTACLE.hurdle.depth, lanes, style: 'sutun' });
      } else {
        add({ type, z: p, depth: OBSTACLE.arch.depth, lanes: ALL, style: 'kemer' });
      }
      p += rng.range(13, 19);
    }
    checkpoints.push(s.z1);
  }

  // Uçurum kenarı: yıkılmış basamaklar arasında iki boşluk, arada kayalar
  {
    const s = sec.ucurum;
    const g1 = s.z0 + 22;
    const g2 = s.z0 + 62;
    hazards.push({ type: 'gap', z0: g1, z1: g1 + 4.2, respawnZ: g1 - 8 });
    add({ type: 'block', z: s.z0 + 40, depth: 1.6, lanes: [rng.pick([-1, 1]), 0], style: 'kaya' });
    hazards.push({ type: 'gap', z0: g2, z1: g2 + 4.6, respawnZ: g2 - 8 });
    add({ type: 'hurdle', z: s.z0 + 82, depth: 0.7, lanes: ALL, style: 'kutuk' });
    checkpoints.push(g1 - 8, g2 - 8, s.z1);
  }

  // Tahta köprü: yalnızca orta şerit yürünebilir; ortada eksik tahtalar
  {
    const s = sec.kopru;
    hazards.push({ type: 'bridge', z0: s.z0 + 4, z1: s.z1 - 4, lanes: [0], respawnZ: s.z0 - 4 });
    const missing = s.z0 + 30;
    hazards.push({ type: 'gap', z0: missing, z1: missing + 3.4, respawnZ: s.z0 - 4 });
    add({ type: 'arch', z: s.z0 + 48, depth: 0.9, lanes: ALL, style: 'ip_bariyer' });
    checkpoints.push(s.z0 - 4, s.z1);
  }

  // İp geçişi: tutma bölgesinde dokun, ipe asıl ve uçurumu geç
  {
    const s = sec.ip;
    const grab0 = s.z0 + 4;
    const grab1 = s.z0 + 11;
    const end = s.z1 - 6;
    hazards.push({ type: 'zip', grab0, grab1, z0: grab1, z1: end, respawnZ: s.z0 - 2 });
    checkpoints.push(s.z0 - 2, end + 2);
  }

  // Lagün finali: ahşap engeller, denge kirişleri arası kemerler, bayraklı kulvarlar
  {
    const s = sec.final;
    let p = s.z0 + 14;
    const pattern = ['hurdle', 'block', 'arch', 'hurdle', 'block', 'hurdle'];
    for (const type of pattern) {
      if (p > s.z1 - 14) break;
      if (type === 'block') {
        const free = rng.pick(ALL);
        add({ type, z: p, depth: 1.4, lanes: ALL.filter((l) => l !== free), style: 'ahsap_duvar' });
      } else if (type === 'hurdle') {
        add({ type, z: p, depth: 0.7, lanes: ALL, style: 'ahsap_engel' });
      } else {
        add({ type, z: p, depth: 0.9, lanes: ALL, style: 'ahsap_kemer' });
      }
      p += rng.range(13, 17);
    }
  }

  checkpoints.sort((a, b) => a - b);
  return { seed, length, sections, obstacles, hazards, checkpoints };
}

export function sectionAt(course, z) {
  for (const s of course.sections) if (z >= s.z0 && z < s.z1) return s;
  return course.sections[course.sections.length - 1];
}
