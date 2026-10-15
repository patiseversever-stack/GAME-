// Oyun deneme sunucusu: HMR kapalı (başka dosyalar değişince açık deneme sayfası yeniden yüklenmesin).
// Kullanım: npx vite --config dev/vite-game.config.ts --port 5211 --host 127.0.0.1
import {defineConfig} from 'vite';

export default defineConfig({
  root: '.',
  base: './',
  server: {hmr: false},
});
