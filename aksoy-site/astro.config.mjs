import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Önizleme adresi. Kendi alan adı alınınca burası değişecek.
const SITE = process.env.SITE_URL || 'https://aksoy-kesici-takimlar.vercel.app';

export default defineConfig({
  site: SITE,
  // Paralel derlemeler birbirinin dist klasörünü ezmesin diye ortam değişkeniyle değiştirilebilir.
  outDir: process.env.ASTRO_OUT_DIR || './dist',
  cacheDir: process.env.ASTRO_CACHE_DIR || './node_modules/.astro',
  trailingSlash: 'never',
  devToolbar: { enabled: false },
  integrations: [sitemap()],
  vite: {
    build: { assetsInlineLimit: 2048 },
  },
});
