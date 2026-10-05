// Firma bilgileri tek yerde: iletişim, künye ve WhatsApp mesajları buradan beslenir.

export const site = {
  name: 'Aksoy Kesici Takımlar',
  shortName: 'Aksoy',
  owner: 'Kemal Aksoy',
  legalType: 'Şahıs işletmesi',
  // Künyede eksik kalanlar: vergi dairesi/no, açık adres, e-posta. Gelince doldurulacak.
  taxOffice: '',
  taxNumber: '',
  email: '',
  city: 'Ankara',
  district: 'Ostim / İvedik OSB',
  address: 'Ostim / İvedik OSB, Yenimahalle, Ankara',
  phoneDisplay: '+90 535 610 19 89',
  phoneE164: '+905356101989',
  whatsapp: '905356101989',
  hours: 'Hafta içi 08:30–18:30',
  hoursNote: 'Mesai dışında da WhatsApp’tan yazabilirsiniz; ilk fırsatta döneriz.',
  serviceAreas: ['Ankara', 'Konya', 'Kayseri', 'Eskişehir', 'Kırıkkale', 'İzmir', 'Manisa', 'Denizli', 'Aydın', 'Uşak'],
  serviceRegions: 'Ankara merkezli; İç Anadolu ve Ege',
  description:
    'Ankara Ostim / İvedik merkezli kesici takım tedarikçisi. Torna ve freze elmas uçları, karbür matkap, parmak freze, kılavuz ve takım tutucular. Sahada destek, WhatsApp’tan hızlı teklif.',
  tagline: 'Doğru kesici takım, aynı gün teklif.',
};

export const nav = [
  { href: '/urunler', label: 'Ürünler' },
  { href: '/markalar', label: 'Markalar' },
  { href: '/teknik-araclar', label: 'Teknik Araçlar' },
  { href: '/blog', label: 'Blog' },
  { href: '/iletisim', label: 'İletişim' },
];

export function waLink(text?: string) {
  const base = `https://wa.me/${site.whatsapp}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export const waDefault = waLink('Merhaba Aksoy Kesici Takımlar, kesici takım için teklif almak istiyorum.');

// Marka adları ürünleri tanımlamak için kullanılır; yetkili bayilik iddiası yoktur.
export const trademarkNotice =
  'Sitede geçen marka ve ürün adları ilgili sahiplerinin tescilli markalarıdır; yalnızca tedarik edilen ürünleri tanımlamak amacıyla kullanılır. Aksoy Kesici Takımlar bu markaların yetkili bayisi veya distribütörü değildir.';
