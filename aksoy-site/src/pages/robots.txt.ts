// Önizleme adresinde (vercel.app) arama motorlarına kapalı; kendi alan adına geçince açılır.
export function GET({ site }: { site: URL }) {
  const preview = !site || site.hostname.endsWith('vercel.app');
  const body = preview
    ? `User-agent: *\nDisallow: /\n`
    : `User-agent: *\nAllow: /\n\nSitemap: ${new URL('/sitemap-index.xml', site).href}\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
