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
  return new Response(JSON.stringify(index), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
