// Teknik araç sayfaları için JSON-LD üreticileri (derleme sırasında çalışır).

export interface Crumb {
  name: string;
  /** Kök göreli yol, ör. "/teknik-araclar". Son öğede de verilir (kanonik adres). */
  path: string;
}

export function breadcrumbSchema(site: URL | undefined, crumbs: Crumb[]) {
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

export interface Qa {
  q: string;
  /** Basit HTML içerebilir (<b>, <code>); şemada etiketler temizlenir. */
  a: string;
}

const strip = (s: string) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

export function faqSchema(items: Qa[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.q,
      acceptedAnswer: { '@type': 'Answer', text: strip(it.a) },
    })),
  };
}

export function toolSchema(site: URL | undefined, path: string, name: string, description: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name,
    description,
    url: new URL(path, site).href,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Tarayıcı',
    inLanguage: 'tr-TR',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'TRY' },
  };
}
