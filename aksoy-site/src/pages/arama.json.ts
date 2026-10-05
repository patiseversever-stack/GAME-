// Arama dizini: derleme sırasında statik JSON olarak üretilir, arama paleti ilk açılışta indirir.
import { products } from '../data/products';
import { categoryBySlug, subcategoryName } from '../data/categories';
import { brandBySlug } from '../data/brands';
import { productImage } from '../lib/product-image';
import { ISO_GROUPS } from '../lib/catalog';

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
    i: productImage(p)?.small,
  }));
  const tools = [
    { s: '', u: '/teknik-araclar/kesme-hizi-hesaplama', c: 'Kesme hızı & devir', n: 'Vc, n, ilerleme ve talaş hacmi hesaplayıcı', d: 'insert', h: 'C', k: 'Teknik araçlar', sc: 'Hesaplayıcı', b: [], w: 'devir hesaplama kesme hizi vc rpm ilerleme hesap' },
    { s: '', u: '/teknik-araclar/iso-uc-kodu-cozucu', c: 'ISO uç kodu çözücü', n: 'CNMG, DNMG, APMT… kodları harf harf açıklar', d: 'insert', h: 'D', k: 'Teknik araçlar', sc: 'Kod çözücü', b: [], w: 'iso kod cozucu uc kodu ne demek cnmg anlami' },
    { s: '', u: '/teknik-araclar/kilavuz-matkap-tablosu', c: 'Kılavuz matkap tablosu', n: 'M3–M24 kaba ve ince diş için matkap çapları', d: 'tap', k: 'Teknik araçlar', sc: 'Tablo', b: [], w: 'kilavuz matkap capi tablosu klavuz delik capi m8 m10' },
  ];
  // Malzeme araması ("paslanmaz", "titanyum"…): katalogu o malzeme grubuna süzer
  const words: Record<string, string> = {
    P: 'celik yapi celigi islah imalat celigi st37 st52 c45 42crmo4 ck45',
    M: 'paslanmaz celik inox krom 304 316 dubleks ostenitik',
    K: 'dokum dokme demir gri dokum sfero pik',
    N: 'aluminyum alu bakir pirinc bronz demir disi plastik',
    S: 'super alasim titanyum inconel nikel hastelloy isil direncli',
    H: 'sertlestirilmis sert celik hrc 55 hrc 60 hrc islenmis kalip celigi',
  };
  const materials = ISO_GROUPS.map((g) => ({ s: '', u: `/urunler?iso=${g.g}`, c: `${g.t} (ISO ${g.g})`, n: `${g.s}: bu malzemeye uygun ürünler`, d: 'insert', h: 'C', k: 'Malzeme', sc: 'Malzeme grubu', b: [], w: words[g.g] }));
  return new Response(JSON.stringify([...index, ...tools, ...materials]), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
