# Arazi verisi — kaynak ve atıf

KANAT'taki beş dünyanın (Kapadokya, Likya, Karadeniz, Erciyes, Pamukkale) yükseklik verisi **AWS Terrain Tiles**
(Mapzen/Tilezen "joerd" hattı, terrarium PNG karoları) kullanılarak çevrimdışı pişirilmiştir:
`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png` (2026-10-08'de doğrulandı, HTTP 200).
Çekirdek alan z=13, uzak halka z=11 karolarından üretilir (`tools/bake-terrain.ts`).

Aşağıdaki metin, Tilezen joerd atıf belgesinden **aynen** alınmıştır
(<https://raw.githubusercontent.com/tilezen/joerd/master/docs/attribution.md>, "Required attribution"):

```
* ArcticDEM terrain data DEM(s) were created from DigitalGlobe, Inc., imagery and
  funded under National Science Foundation awards 1043681, 1559691, and 1542736;
* Australia terrain data © Commonwealth of Australia (Geoscience Australia) 2017;
* Austria terrain data © offene Daten Österreichs – Digitales Geländemodell (DGM)
  Österreich;
* Canada terrain data contains information licensed under the Open Government
  Licence – Canada;
* Europe terrain data produced using Copernicus data and information funded by the
  European Union - EU-DEM layers;
* Global ETOPO1 terrain data U.S. National Oceanic and Atmospheric Administration
* Mexico terrain data source: INEGI, Continental relief, 2016;
* New Zealand terrain data Copyright 2011 Crown copyright (c) Land Information New
  Zealand and the New Zealand Government (All rights reserved);
* Norway terrain data © Kartverket;
* United Kingdom terrain data © Environment Agency copyright and/or database right
  2015. All rights reserved;
* United States 3DEP (formerly NED) and global GMTED2010 and SRTM terrain data
  courtesy of the U.S. Geological Survey.
```

Aynı belgede veri setleri için istenen kısa atıflar (Türkiye bölgesinde fiilen kullanılan kaynaklar SRTM,
EU-DEM, GMTED2010 ve ETOPO1'dir):

- `SRTM data courtesy of the U.S. Geological Survey`
- `GMTED2010 data courtesy of the U.S. Geological Survey`
- ETOPO1: `DOC/NOAA/NESDIS/NCEI > National Centers for Environmental Information, NESDIS, NOAA, U.S. Department of Commerce`
- EU-DEM: `Produced using Copernicus data and information funded by the European Union - EU-DEM layers.`

**Değişiklik beyanı (GMTED2010 kullanım koşulu gereği):** Veri; yeniden örneklenmiş (bikübik), 3×3 binom
süzgeçten geçirilmiş, çekirdek alanda sabit tohumlu damla tabanlı hidrolik erozyonla (±10 m sınırlı) işlenmiş,
dünya başına sanatsal dikey ölçekle çarpılmış, Likya'da kıyıya yakın deniz tabanı kıyı mesafesinden yeniden
üretilmiş (kaynakta deniz ≈ 0 m) ve Pamukkale'de 1 m'lik prosedürel traverten terası yamasıyla zenginleştirilmiştir.
USGS/NOAA bu değişiklikleri onaylamamıştır.

## Ayarlar → Hakkında için kısa metin

> Arazi: AWS Terrain Tiles (Mapzen/Tilezen). SRTM ve GMTED2010 verileri U.S. Geological Survey'in izniyle;
> ETOPO1: NOAA; Avrupa arazi verisi Copernicus/EU-DEM (Avrupa Birliği finansmanı) ile üretilmiştir.
> Yükseklikler sanatsal amaçla dünya başına ×1,0–1,2 abartılmıştır.

## Dikey ölçek (verticalScale) notu

Oyundaki yükseklikler **gerçek veriden** gelir; ancak bazı dünyalarda kabartma, uçuş hissini güçlendirmek için
**sanatsal olarak abartılmıştır** (dikey ölçek). Bu bir "ölçüm" iddiası değildir; UI'da gösterilen irtifa değerleri
abartılmış dünyaya göredir. Değerler `public/worlds/<id>/world.json → geo.verticalScale` alanındadır:

| Dünya | verticalScale | Not |
|---|---|---|
| Kapadokya | 1,15 | düşük rölyef (~400 m), brifin önerisi |
| Likya | 1,10 | kıyı falezleri; deniz seviyesi y=0 korunur |
| Karadeniz | 1,00 | kabartma zaten 2 km'yi aşıyor |
| Erciyes | 1,00 | zirve gerçeğe sadık (~3.860 m veri, gerçek 3.917 m) |
| Pamukkale | 1,20 | ~160 m'lik traverten yamacı daha okunur olsun diye |
