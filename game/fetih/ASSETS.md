# Fetih Ligi: Görsel Üretim Listesi

Bu liste yapay zekâyla üretilecek görsellerin tamamıdır. Her satırda dosya adı, boyut, nerede kullanıldığı ve
üretim istemi (prompt) var. İstemler İngilizcedir; görsel üreticiler İngilizceyle daha tutarlı sonuç verir.

Oyun bu görseller olmadan da çalışır: her birinin kodda çizilmiş bir yedeği var. Görsel eklendikçe yedeğin yerini alır.

## 1. Telif kuralları (pazarlık yok)

- **Logo yok:** marka, kulüp, takım, şirket, yayın, uygulama logosu ya da arması yok. Formada yalnızca düz renk ve şerit.
- **Gerçek kişi yok:** tarihî ya da güncel hiçbir gerçek kişinin yüzü, portresi, benzeri yok. Komutanlar ve sefer
  komutanları tamamen hayalî karakterlerdir. "Sultan" bir dönem kıyafetidir, belirli bir padişah değildir.
- **Telifli karakter yok:** çizgi film, film, oyun, anime, çizgi roman karakteri ya da onlara benzeyen tasarım yok.
  "Robot", "ninja", "astronot", "korsan", "dinozor pijama" genel arketiplerdir; bilinen bir karakteri andırmamalı.
- **Yazı yok:** görsellerin içinde harf, sayı, imza ya da filigran olmamalı. Bütün yazılar oyunda Türkçe olarak
  koddan basılır. Yazı çıkarsa görseli yeniden üret.
- **Yapılar:** Ayasofya, Galata, peri bacaları gibi tarihî yapılar serbesttir. Eyfel Kulesi yalnızca gündüz
  çizilir (gece ışıklandırmasının telifi var). Modern mimarlık eserleri (telifli binalar) yok.
- **Bayraklar:** ülke bayrakları üretilmez, kodda doğru oranlarla çizilir (yapay zekâ bayrak ayrıntısını bozar).
- **Din ve siyaset:** dinî sembol odakta olmaz; siyasi simge, parti rengi ya da güncel olay yok.
- **Kaynak:** yalnızca ticari kullanıma izin veren bir üretici kullan (kendi hesabının lisans şartlarını kontrol et).
  Başka bir sanatçının adını istemde kullanma ("in the style of <isim>" yok).

## 2. Ortak stil

Bütün oyun aynı dünyadan görünmeli: masadaki canlı minyatür maket, yumuşak stilize 3D, parlak Supercell renkleri.
Gece sahneleri ise Gündönümü'nün mor-lacivert, altın ışıklı büyülü havasında.

**Stil çapası.** Her istemin sonuna eklenir:

```
stylized 3D game art, soft clay-like materials, chunky readable shapes, bold saturated colors,
warm key light with soft rim light, gentle ambient occlusion, clean silhouette, high detail,
premium mobile game quality, cinematic lighting, no text, no letters, no watermark, no logo
```

**Negatif istem.** Destekleyen üreticilerde kullanılır:

```
text, letters, words, numbers, watermark, signature, logo, brand, emblem of real organization,
real person, celebrity, famous character, copyrighted character, photo-realistic human face,
blurry, low detail, extra fingers, deformed hands, cropped head, jpeg artifacts, flat lighting
```

**Gece çapası.** Gece görsellerinde stil çapasına ek olarak:

```
magical night, deep violet and navy sky, moonlit volumetric clouds, warm golden light leaking
through clouds, floating golden light dust like fireflies, warm glowing windows, soft bloom
```

**Ortak teknik kurallar:**

- Biçim PNG. "Şeffaf" yazan görseller düz tek renk zeminde (#00FF00) üretilir, sonra arka planı silinir
  (rembg ya da üreticinin kendi aracı). Kenarda yeşil hale kalmamalı.
- Boyut: tabloda yazan boyutta ya da daha büyük üret. Kare olmayan görselleri aynı oranda üret.
- Işık her zaman sol üstten gelir. Komutanlar ve simgeler aynı ışıkla aydınlanır.
- Renk paleti: kırmızı `#e8423f`, mavi `#2f78e0`, sarı-altın `#ffd25a` / `#f2b21a`, yeşil `#27a36a`,
  mor `#7b2fa8`, turuncu `#ff8a1f`. Gece: `#1a1640`, `#2c2250`, `#8c6aa6`, altın ışık `#ffcf6b`.
- Yerleşim: `game/fetih/assets/<klasör>/<dosya adı>`. Derleyici görselleri tek HTML dosyasının içine gömer;
  dosya boyutu sorun değil, kalite öncelikli.

## 3. Komutan portreleri (oyuncu kostümleri)

Klasör: `assets/komutan/`. Boyut 1024×1024, şeffaf. Göğüs hizasında portre, yüz hafif sağa (3/4), kameraya bakar,
güler ya da kendinden emin. Baş ve omuzlar kadrajda, başlık kesilmez. Ortak istem kalıbı:

```
character portrait bust of a cheerful fictional commander, 3/4 view facing slightly right, looking at camera,
<KOSTÜM>, expressive friendly face, big readable shapes, plain flat #00FF00 background, + stil çapası
```

Yüz yapısı ve ten rengi her portrede farklı olsun (oyunda 5 ten tonu var). Hiçbiri bilinen birine benzememeli.

| Dosya | Kostüm (kod kimliği) | `<KOSTÜM>` istemi |
|---|---|---|
| `acemi.png` | Acemi Komutan (`acemi`) | young recruit commander in a simple red short jacket over cream shirt, small brown fur kalpak hat, short sword on belt, eager smile |
| `futbolcu.png` | Kramponlu Komutan (`futbolcu`) | football player commander in plain red and yellow jersey with no logo or number, sweatband, holding a plain white ball under arm |
| `gokturk_okcu.png` | Bozkır Okçusu (`gokturk_okcu`) | Central Asian steppe archer, lamellar armor in steel blue, fur-trimmed pointed cap, recurve bow over shoulder, wind-swept blue cape |
| `gokturk_kagan.png` | Kök Kağan (`gokturk_kagan`) | grand steppe khan, ornate blue and gold lamellar armor, tall fur hat with horsehair standard plume, heavy blue cape, proud stance |
| `selcuklu_sipahi.png` | Selçuklu Sipahisi (`selcuklu_sipahi`) | medieval Anatolian cavalryman, teal kaftan with geometric star pattern trim, turban helmet with small plume, curved sword |
| `selcuklu_emir.png` | Selçuklu Emiri (`selcuklu_emir`) | medieval Anatolian emir, rich purple kaftan with gold geometric eight-pointed star embroidery, white turban with jeweled aigrette, cream inner robe |
| `osmanli_akinci.png` | Akıncı Beyi (`osmanli_akinci`) | Ottoman-era light cavalry leader, red short jacket with gold braid, fur-trimmed cap with feather, curved sword, confident grin |
| `osmanli_yeniceri.png` | Yeniçeri (`osmanli_yeniceri`) | Ottoman-era infantryman, blue kaftan, tall white felt hat folding down the back with a spoon holder ornament, holding a large brass ladle, friendly |
| `osmanli_kaptan.png` | Kaptan-ı Derya (`osmanli_kaptan`) | Ottoman-era grand admiral, deep navy kaftan with gold embroidery, large white turban, brass spyglass, sea breeze, golden rope details |
| `osmanli_sultan.png` | Fetih Sultanı (`osmanli_sultan`) | generic fictional Ottoman-era ruler costume, crimson and gold kaftan with tulip patterns, large white turban with jewel and plume, fur collar, regal but friendly cartoon face, not resembling any historical sultan |
| `kurtulus_gonullu.png` | Kalpaklı Gönüllü (`kurtulus_gonullu`) | 1920s Anatolian volunteer, olive wool coat, black fur kalpak, red scarf, holding a plain red pennant without symbols, determined smile |
| `kurtulus_subay.png` | Kurtuluş Subayı (`kurtulus_subay`) | 1920s officer in olive wool uniform with brass buttons, grey fur kalpak, binoculars around neck, field telephone handset, kind face, not resembling any real person |
| `zeybek.png` | Ege Zeybeği (`zeybek`) | Aegean folk hero costume, tall red fez wrapped with patterned scarf, short embroidered vest, wide sash with ornamental daggers, proud pose |
| `astronot.png` | Astronot Komutan (`astronot`) | astronaut commander, white spacesuit with orange panels, helmet visor up, no agency patches, small walkie-talkie, stars reflected in visor |
| `asci.png` | Şef Komutan (`asci`) | head chef commander, tall white chef hat, white double-breasted jacket, red neckerchief, holding a big wooden ladle like a scepter |
| `ogretmen.png` | Öğretmen Komutan (`ogretmen`) | teacher commander, navy blazer, round glasses, holding a big book, chalk dust, warm smile |
| `korsan.png` | Korsan Kaptan (`korsan`) | friendly cartoon pirate captain, black tricorn hat without skull symbol, red sash, golden earring, curved sword, treasure map in hand |
| `ninja.png` | Gölge Komutan (`ninja`) | stealthy shadow commander, dark charcoal outfit with purple accents, face mask leaving only eyes, pink glowing eyes accent, generic design not resembling any known character |
| `simitci.png` | Simitçi Usta (`simitci`) | street simit seller, red fez, apron, carrying a wooden tray of sesame bread rings on head, jolly face |
| `dino.png` | Dino Pijama (`dino`) | kid-friendly commander wearing a green dinosaur onesie with hood and soft spikes, cream belly, holding a ball, playful |
| `robot.png` | Çelik Komutan (`robot`) | cute steel robot commander, rounded silver body, glowing blue eyes, small antenna, gold accents, original design not resembling any known robot |
| `mezun.png` | Birinci Öğrenci (`mezun`) | top graduate commander, navy graduation cap and gown, holding a rolled diploma and book, proud grin |
| `kral_cay.png` | Çay Ocağı Ustası (`kral_cay`) | tea house master, red vest, white shirt with rolled sleeves, holding a tray with tulip-shaped tea glasses, steam, warm smile |

**Hızlı seçim portreleri.** Kodda bugün kullanılan 8 avatar (`src/ui/art.js` → `AVATARS`). Kostümlerin yerine aynı
dosyaları kullanabilir:

| Avatar kimliği | Kullanılacak dosya |
|---|---|
| `gokturk` | `gokturk_kagan.png` |
| `selcuklu` | `selcuklu_emir.png` |
| `yeniceri` | `osmanli_yeniceri.png` |
| `kalpak` | `kurtulus_gonullu.png` |
| `sultan` | `osmanli_sultan.png` |
| `astronot` | `astronot.png` |
| `asci` | `asci.png` |
| `futbol` | `futbolcu.png` |

**Tam boy komutan (düello sahnesi).** Klasör: `assets/komutan_tam/`. Boyut 1024×1536, şeffaf. Aynı kostümler
tam boy, ayakta, hafif kahramanca poz. Önce en çok kullanılan 8 avatarı üret.

```
full body fictional commander standing in heroic pose, <KOSTÜM>, feet visible, plain flat #00FF00 background, + stil çapası
```

**Duygu kareleri (isteğe bağlı).** Her avatar için `<id>_sevinc.png` ve `<id>_uzgun.png`. Aynı portre, biri
sevinçle yumruk kaldırmış, biri komik bir hayal kırıklığıyla. Doğru ya da yanlış cevapta düello kartında görünür.

## 4. Sefer: bölge komutanları ve bölge kartları

Klasör: `assets/sefer/`. Komutanlar hayalîdir; kostümleri yukarıdaki listeden türetilir ama yüzleri farklı,
daha yaşlı ya da daha görkemlidir. Rakip karakterlerdir ama sevimli kalırlar (12+).

**Komutan portresi:** 1024×1024, şeffaf, `boss_<bölge>.png`.

| Dosya | Ad (oyunda) | İstem |
|---|---|---|
| `boss_ege.png` | Ege Beyi Karaefe | grizzled but charismatic Aegean folk chieftain, tall red fez with patterned scarf, embroidered vest, thick moustache, arms crossed, olive branches behind |
| `boss_marmara.png` | Boğaz Paşası | stately fictional Ottoman-era admiral-pasha, navy and gold kaftan, large turban, spyglass, gulls and a straits breeze behind |
| `boss_akdeniz.png` | Akdeniz Sultanı Güneş | radiant fictional Mediterranean ruler, purple and gold medieval Anatolian kaftan, sun-shaped golden ornament on turban, warm sunset glow |
| `boss_icanadolu.png` | Bozkır Kağanı Börü | fierce but friendly steppe khan, blue lamellar armor, fur hat with horsehair plume, wolf-fur collar, steppe wind |
| `boss_karadeniz.png` | Fırtına Reisi Dumrul | Black Sea storm captain, olive wool coat, fur kalpak, rain-soaked cape, lightning and waves behind, determined grin |
| `boss_guneydogu.png` | Taş Kale Beyi Aslan | stone-fortress lord, medieval cavalry armor in sand and gold, lion-mane cape, sandstone fortress glow behind |
| `boss_dogu.png` | Dağların Hanı Kürşat | mountain khan, dark charcoal and purple armored outfit, snowy peaks behind, cold breath mist, original design |
| `boss_final.png` | Cihan Hakanı | ultimate fictional ruler of the map, crimson and gold royal kaftan, jeweled turban with tall plume, golden aura, epic scale, not resembling any historical person |

**Bölge kartı:** 1536×864, tam görsel, `bolge_<bölge>.png`. Sefer haritasında bölge düğmesinin arka planı.
Ortada büyük, sade bir alan bırak (üstüne yazı ve yıldız gelir). Kalıp:

```
wide establishing shot of a tiny handcrafted diorama of <MANZARA>, tabletop miniature, tilt-shift depth of field,
soft afternoon light, empty calm center area for UI, + stil çapası
```

| Dosya | `<MANZARA>` |
|---|---|
| `bolge_ege.png` | Aegean coast with olive groves, white windmills, ancient marble columns, turquoise sea |
| `bolge_marmara.png` | a strait with two continents, stone tower on a hill, small ferry boats, seagulls, domes in distance |
| `bolge_akdeniz.png` | Mediterranean coast with orange groves, pine-covered cliffs, an ancient theater, sandy beach |
| `bolge_icanadolu.png` | Anatolian steppe with fairy chimney rock formations, hot air balloons, golden wheat fields |
| `bolge_karadeniz.png` | lush green Black Sea mountains, tea terraces, misty plateau with wooden houses, a cliffside monastery silhouette |
| `bolge_guneydogu.png` | Mesopotamian plain with honey-colored stone town on a hill, ancient stone heads on a mountain top, river |
| `bolge_dogu.png` | snowy volcanic peak towering over a huge blue lake with a small island and an old stone church, high plateau |
| `bolge_final.png` | the whole map of Anatolia as a glowing golden diorama on a royal table, banners of many colors, magical night sky |

**Gece sürümü (isteğe bağlı):** her kartın `_gece` sürümü, bölge temizlenince görünür. Aynı istem + gece çapası.

## 5. Kategori simgeleri

Klasör: `assets/kategori/`. Boyut 512×512, şeffaf. Çarkta, soru kartında ve sonuç ekranında. Kalın, okunur,
tek nesne, hafif 3D, kategori renginde parlak taş gibi rozet. Kalıp:

```
single game icon of <NESNE>, chunky 3D glossy badge style, dominant color <RENK>, gold rim, centered,
plain flat #00FF00 background, + stil çapası
```

| Dosya | Kategori (kod) | `<NESNE>` | `<RENK>` |
|---|---|---|---|
| `tarih.png` | Tarih (`tarih`) | an ancient stone castle tower with a waving pennant | red-orange #e0583a |
| `cografya.png` | Coğrafya (`cografya`) | a small globe with a map pin | sky blue #2f9bd8 |
| `spor.png` | Spor (`spor`) | a plain football and a gold trophy cup, no logos | amber #f2a51a |
| `bilim.png` | Bilim (`bilim`) | a bubbling laboratory flask with an atom orbit | green #33b86b |
| `sanat.png` | Sanat ve Edebiyat (`sanat`) | a painter's palette with a quill and open book | purple #a55bd6 |
| `eglence.png` | Genel Kültür (`eglence`) | a shining star with a light bulb | pink #ec4f93 |
| `fetih.png` | Fetih! dilimi | a crossed sword and banner with a golden crown | gold #ffd23a |

**Alt etiketler (sonra):** aynı kalıpla `yemek.png` (steaming bowl and bread), `il.png` (small town on a map pin),
`mitoloji.png` (winged mythical horse silhouette, generic), `internet.png` (speech bubble with sparkle),
`doga.png` (leaf and mountain), `zeka.png` (glowing puzzle piece and brain).

## 6. Joker simgeleri

Klasör: `assets/joker/`. Boyut 512×512, şeffaf. Yuvarlak, kalın, parlak düğme simgesi; altında hafif gölge.
Kalıp: `single round game power-up icon of <NESNE>, glossy 3D, gold rim, plain flat #00FF00 background, + stil çapası`

| Dosya | Joker (kod) | `<NESNE>` |
|---|---|---|
| `yari.png` | Yarı Yarıya (`yari`) | a round shield split in half, one half glowing, two of four cards fading away |
| `sure.png` | Ekstra Süre (`sure`) | an hourglass with glowing golden sand and a plus sparkle |
| `kalkan.png` | Kalkan (`kalkan`) | a sturdy blue round shield with a gold rim and a glowing aura |
| `ikinci.png` | İkinci Şans (`ikinci`) | a circular arrow around a heart-shaped gem |
| `sabotaj.png` | Sabotaj (`sabotaj`) | a cartoon smoke bomb with a lit fuse and purple smoke |
| `kahin.png` | Seyirci / Kâhin (`kahin`) | a crystal ball with a small cheering crowd silhouette inside |

## 7. Ödül, para ve mağaza

Klasör: `assets/odul/`. Şeffaf, 512×512 (sandıklar 768×768).

| Dosya | Ne | İstem (`<NESNE>`, kalıp: `single game item icon of <NESNE>, glossy 3D, plain flat #00FF00 background, + stil çapası`) |
|---|---|---|
| `altin.png` | Altın (tek) | a single shiny gold coin with a simple tulip engraving, no text |
| `altin_kese.png` | Altın Kesesi (`altin_s`) | a small leather pouch overflowing with gold coins |
| `altin_sandik.png` | Altın Sandığı (`altin_m`) | an open wooden treasure chest bursting with gold coins and light rays |
| `joker_paketi.png` | Joker Paketi (`joker_paketi`) | a bundle of six glowing round power-up tokens tied with a ribbon |
| `reklamsiz.png` | Reklamsız Paket (`reklamsiz`) | a golden crown resting on a velvet cushion with a sparkle |
| `yildiz.png` | Sefer yıldızı | a single chunky golden star with soft glow |
| `xp.png` | Deneyim | a glowing blue crystal shard |
| `seviye.png` | Seviye rozeti | an empty heraldic shield badge with laurel wreath, center left blank for a number |
| `sandik_gunluk.png` | Günlük ödül sandığı | a small ornate wooden chest with red cloth and gold corners, closed |
| `sandik_gunluk_acik.png` | Açık hâli | the same chest open with golden light bursting out |
| `kupa.png` | Zafer kupası | a large gold trophy cup with tulip motifs, no text |
| `madalya_1.png`, `madalya_2.png`, `madalya_3.png` | Kürsü madalyaları | gold / silver / bronze medal with ribbon, no numbers |

**Nadirlik çerçeveleri:** `cerceve_yaygin.png`, `cerceve_nadir.png`, `cerceve_destansi.png`, `cerceve_efsanevi.png`.
1024×1024, şeffaf, ortası boş kare kart çerçevesi. Renkler sırayla buz mavisi `#8fb0d6`, mavi `#4aa3ff`,
mor `#b36bff`, altın `#ffb52e`. İstem: `ornate square card frame for a game item, <RENK> metal with gems, empty transparent center, plain flat #00FF00 background, + stil çapası`.
Efsanevi çerçeveye hafif ışık parçacıkları ekle.

## 8. Sancaklar (kumaş dokusu)

Klasör: `assets/sancak/`. Boyut 768×1024, tam görsel (zemin kumaşın kendisi). Haritada ve kürsüde bayrak direğindeki
sancağa doku olarak kaplanır. Desen düz ve önden çizilir (perspektif yok), kenarlar dikişli, hafif kumaş dokusu.
Kalıp: `flat front view of a fabric war banner texture, <DESEN>, embroidered stitched edges, subtle cloth weave, no text, no real emblem, + stil çapası`

| Dosya | Sancak (kod) | `<DESEN>` |
|---|---|---|
| `s_kirmizi.png` | Kızıl Sancak | solid crimson #e8423f with thin gold border |
| `s_mavi.png` | Mavi Sancak | blue #2f78e0 with two white horizontal stripes and gold trim |
| `s_altin.png` | Altın Şerit | golden yellow #f2b21a with brown stripes |
| `s_yesil.png` | Zümrüt Sancak | emerald #27a36a with a pale diagonal cross and gold trim |
| `s_ay.png` | Hilal Sancağı | deep red #b3262e with a white crescent moon shape only, no star, no national flag layout |
| `s_bozkurt.png` | Gök Bayrak | sky blue #2e6fd1 with a cream circular ring motif |
| `s_lale.png` | Lale Devri | pink #e0457b with repeating stylized tulip triangles |
| `s_yildiz.png` | Yıldızlı Gece | midnight navy #1a2a5c scattered with small gold stars |
| `s_ejder.png` | Ejder Sancağı | purple #7b2fa8 with a coiled original stylized dragon in gold thread |
| `s_efsane.png` | Efsane Sancağı | amber gold #ffb52e with a deep red crescent shape and radiant embroidered rays |

## 9. Görsel sorular (bulanık, yakınlaşan, siluet)

Klasör: `assets/soru/`. Boyut 1024×768 (4:3). Kod kimlikleri `src/quiz/assets.js` dosyasındadır; görsel eklenince
o kimliğin `url` alanı doldurulur. Siluet kipi için şeffaf PNG şart (nesne tek parça, ayrık parça az).
Bu görsellerde nesne tam ortada ve tam görünür olmalı; gizli ipucu ya da yazı olmamalı.

**Yapılar.** Kalıp: `stylized miniature 3D diorama of <YAPI>, centered, full object visible, clear daytime sky, + stil çapası`.
Siluet sürümü için aynısı `plain flat #00FF00 background` ile.

| Dosya | Kimlik | `<YAPI>` |
|---|---|---|
| `galata_kulesi.png` | `galata_kulesi` | a medieval round stone tower with a conical roof on a hill above a harbor |
| `kiz_kulesi.png` | `kiz_kulesi` | a small white tower on a tiny rocky islet in a strait |
| `ayasofya.png` | `ayasofya` | a grand historic domed basilica with four slender minarets, terracotta and pink walls |
| `eyfel_kulesi.png` | `eyfel_kulesi` | a tall wrought-iron lattice tower in daytime (no night lighting) |
| `piramit.png` | `piramit` | three ancient desert pyramids |
| `pisa_kulesi.png` | `pisa_kulesi` | a leaning white marble bell tower with arcades |
| `peri_bacasi.png` | `peri_bacasi` | fairy chimney rock formations with tiny cave windows and a hot air balloon |
| `bogaz_koprusu.png` | `bogaz_koprusu` | a generic suspension bridge across a strait, two tall towers |
| `saat_kulesi.png` | `saat_kulesi` | an ornate Ottoman-era stone clock tower in a town square (clock face without numbers) |

**Nesneler.** Kalıp: `single cute 3D game object of <NESNE>, centered, plain flat #00FF00 background, + stil çapası`.
Dosya adı kimlikle aynıdır: `ay.png` (crescent moon), `cicek.png` (flower), `kar_tanesi.png` (snowflake),
`top.png` (plain ball), `goz.png` (eye), `damla.png` (water drop), `yildiz.png` (star), `balik.png` (fish),
`kus.png` (small bird), `agac.png` (round tree), `kalp.png` (heart), `ev.png` (small house), `anahtar.png` (old key),
`saat.png` (alarm clock without numbers), `gunes.png` (sun), `bulut.png` (fluffy cloud), `kedi.png` (cat),
`elma.png` (red apple), `kitap.png` (closed book), `araba.png` (generic small car, no brand).

**Bayraklar** (`bayrak_*`) üretilmez; kodda çizilir (telif bölümüne bakın).

## 10. Ekranlar ve arka planlar

Klasör: `assets/ekran/`.

| Dosya | Boyut | Nerede | İstem |
|---|---|---|---|
| `acilis_dikey.png` | 1080×1920 | Açılış/yükleme ekranı | epic tabletop diorama of Anatolia as a miniature map, tiny castles on hills, colorful banners, clouds drifting over, warm golden hour light, empty upper third for the title, + stil çapası |
| `acilis_yatay.png` | 1920×1080 | Aynı, yatay | same scene, wide composition, empty center-left for the title |
| `menu_gece.png` | 1080×1920 | Ana menü arka planı | the same miniature Anatolia diorama at magical night, castles with warm windows, banners, + gece çapası, empty center for buttons |
| `duello_arena.png` | 1080×1920 | Düello sahnesi arka planı | two hilltop camps facing each other across a valley at dusk, opposing colored banners (red left, blue right), dramatic sky, empty center for the question card, + stil çapası |
| `zafer.png` | 1080×1920 | Zafer ekranı | a golden victory podium on a castle rampart, confetti and fireworks in a violet night sky, banners waving, + gece çapası |
| `yenilgi.png` | 1080×1920 | Yenilgi ekranı | a quiet camp at dawn after battle, fallen pennant, soft hopeful light, gentle and not sad for kids, + stil çapası |
| `sefer_harita.png` | 1536×2048 | Sefer haritası zemini | an old illuminated parchment map of Anatolia seen from above, decorative compass rose, sea monsters drawn as cute doodles, no text, warm paper texture |
| `parsomen.png` | 1024×1024 | Kart dokusu, döşenebilir | seamless tileable warm parchment paper texture, subtle fibers, no text |

## 11. Uygulama mağazası

Klasör: `assets/magaza/`. Oyunun adı Play Store'da metin olarak yazılır; görsellerde yazı yok.

| Dosya | Boyut | İstem |
|---|---|---|
| `ikon.png` | 1024×1024 | app icon: a chunky golden castle tower with a red banner on a small floating map island, bold rim light, vivid blue background, no text, + stil çapası |
| `ikon_on.png` | 1024×1024, şeffaf | ikonun ön katmanı (Android uyarlanabilir ikon): only the castle tower and banner, plain flat #00FF00 background |
| `kapak.png` | 1024×500 | feature graphic: two cheerful fictional commanders facing off across a miniature Anatolia map with a spinning category wheel between them, empty left third for text, + stil çapası |

## 12. Üretim sırası (öncelik)

1. Komutan portreleri: 8 avatar, sonra kalan kostümler.
2. Kategori ve joker simgeleri.
3. Açılış, menü ve düello arka planları.
4. Sefer: komutanlar ve bölge kartları.
5. Ödül, çerçeve ve sancaklar.
6. Görsel soru varlıkları.
7. Mağaza görselleri.

**Kontrol listesi.** Her görselde şunlara bak:

- Yazı, logo ya da imza yok.
- Bilinen biri ya da bir karakter gibi görünmüyor.
- Işık sol üstten geliyor.
- Şeffaf kenar temiz.
- Telefonda 64 px'e küçültünce de okunuyor (simgeler için).

Uygun görselleri `game/fetih/assets/` altına koy. Bağlama işini ben yaparım: kodda yedek çizimin yerine görsel
geçer ve görsel yüklenemezse yedek kullanılır.
