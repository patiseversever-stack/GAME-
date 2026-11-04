# Göz Kararı · görsel komut listesi yazımı (ortak talimat)

Oyun: "Fetih Ligi", Türkçe bilgi yarışması. Yeni soru tipi **Göz Kararı**: ekranda bir görsel bulanıktan netleşir /
yakından uzaklaşır / siluetten renge geçer; oyuncu 4 şıktan doğruyu seçer (erken bilen çok puan, 20 sn). Görselleri
oyunun sahibi ChatGPT ile üretecek. Senin işin: sana verilen konularda, her madde için ChatGPT'ye verilecek İngilizce
komutu ve oyundaki soruyu yazmak. Kararların tamamı: /home/user/GAME-/game/fetih/KARARLAR.md (en alttaki "Göz Kararı" tabloları).

## Her madde TAM olarak bu biçimde (Markdown)

### GK-001 · Hayvanlar · Gerçekçi fotoğraf · Zorluk 1 · Gösterim: bulanık
```
<İngilizce komut, tek paragraf>
```
- **Soru:** <Türkçe, ipuçlu tek cümle, en çok 110 karakter, soru işaretiyle biter, cevabı ele vermez>
- **Şıklar:** ✅ <doğru> · <yanlış 1> · <yanlış 2> · <yanlış 3>   (her şık en çok 28 karakter)
- **Bilgi:** <cevaptan sonra görünen tek cümle ilginç ve KESİN bilgi, en çok 140 karakter>

(Maddeler arasına boş satır. Başlıktaki alanlar: numara · konu adı · üslup · Zorluk 1/2/3 · Gösterim: bulanık | yakın çekim | siluet | ayrıntı)

## İçerik kuralları
- Yalnız KESİN, kalıcı bilgi. Emin değilsen o maddeyi başka bir maddeyle değiştir. Tartışmalı ya da çabuk eskiyen bilgi yok.
- Zorluk dengeli: konu başına aşağı yukarı ⅓ zorluk 1, ⅓ zorluk 2, ⅓ zorluk 3.
- Çeldiriciler zorluğa göre: zorluk 1'de aynı konudan ama görünüşü farklı şeyler; zorluk 3'te görsel bulanıkken
  karışabilecek, benzer görünen şeyler. Çeldiriciler aynı türden olsun (hayvan şıkları hep hayvan…), gülünç şık yok.
- Soru metni ipuçlu ve zekice ("1877'de sesi ilk kez kaydedip çalan bu icat hangisi?"); "Bu nedir?" gibi çıplak soru yok.
  Ama ipucu tek başına cevabı vermesin: görsel + ipucu birlikte düşündürsün.
- Gösterim seçimi: şekli belirgin tek nesnede "siluet"; dokusu/ayrıntısı ele veren şeyde "yakın çekim"; genel
  görünüşle tanınan sahnede "bulanık"; tablolarda her zaman "ayrıntı" (önce tablodan bir parça, sonra bütün).
- Maddeler kendi içinde ve diğer konularla çakışmasın (aynı nesne iki kez yok).
- Türkçe yazım kusursuz (kesme işareti, büyük harf, "mi" ayrı).

## Komut (ChatGPT) kuralları
- İngilizce, tek paragraf. Konuyu somut ve doğru tarif et (ayırt edici özellikleri yaz: renk, biçim, parça sayısı),
  ki üretilen görsel gerçeğe sadık olsun.
- Her komutun sonunda: `4:3 landscape, no text, no letters, no numbers, no watermark, no logo`
- Gerçek kişi yüzü/benzeri yok (tarih sahnelerinde isimsiz figürler, uzaktan). Marka/logo/kulüp arması yok.
  Telifli karakter yok. Modern telifli bina yok.
- Tek konu, ortada, kenardan taşmasın; nesnelerde sade arka plan (siluet kipinde düz ve konuyla zıt arka plan).
- Üslup cümlesi AYNEN bunlardan biri olsun (komutun içine koy):
  - **Supercell 3D:** `stylized 3D game art, soft clay-like materials, chunky readable shapes, bold saturated colors, warm key light with soft rim light, premium mobile game quality`
  - **Gerçekçi fotoğraf:** `realistic professional photograph, natural light, sharp focus, high detail`
  - **Klasik yağlı boya:** `classical oil painting, rich chiaroscuro, dark background, visible canvas texture, old master style`
  - **Yıldızlı Gece fırçası:** `post-impressionist oil painting with swirling thick impasto brushstrokes in the style of Vincent van Gogh's The Starry Night`
  - **Osmanlı minyatürü:** `Ottoman miniature painting, flat perspective, gold leaf details, vivid mineral pigments, fine outlines`
  - **Eski gravür:** `19th century encyclopedia engraving, fine cross-hatched line work, sepia ink on aged paper`
  - **Japon ahşap baskısı:** `Japanese ukiyo-e woodblock print in the style of Hokusai, flat colors, bold outlines, textured paper`
- Üslup dağılımı konuya göre (sana verilen eşleme), konu içinde 2–4 sürpriz üslup.

## Çıktı
- Yalnız şu dosyayı yaz: /tmp/claude-0/-home-user/fe79b1eb-0adb-5b11-8d68-d1363e2a6c54/scratchpad/gk/<PARÇA>.md
  İçinde her konu için `## <Konu adı> (GK-xxx–GK-yyy)` başlığı ve altında maddeler. Başka dosyaya dokunma, kod yazma.
- Bitince bir Python ya da node betiğiyle kendi dosyanı denetle: madde sayısı, numaralar sıralı ve eksiksiz, soru ≤110,
  şık ≤28, bilgi ≤140, her komut "no text" ile bitiyor, her maddede 4 şık ve tam bir ✅, zorluk dağılımı.
- Son mesajında: madde sayısı, zorluk dağılımı, üslup dağılımı, emin olmadığın için değiştirdiğin maddeler (varsa). Kısa.
