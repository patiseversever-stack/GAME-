import type { Brand } from './types';

// Marka bilgileri tanıtım amaçlıdır. Aksoy Kesici Takımlar bu markaların yetkili bayisi değildir;
// ürünler tedarikçiler üzerinden temin edilir. Logolar izin olmadan kullanılmaz.
export const brands: Brand[] = [
  {
    slug: 'iscar',
    name: 'ISCAR',
    country: 'İsrail',
    segment: 'Premium',
    strengths: ['Kesme ve kanal açma', 'Tornalama', 'Frezeleme', 'Delik delme'],
    description:
      'IMC grubunun amiral markası. Kesme ve kanal açma sistemleriyle tanınır; tornalama, frezeleme ve delik delmede geniş bir ürün gamı sunar. Türkiye’de 1996’dan beri resmi şirketiyle (Gebze) faaliyet gösterir.',
    website: 'https://www.iscar.com',
    catalog: 'https://www.iscar.com/eCatalog/Index.aspx',
  },
  {
    slug: 'tungaloy',
    name: 'Tungaloy',
    country: 'Japonya',
    segment: 'Premium',
    strengths: ['Tornalama kaliteleri', 'Freze sistemleri', 'Kesme', 'Uçlu matkaplar'],
    description:
      'IMC grubunda yer alan Japon üretici. CVD/PVD kaplı torna kaliteleri ve çok kenarlı freze uçlarıyla bilinir. Türkiye’de İstanbul merkezli resmi şirketi bulunur.',
    website: 'https://tungaloy.com',
  },
  {
    slug: 'guhring',
    name: 'Gühring',
    country: 'Almanya',
    segment: 'Premium',
    strengths: ['Karbür matkaplar', 'Kılavuzlar', 'Parmak frezeler', 'Raybalar'],
    description:
      'Döner takımlarda — özellikle karbür matkap, kılavuz ve rayba — dünyanın önde gelen üreticilerinden. Türkiye’de 1988’den beri faaliyet gösterir; İzmir’de üretim ve kaplama tesisi bulunur.',
    website: 'https://guehring.com',
  },
  {
    slug: 'korloy',
    name: 'KORLOY',
    country: 'Güney Kore',
    segment: 'Orta-üst segment',
    strengths: ['Torna elmas uçları', 'Kanal açma (MGMN ailesi)', 'Freze uçları', 'Karbür matkaplar'],
    description:
      'Kore’nin köklü karbür üreticisi. Fiyat/performans dengesiyle Türk atölyelerinde çok yaygın; MGMN kanal ucu adlandırması bu markadan yaygınlaşmıştır. Türkiye’de 2019’dan beri yerel ofisi vardır.',
    website: 'https://www.korloy.com',
  },
  {
    slug: 'kyoto',
    name: 'KYOTO Cutting Tools',
    country: '',
    segment: 'Ekonomik / orta segment',
    strengths: ['Torna elmas uçları', 'Kanal uçları'],
    description:
      'Kutusunda “KYOTO Cutting Tools — Inspected” etiketiyle gelen kesici uç markası. Japon Kyocera ile karıştırılmamalıdır. Uygun fiyatlı torna ve kanal uçlarında tercih edilir.',
    note: 'Kutu fotoğrafından doğrulandı; üretici ve menşei bilgisi eklenecek.',
  },
  {
    slug: 'stormk',
    name: 'STORM&K',
    country: '',
    segment: 'Ekonomik / orta segment',
    strengths: ['Torna elmas uçları', 'Freze uçları'],
    description:
      'Kutusunda “STORM&K — Inspected” etiketiyle gelen kesici uç markası. Bakır tonlu kaplamalı torna ve freze uçlarında uygun fiyatlı bir seçenek.',
    note: 'Kutu fotoğrafından doğrulandı; üretici ve menşei bilgisi eklenecek.',
  },
  {
    slug: 'deskar',
    name: 'DESKAR',
    country: 'Çin',
    segment: 'Ekonomik',
    strengths: ['Torna elmas uçları', 'Freze uçları', 'Kanal uçları'],
    description:
      'Lifeng Precision Tools (Zhejiang) tarafından üretilen Çin markası. Geniş ISO uç yelpazesi ve uygun fiyatıyla seri üretimde ve genel atölye işlerinde tercih edilir.',
    website: 'https://www.deskar.cn',
  },
  {
    slug: 'sant',
    name: 'SANT',
    country: 'Çin',
    segment: 'Ekonomik',
    strengths: ['Kanal ve kesme katerleri', 'Torna katerleri', 'Takım tutucular'],
    description:
      'Çin merkezli kesici takım ve kater üreticisi (büyük olasılıkla Zhuzhou Sant Cutting Tools). MGEHR kanal katerleri gibi Korloy uçlarıyla uyumlu ekonomik tutucular sunar.',
    note: 'Üretici eşleşmesi yaklaşık; ürün fotoğrafındaki logodan.',
  },
];

export const brandBySlug = Object.fromEntries(brands.map((b) => [b.slug, b]));
