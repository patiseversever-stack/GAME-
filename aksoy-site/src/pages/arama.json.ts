// Arama dizini: derleme sırasında statik JSON olarak üretilir, arama paleti ilk açılışta indirir.
import { products } from '../data/products';
import { categoryBySlug, subcategoryName } from '../data/categories';
import { brandBySlug } from '../data/brands';

export function GET() {
  const index = products.map((p) => ({
    s: p.slug,
    c: p.code,
    n: p.name,
    d: p.drawing,
    h: p.shape,
    k: categoryBySlug[p.category]?.name ?? p.category,
    sc: subcategoryName(p.category, p.subcategory),
    b: p.brands.map((b) => brandBySlug[b]?.name ?? b),
    w: (p.keywords ?? []).join(' '),
  }));
  const tools = [
    { s: '', u: '/teknik-araclar/kesme-hizi-hesaplama', c: 'Kesme hızı & devir', n: 'Vc, n, ilerleme ve talaş hacmi hesaplayıcı', d: 'insert', h: 'C', k: 'Teknik araçlar', sc: 'Hesaplayıcı', b: [], w: 'devir hesaplama kesme hizi vc rpm ilerleme hesap' },
    { s: '', u: '/teknik-araclar/iso-uc-kodu-cozucu', c: 'ISO uç kodu çözücü', n: 'CNMG, DNMG, APMT… kodları harf harf açıklar', d: 'insert', h: 'D', k: 'Teknik araçlar', sc: 'Kod çözücü', b: [], w: 'iso kod cozucu uc kodu ne demek cnmg anlami' },
    { s: '', u: '/teknik-araclar/kilavuz-matkap-tablosu', c: 'Kılavuz matkap tablosu', n: 'M3–M24 kaba ve ince diş için matkap çapları', d: 'tap', k: 'Teknik araçlar', sc: 'Tablo', b: [], w: 'kilavuz matkap capi tablosu klavuz delik capi m8 m10' },
  ];
  return new Response(JSON.stringify([...index, ...tools]), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
