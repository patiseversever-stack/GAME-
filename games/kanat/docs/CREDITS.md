# KANAT — Emeği geçenler ve lisanslar

Bu dosya oyunda kullanılan **her dış kaynağın** listesidir. Teslim edilen her dosyanın tek tek kaydı (kaynak, lisans,
değişiklik, üreten betik, sha256) `assets/manifest.json` dosyasındadır; `tests/unit/manifest.test.ts` kaydı olmayan
veya yasak lisanslı (CC-BY-NC, CC-BY-SA, "editorial", belirsiz) dosyayı reddeder. Manifest `node tools/gen-manifest.ts`
ile üretilir (`npm run build` öncesinde de koşar).

## 1. Arazi verisi — AWS Terrain Tiles (atıf zorunlu)

Beş dünyanın yükseklik verisi AWS Terrain Tiles (Mapzen/Tilezen "joerd", terrarium karoları) üzerinden çevrimdışı
pişirilmiştir (`tools/bake-terrain.ts`). Tam atıf metni ve değişiklik beyanı: [`docs/credits/terrain.md`](credits/terrain.md).
Türkiye bölgesinde fiilen kullanılan kaynakların istenen kısa atıfları:

- SRTM data courtesy of the U.S. Geological Survey
- GMTED2010 data courtesy of the U.S. Geological Survey
- ETOPO1: DOC/NOAA/NESDIS/NCEI > National Centers for Environmental Information, NESDIS, NOAA, U.S. Department of Commerce
- Produced using Copernicus data and information funded by the European Union - EU-DEM layers.

Yükseklikler dünya başına ×1,0–1,2 **sanatsal olarak** abartılmıştır (`world.json → geo.verticalScale`). Aynı metin oyunda
Ayarlar → Hakkında ekranında gösterilir.

## 2. Yazı tipleri — Google Fonts (SIL Open Font License 1.1)

| Aile | Kullanım | Telif |
|---|---|---|
| Barlow Condensed 600/700, 600 italik | Başlıklar, HUD rakamları | © 2017 The Barlow Project Authors |
| Inter (değişken 400–600) | Gövde metni, arayüz | © 2020 The Inter Project Authors |
| Playfair Display italik | Kartpostal ve Foto Modu çerçevesi | © 2017 The Playfair Display Project Authors (Reserved Font Name "Playfair Display") |

Dosyalar Google Fonts CSS2 API'sinin sunduğu `latin` + `latin-ext` alt kümeleridir (Türkçe glifler latin-ext'te);
kaynak URL'leri `public/fonts/fonts.json` içinde, lisans metni `public/fonts/OFL.txt` olarak birlikte dağıtılır.

## 3. Ses ve müzik

Tüm ses efektleri, ortam sesleri ve müzik **kodla, çalışma anında sentezlenir** (Web Audio). Kayıt, örnek veya üçüncü
taraf ses dosyası yoktur. Ayrıntı: [`docs/credits/audio.md`](credits/audio.md). Makam esintili melodiler özgündür;
mevcut bir eser kopyalanmamıştır.

## 4. Görsel varlıklar

Balonlar, peri bacaları, ağaçlar, guletler, yayla evleri, antik kalıntılar, pilot, wingsuit, paraşüt, kuşlar, bulutlar,
gökyüzü ve tüm efektler **motor içinde prosedürel** üretilir (three.js geometri + shader). Dış 3D model, doku veya HDRI
kullanılmamıştır. Arayüz ikonları ve dünya kartı çizimleri elle yazılmış SVG'dir.

## 5. Çalışma zamanı kütüphaneleri

| Paket | Sürüm | Lisans |
|---|---|---|
| three | 0.186.1 | MIT |
| postprocessing (pmndrs) | 6.39.5 | Zlib |
| fflate | 0.8.3 | MIT |

Geliştirme araçları (vite, typescript, vitest, playwright-core, sharp, ktx2-encoder, bun, pixelmatch, pngjs,
vite-plugin-singlefile) oyuna gömülmez.

## 6. Gerçek dünya notu

Wingsuit gerçek hayatta yıllar süren eğitim ister. Oyundaki balon, gulet ve yayla evlerinde logo, marka veya gerçek
isim yoktur; antik kalıntılar jenerik yorumlardır.
