# KANAT — Uygulanmış Sanat Kitabı (Art Bible)

> Brifin §3'ü (görsel tez, dünya kartları, malzemeler, post, önce-düşük, yasaklar) **koda dönüşmüş** hâli.
> Tek gerçek kaynak: `src/render/looks.ts` (dünya görünüşleri) + `src/render/shaders/atmosphere.ts` (gök, sis, grade).
> Işık yönü ve sis geometrisi `public/worlds/<id>/world.json`'dan gelir (pişmiş gölgelerle aynı güneş).
> Kanıt kareleri: `docs/shots/render-world/` (her dünya için Düşük | Ultra yan yana, portre + yatay).

## 1. Tez: "Belgesel gerçekçiliği + resimsel ışık" (§3.1)

- **Gerçek arazi, gerçek ölçek.** Derinliği hava perspektifi taşır: yükseklikle azalan üstel sis + güneş tarafında Henyey-Greenstein (g = 0,76) halesi. Sis rengi = o yöndeki gök rengi; ufukta arazi gökle **matematiksel olarak** birleşir (aynı `kanatSky()` fonksiyonu).
- **Her dünya kendi imza saatinde.** Hiçbir dünyada öğle güneşi yok; en yüksek güneş Likya'da 32°.
- **Tek güneş:** gök, pişmiş arazi gölgesi (macro renk + GPU gölge pişirmesi), prop ışığı (DirectionalLight), bulut ışığı ve su parıltısı aynı vektörü kullanır.
- **Güzellik ışıktan gelir, efektten değil.** Düşük kademe aynı paleti, aynı ışık yönünü, aynı sis ve aynı grade'i taşır; fark yalnız ayrıntı ve yumuşaklıktadır (§3.6).

## 2. Ton ve renk zinciri (tüm kademelerde aynı matematik)

```
sahne (doğrusal HDR) → KANAT yükseklik sisi → AgX (three r186 eğrisi) + KANAT look (güç 1,15, doygunluk 1,22)
→ dünya grade'i (lift/gamma/gain, kontrast, doygunluk, gölge/ışık ayrık tonlama) → vinyet → gren + dither → sRGB
```
- Düşük: zincir **malzeme shader'ında** (`tonemapping_fragment`), composer yok.
- Orta+: aynı zincir tek `EffectPass` içinde (`KanatGradeEffect`), önce FXAA/SMAA + Bloom.
- Bloom eşiği HDR 1,0 → yalnız güneş diski, su parıltısı, brülör alevi. Patlamış beyaz gök yok (AgX omzu).
- Gök gradyanı ve tüm çıktı üçgen dağılımlı dither alır: **bant yok**.

## 3. Dünya kartları (uygulanan değerler)

Renkler sRGB hex; gök radyansı = palet × `sky.exposure` (doğrusal), gök sıcaklığıyla %12 tonlanır.

### 3.1 Kapadokya Şafağı — ilk izlenim dünyası
| Parametre | Değer |
|---|---|
| Güneş | 7° yükseklik, az 95° (doğu), 3.400 K, yoğunluk 4,6, disk ×2,2 (resimsel büyük) |
| Gök | zenit #3E5F8A · orta #9DA9BC · ufuk (güneşe karşı, "Venüs kuşağı") #D9B9B4 · ufuk (güneş tarafı) #F6C48E |
| Sis | 7e-5 /m taban yoğunluğu, ölçek yüksekliği 900 m, hale 0,10 |
| **Altın vadi sisi** | taban +55 m kalınlık, 0,008 /m, renk #F4D9A6, %70 yamalı (rüzgârla kayan tüller) |
| Arazi | makro ×1,75, kontrast gamma 1,4; **tüf bantları** (dünya-y, 3,6 m periyot, gül tüf #D49A8A tonu); **erozyon olukları** (dik tüf yamaçlarında eğim yönünde) |
| Grade | sıcak altın ışıklar (#F4D9A6, 0,18), **mor gölgeler** (#6B4E5E, 0,28), kontrast 1,06, vinyet 0,24, gren 0,03 |
| Bulut | seyrek pembe-altın kümülüs (#F6D6C0), örtü 0,25 |

Hedef duygu: düşük güneşle tüf yüzleri sıcak altın, gölgeler mor; vadilerde altın sis tülleri; balonlar güneşe karşı ters ışıkta parlar.

### 3.2 Likya Kıyısı
| Parametre | Değer |
|---|---|
| Güneş | 32°, az 247,5° (BGB), 5.200 K |
| Gök | #5FA8DE → #8EC9F0 → #DCEEF8; güneş tarafı ufuk #EEF2EE |
| Sis | 1,1e-4 /m (ince mavi pus, deniz üstünde nem), tint #EAF4FA |
| Su | sığ #2BB3B1 → derin #0B4F6C (world.json renkleri öncelikli), derinlik düşüşü 3 m, sığda kum tabanı görünür, kıyı köpüğü, güneş parıltısı, Yüksek+ kostik |
| Grade | temiz turkuaz; gölge #2E6F7A (0,2), ışık #FFE9C8 (0,12) |

### 3.3 Karadeniz Yaylası
| Parametre | Değer |
|---|---|
| Güneş | 22°, az 135° (GD, dağınık), 6.200 K, yoğunluk 3,2 (bulut arası yumuşak) |
| Gök | #6F8EA6 → #A9B9C2 → #DDE3E0 |
| Sis | 3,2e-4 /m (kalın katmanlı) + vadi sisi #DDE3E0 |
| **Bulut denizi** | world.json bandı (1.644–1.749 m), opak kabarık üst/alt yüzey, dağlar delip çıkar; içinde beyaz körlük rampası |
| Grade | serin yeşil-gri, yumuşak kontrast 0,94, doygunluk 0,92 |

### 3.4 Erciyes Karı
| Parametre | Değer |
|---|---|
| Güneş | 11°, az 225° (GB), 4.600 K |
| Gök | #1F4E8C → #6E9CCC → #CFE3F5 (çok berrak) |
| Sis | 4,5e-5 /m (uzakta mavi), tint #D8E8F8 |
| Grade | mavi-beyaz; **doygun mavi gölgeler** (#3A64A8, 0,3); pozlama 0,85 (kar patlamaz) |

### 3.5 Pamukkale Gün Batımı
| Parametre | Değer |
|---|---|
| Güneş | 4°, az 270° (batı), 2.800 K, disk ×1,8 |
| Gök | zenit #2B2D5B · orta #8E5A7A · güneşe karşı ufuk #C9A6B4 · güneş tarafı #FFC27A, aureole 0,16 |
| Sis | 1,6e-4 /m sıcak turuncu pus, güneş tarafında yoğun saçılma (hale 0,18) |
| Arazi | 1 m traverten yaması (ayrı CDLOD), havuzlar = sakin ayna su |
| Grade | kızıl-turuncu ışık (#FFB27A, 0,2), **lavanta gölge** (#9AA7C7, 0,3) |

## 4. Malzemeler (§3.3)

- **Arazi tabanı:** terrain ajanının önceden aydınlatılmış makro renk haritası (4 m/texel). Uzakta tek örnek; yakında katman ayrıntısı albedoyu **çarpar** (ortalama 1,0) ve yakın ayrıntının ışık değişimi oran olarak eklenir → 600 m geçişinde renk bandı yok.
- **Ayrıntı katmanları** (GPU'da prosedürel, dikişsiz, 512²): tüf (gözenek, ince katman, yağmur izleri), kaya (çatlak, liken), kuru ot (lif, tutam), toprak (çakıl), kar (rüzgâr dalgası, parıltı), traverten (mikro sırt, ıslak oyuk), orman zemini (iğne yaprak), kum (dalgacık). Texel ≈ 0,6–1,6 cm.
- **Tekrar görünmez:** baskın katman iki uyumsuz ölçekte (büyüğü +3 mip bias'la yalnız ton) + makro varyasyon.
- **Yakın kabartı:** D(x,z) 2 oktav geometri + 3,5 m normal oktavı (analitik) + katman yüksekliğinden türev bump + erozyon olukları.
- **Su:** Fresnel F0 0,02; Likya'da pürüzlülük 0,08; havuzlarda 0.
- **Prop'lar** (render-props): MeshStandard + bizim PMREM ortamımız (Orta+) / SH ışık sondası (Düşük) + aynı DirectionalLight. Aynı sis ve grade otomatik.

## 5. Kademe farkları (yalnız ayrıntı ve yumuşaklık)

| | Düşük | Orta | Yüksek | Ultra |
|---|---|---|---|---|
| Ton/grade | malzemede AgX + grade + vinyet + gren | EffectPass | EffectPass | EffectPass |
| Bloom | yok (gökte resimsel güneş halesi var) | yarım çöz., 4 mip | tam | tam |
| AA | yok | FXAA | SMAA | SMAA |
| God rays | — | — | güneş ekrandayken | güneş ekrandayken |
| Arazi ızgarası / LOD0 | 17² / 100 m | 33² / 180 m | 33² / 300 m | 33² / 450 m |
| Projeksiyon | düzlem + dikey geçiş | biplanar | triplanar | triplanar |
| Görüş (sis sonu) | 12 km | 15,5 km | 15,5 km | 15,5 km |
| Ortam ışığı | SH sonda | PMREM | PMREM | PMREM |
| Su | derinlik rengi + 1 normal + köpüksüz | + köpük | + 2. normal + kostik | + kostik |
| Bulut impostor | 40 × örtü | 80 × örtü | 150 × örtü | 250 × örtü |

## 6. Yap / Yapma

**Yap**
- Güneş yönünü yalnız `world.json` ile değiştir (makro gölgeler onunla pişirildi).
- Renk kararlarını `looks.ts`'te ver, ekran görüntüsüne bakarak (Düşük ve Ultra yan yana).
- Yeni materyallere `fog: true` ver; özel ShaderMaterial'larda `...atmosphereUniforms` yay ve `<fog_*>` + `<tonemapping_fragment>` + `<colorspace_fragment>` chunk'larını ekle.
- Yeni gök/sis renklerinde AgX'in doygunluk kaybını hesaba kat (look + grade zaten telafi eder).

**Yapma** (§3.7)
- Varsayılan three görünümü, ışıksız gri; ham `scene.background` rengi; ikinci bir güneş.
- `discard` (Adreno early-Z) — su/havuz kenarları derinlik testiyle gizlenir.
- Bantlı gradyan, neon doygunluk, ezilmiş siyah (AgX tabanı + lift), patlamış gök.
- Arazi kenarı/boşluk: görüş mesafesi ≤ uzak halka / 1,3.
- Mor/pembe gökyüzünü ekranın tamamına yaymak (Pamukkale orta durağı ≤ 0,2).
- Lens flare bolluğu, hareket bulanıklığı (hız çizgileri kullanılır), Kenney tipi stilize setler.

## 7. Bilinen sınırlar (dürüst değerlendirme)
- Kapadokya'nın 8 m DEM'i yumuşak; "peri bacası" okunurluğu büyük ölçüde render-props'un bacalarından gelir. Oluklar ve tüf bantları aradaki ölçeği taşır.
- Prop bacaları şu an griye yakın; tüf paleti (#D9B48F / #D49A8A) ve makro renk örneklemesi önerilir (render-props'a not).
- Ultra'da düzlemsel su yansıması ve soft-particle bulutlar yok.
