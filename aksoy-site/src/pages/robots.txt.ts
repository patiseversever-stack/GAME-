// Arama motorlarına açık. Önizleme (preview) dağıtımlarına Vercel kendisi "noindex" başlığı ekler;
// kanonik adresler astro.config.mjs içindeki SITE_URL'yi gösterir.
export function GET({ site }: { site: URL }) {
  const body = `User-agent: *\nAllow: /\n\nSitemap: ${new URL('/sitemap-index.xml', site).href}\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
