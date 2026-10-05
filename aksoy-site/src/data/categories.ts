import type { Category } from './types';

// Kategori ağacı Iscar Türkiye'nin üst kategorileri ve Türk bayilerinin kullandığı terimler esas alınarak kuruldu.
export const categories: Category[] = [
  {
    slug: 'tornalama',
    name: 'Tornalama',
    summary: 'Torna elmas uçları, dış çap katerleri ve iç çap baraları',
    intro:
      'CNMG, DNMG, WNMG, TNMG, VNMG ve pozitif CCMT/DCMT/VCMT torna elmas uçları; PCLNR, PDJNR, MVJNR gibi dış çap katerleri ve iç çap baraları. Çelik, paslanmaz, döküm ve alüminyum için kalite seçimi teklif aşamasında malzemenize göre yapılır.',
    drawing: 'insert',
    shape: 'C',
    children: [
      { slug: 'tornalama-uclari', name: 'Torna Elmas Uçları' },
      { slug: 'dis-cap-katerleri', name: 'Dış Çap Katerleri' },
      { slug: 'ic-cap-baralari', name: 'İç Çap Baraları' },
    ],
  },
  {
    slug: 'kanal-kesme',
    name: 'Kanal Açma & Kesme',
    summary: 'MGMN kanal uçları, MGEHR / MGIVR kanal katerleri',
    intro:
      '1,5 mm’den 6 mm’ye kadar MGMN kanal ve kesme uçları; dış çap için MGEHR, iç çap için MGIVR katerleri. Aynı uç ailesi hem dış hem iç kanal katerine uyar.',
    drawing: 'holder-groove',
    children: [
      { slug: 'kanal-uclari', name: 'Kanal & Kesme Uçları' },
      { slug: 'kanal-katerleri', name: 'Kanal Katerleri' },
    ],
  },
  {
    slug: 'dis-cekme',
    name: 'Diş Çekme',
    summary: '16ER / 16IR diş uçları, SER / SNR diş katerleri',
    intro:
      'Metrik, Whitworth ve boru dişleri için 16ER (dış) ve 16IR (iç) diş çekme uçları; SER dış diş katerleri ve SNR iç diş baraları.',
    drawing: 'thread-insert',
    children: [
      { slug: 'dis-uclari', name: 'Diş Çekme Uçları' },
      { slug: 'dis-katerleri', name: 'Diş Çekme Katerleri' },
    ],
  },
  {
    slug: 'frezeleme',
    name: 'Frezeleme',
    summary: 'Freze uçları, freze çakıları ve karbür parmak frezeler',
    intro:
      'APMT, SEKT, RPMT freze elmas uçları; BAP 300R / 400R ve 45° alın freze çakıları; 2, 3 ve 4 ağızlı karbür parmak frezeler, küresel ve alüminyum frezeleri.',
    drawing: 'endmill',
    children: [
      { slug: 'freze-uclari', name: 'Freze Elmas Uçları' },
      { slug: 'freze-cakilari', name: 'Freze Çakıları' },
      { slug: 'karbur-parmak-frezeler', name: 'Karbür Parmak Frezeler' },
    ],
  },
  {
    slug: 'delik-delme',
    name: 'Delik Delme',
    summary: 'Karbür matkaplar, uçlu U-matkaplar, raybalar ve punta matkapları',
    intro:
      'İçten soğutmalı ve soğutmasız karbür matkaplar, 2xD–5xD uçlu U-matkaplar (takma uçlu matkap), HSS matkaplar, punta matkapları ve makine raybaları.',
    drawing: 'drill-u',
    children: [
      { slug: 'karbur-matkaplar', name: 'Karbür Matkaplar' },
      { slug: 'uclu-matkaplar', name: 'Uçlu U-Matkaplar' },
      { slug: 'hss-matkaplar', name: 'HSS Matkaplar' },
      { slug: 'raybalar', name: 'Raybalar' },
    ],
  },
  {
    slug: 'kilavuz',
    name: 'Kılavuz',
    summary: 'Helis, ucu spiral ve ovalama makine kılavuzları',
    intro:
      'Kör delik için helis (spiral) oluklu, açık delik için ucu spiral (düz oluklu) ve talaşsız diş için ovalama (form) makine kılavuzları. M3’ten M24’e metrik kaba ve ince diş.',
    drawing: 'tap',
    children: [
      { slug: 'helis-kilavuzlar', name: 'Helis Kılavuzlar' },
      { slug: 'duz-kilavuzlar', name: 'Ucu Spiral Kılavuzlar' },
      { slug: 'ovalama-kilavuzlar', name: 'Ovalama Kılavuzlar' },
    ],
  },
  {
    slug: 'takim-tutucular',
    name: 'Takım Tutucular',
    summary: 'ER pensler, BT40 / BT30 pens tutucular ve çektirme civataları',
    intro:
      'ER16, ER25, ER32 ve ER40 pensler; BT30 ve BT40 ER pens tutucular, freze bağlama arborları ve çektirme civataları (pull stud).',
    drawing: 'chuck-bt',
    children: [
      { slug: 'pensler', name: 'ER Pensler' },
      { slug: 'pens-tutucular', name: 'Pens Tutucular' },
      { slug: 'baglama-aparatlari', name: 'Bağlama Aparatları' },
    ],
  },
];

export const categoryBySlug = Object.fromEntries(categories.map((c) => [c.slug, c]));

export function subcategoryName(cat: string, sub: string) {
  return categoryBySlug[cat]?.children.find((c) => c.slug === sub)?.name ?? sub;
}
