// Katalog veri şeması. Ürünler, kategoriler ve markalar bu tiplere uyar.

export type IsoGroup = 'P' | 'M' | 'K' | 'N' | 'S' | 'H';

/** Ürün kartı ve sayfasında çizilecek teknik çizim türü. */
export type Drawing =
  | 'insert' // ISO tornalama/frezeleme ucu (shape alanı ile)
  | 'groove-insert' // MGMN tipi kanal ucu
  | 'thread-insert' // 16ER/16IR diş ucu
  | 'holder-ext' // dış çap kateri
  | 'holder-groove' // kanal / kesme kateri
  | 'holder-thread' // diş çekme kateri
  | 'boring-bar' // iç çap barası
  | 'drill-carbide' // karbür matkap (helis)
  | 'drill-u' // uçlu U-matkap
  | 'drill-hss' // HSS matkap
  | 'center-drill' // punta matkabı
  | 'endmill' // parmak freze (düz uç)
  | 'endmill-ball' // küresel parmak freze
  | 'facemill' // freze çakısı / kafası
  | 'tap' // makine kılavuzu
  | 'reamer' // rayba
  | 'collet' // ER pens
  | 'chuck-bt' // BT/HSK takım tutucu
  | 'pull-stud'; // çektirme civatası

/** ISO 1832 uç şekli harfi (C, D, S, T, V, W, R, A...) — yalnızca drawing: 'insert' için. */
export type InsertShape = 'C' | 'D' | 'S' | 'T' | 'V' | 'W' | 'R' | 'A' | 'K' | 'E' | 'O' | 'H' | 'L' | 'P' | 'X';

export interface Spec {
  label: string;
  value: string;
}

export interface Product {
  /** URL parçası: /urun/{slug}. Türkçe karakter yok, tire ile. Örn: "cnmg-120408" */
  slug: string;
  /** Ürün kodu, ustanın aradığı şekliyle. Örn: "CNMG 120408" */
  code: string;
  /** Kısa Türkçe ad. Örn: "Torna Elmas Uç, 80° eşkenar dörtgen, negatif" */
  name: string;
  /** Üst kategori slug'ı (categories.ts) */
  category: string;
  /** Alt kategori slug'ı (categories.ts içindeki children) */
  subcategory: string;
  drawing: Drawing;
  shape?: InsertShape;
  /** Tedarik edilebilen markaların slug'ları (brands.ts). Yetkili bayilik iddiası yoktur. */
  brands: string[];
  /** Uygun ISO 513 malzeme grupları */
  iso: IsoGroup[];
  /** Spesifikasyon satırları (ölçüler ISO kodundan türetilmiş, doğrulanabilir değerler) */
  specs: Spec[];
  /** 1–3 cümlelik Türkçe açıklama */
  description: string;
  /** Aramada eşleşmesi gereken ek kelimeler: muadil kodlar, yaygın yazımlar ("elmas uç", "klavuz") */
  keywords?: string[];
  /** Uyumlu/ilişkili ürün slug'ları (ör. uç ↔ kater) */
  related?: string[];
  /** Öne çıkan ürün (ana sayfa ve kategori başında) */
  featured?: boolean;
  /** İsteğe bağlı gerçek ürün görseli (public/ altında yol). Yoksa teknik çizim kullanılır. */
  image?: string;
}

export interface Category {
  slug: string;
  name: string;
  /** Kısa tanım, kart altı metin */
  summary: string;
  /** SEO ve kategori sayfası giriş paragrafı */
  intro: string;
  drawing: Drawing;
  shape?: InsertShape;
  children: { slug: string; name: string }[];
}

export interface Brand {
  slug: string;
  name: string;
  country: string;
  /** Kısa konumlandırma: "Premium", "Orta segment", "Ekonomik" */
  segment: string;
  /** Güçlü olduğu alanlar */
  strengths: string[];
  /** 2–4 cümlelik açıklama; "yetkili bayi" iddiası içermez */
  description: string;
  /** Resmî site (bilgi amaçlı link) */
  website?: string;
  /** Resmî e-katalog (bilgi amaçlı link) */
  catalog?: string;
  /** Kimlik doğrulama notu (ör. kutu fotoğrafından doğrulandı) */
  note?: string;
}
