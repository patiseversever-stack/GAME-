import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { noindexPaths } from './src/data/posts.ts';

// Yayındaki adres (kanonik adresler, site haritası ve paylaşım görselleri buna göre üretilir).
// Kendi alan adı alınınca Vercel'de SITE_URL ortam değişkeni ayarlanır.
const SITE = process.env.SITE_URL || 'https://game-aksoy-site.vercel.app';

export default defineConfig({
  site: SITE,
  // Paralel derlemeler birbirinin dist klasörünü ezmesin diye ortam değişkeniyle değiştirilebilir.
  outDir: process.env.ASTRO_OUT_DIR || './dist',
  cacheDir: process.env.ASTRO_CACHE_DIR || './node_modules/.astro',
  trailingSlash: 'never',
  devToolbar: { enabled: false },
  // Tüm CSS sayfaya gömülür: ilk boyamayı geciktiren ayrı stil isteği kalmaz
  build: { inlineStylesheets: 'always' },
  integrations: [sitemap({ filter: (page) => !noindexPaths.includes(new URL(page).pathname.replace(/\/$/, '')) })],
  vite: {
    build: { assetsInlineLimit: 2048 },
  },
});
