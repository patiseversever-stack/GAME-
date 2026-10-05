// İçerik sayfaları (blog, iletişim, yasal) için yapılandırılmış veri yardımcıları.

export interface Crumb { name: string; path: string }

/** schema.org BreadcrumbList. Son öğe bulunduğunuz sayfadır. */
export function breadcrumbSchema(crumbs: Crumb[], site: URL | undefined) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: new URL(c.path, site).href,
    })),
  };
}

/** "2026-10-05" → "5 Ekim 2026" */
export function trDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}
