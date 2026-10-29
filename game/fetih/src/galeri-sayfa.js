// Soru galerisi sayfası (dist/SoruGalerisi.html): oyunu galeri kipinde açar.

import { galeri } from './galeri.js';

galeri().then(() => document.getElementById('uk-boot')?.remove());
