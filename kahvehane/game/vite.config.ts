import {defineConfig} from 'vite';
import {viteSingleFile} from 'vite-plugin-singlefile';
import {khVoice} from './vite.voice.mjs';

// "tek" modu: her şey tek bir HTML dosyasına gömülür (önizleme linki / WebView yerel dosya için) — sesler HARİÇ:
// manifest + mp3'ler index.html'in yanındaki voice/ klasöründen okunur (khVoice: derlemede kopyalar, geliştirmede sunar).
export default defineConfig(({mode}) => ({
  base: './',
  plugins: mode === 'tek' ? [viteSingleFile(), khVoice()] : [khVoice()],
  build: {
    outDir: mode === 'tek' ? 'dist-tek' : 'dist',
    target: 'es2020',
    assetsInlineLimit: mode === 'tek' ? 100_000_000 : 4096,
    chunkSizeWarningLimit: 2000,
  },
  server: {host: true, port: 5173},
}));
