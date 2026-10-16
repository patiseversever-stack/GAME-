import {defineConfig} from 'vite';
import {viteSingleFile} from 'vite-plugin-singlefile';
import {khVoice} from './vite.voice.mjs';

// "tek" modu: her şey tek bir HTML dosyasına gömülür (önizleme linki / WebView yerel dosya için) — sesler HARİÇ:
// manifest + sesler index.html'in yanındaki voice/ klasöründen okunur (khVoice: derlemede kopyalar, geliştirmede sunar).
// dist/ (Expo) dosya başına mp3; dist-tek/ (yayın önizlemesi) paketli: ~22 dosya (sunucu sürüm başına ≤ 511 dosya).
export default defineConfig(({mode}) => ({
  base: './',
  plugins: mode === 'tek' ? [viteSingleFile(), khVoice({packed: true})] : [khVoice()],
  build: {
    outDir: mode === 'tek' ? 'dist-tek' : 'dist',
    target: 'es2020',
    assetsInlineLimit: mode === 'tek' ? 100_000_000 : 4096,
    chunkSizeWarningLimit: 2000,
  },
  server: {host: true, port: 5173},
}));
