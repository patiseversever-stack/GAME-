# ADA: Durum ve Sıradaki İşler

Son güncelleme: 5 Kasım 2026

Her oturumun başında bu dosyayı oku. Her oturumun sonunda güncelle: yapılanları işaretle, sıradakini yaz, sonra commit ve push et.

## Çalışma kuralları
- Kullanıcıyla Türkçe, kısa ve teknik olmayan bir dille konuş. Kullanıcı telefonda, bilgisayarı kapalı; her şey bulutta yapılır.
- Soruları seçmeli soru balonuyla sor (AskUserQuestion). Uzun form gibi yazılı soru listesi verme.
- Kredi harcayan hiçbir üretimi onaysız yapma. Önce maliyeti söyle, onay al.
- "Survivor" adı, logosu ya da birebir öğeleri kullanılmaz; ADA tamamen kendi markamız.
- Supabase kullanılmaz. Online sunucu büyük ihtimalle Cloudflare olacak, kesin karar sonra.
- Gerçek kişilere dair bilgi oyuna konmaz. Aslı karakteri tamamen kurgusal kalır: soyadı, görünüş, meslek ya da gerçek olay eklenmez.

## Dosyalar
- `TASARIM.md`: oyun tasarımı (kurallar, sezon, eleme, kaptanlık, kamp, parkurlar, kontroller, ses, ekonomi, MVP).
- `KARAKTERLER.md`: dünya (Suskunlar, Şafak/Yakamoz, Yankı Çemberi, gizli eşyalar, İz sistemi), sunucular ve kadro.

## Bağlantı durumu (5 Kasım 2026)
- Higgsfield: çalışıyor. Ücretsiz plan, 8 kredi; hiç harcanmadı.
- ElevenLabs: çalışıyor. Tam bağlayıcıyı kullan; ikinci, kısıtlı bağlayıcıda müzik yok.
- Terminal şu adreslere ulaşamıyor: higgsfield.ai, api.elevenlabs.io, api.meshy.ai, cdn.jsdelivr.net. Üretilen dosyaları indirmek gerekirse kullanıcı bu adresleri ortam ayarlarındaki Ağ erişimi bölümüne eklemeli.
- npm çalışıyor; Three.js npm'den kurulabilir.

## Yapıldı
- [x] Bağlantı kontrolü
- [x] Temel oyun tasarımı (`TASARIM.md`)
- [x] Parkurların oynanışı: hız parkuru, denge, bulmaca kulesi; takım yarışı bire bir düello
- [x] Kamp kuralları: diyalog, ilişkiler, ihanet, gizli oy, hayatta kalma mini oyunları
- [x] Hikaye ve adanın sırrı
- [x] Dünya, sunucular ve ilk sezon kadrosu, Aslı "Ayna" dahil (`KARAKTERLER.md`)

## Sırada
1. [ ] **İlk prototip (kredi harcamaz).**
   - Proje iskeleti: Three.js, WebGPU, desteklenmeyen cihazda WebGL2'ye geçiş.
   - Kural motoru: oyun durumu görüntüden ayrı; botlar ve ileride gerçek oyuncular aynı hamle dilini kullanır.
   - Hız parkuru, geçici basit görsellerle.
   - Telefonda linkle açılabilir bir yayın.
2. [ ] **Görsel yön testi (kredi harcar; önce maliyeti söyle, onay al).** Yarı gerçekçi tarz, tropik ada ve kalıntılar, birkaç karakter.
3. [ ] Denge ve bulmaca kulesi parkurları.
4. [ ] Kamp: serbest yürüme, diyalog, hayatta kalma mini oyunları.
5. [ ] Eleme gecesi: oylama, düello, Yankı Çemberi sahnesi.
6. [ ] Ses: Lal, Bora, Kule ve yarışmacı sesleri, ortam sesleri. Önce kredi planı çıkar.
7. [ ] Ağır çekim klip, tek dokunuşla paylaşma, rekor meydan okuma linki.
8. [ ] Kalite ayarları (düşük/orta/yüksek) ve telefon testleri.

## Araştırma notu: Higgsfield ile oyun yapımı (5 Kasım 2026)
- **Higgsfield Games** tek bir yazıdan tarayıcı oyunu kurabiliyor: kodu bir yapay zekâ yazıyor, görselleri Higgsfield üretiyor.
  - Oyun Higgsfield'ın kendi şablonunda ve higgsfield.app adresinde yaşıyor.
  - Bağımsız bir deneme yazısının başlığı: "şekil üretiyor, sahne değil". Kısa demolar için iyi; uzun, online ve mağazaya çıkacak bir oyun için ana yol olarak uygun değil.
- **3D Jutsu:** Higgsfield'ın bulutta çalışan Blender sahnesi. Ada ve kalıntılar için sahne kurmak, fragman görüntüsü almak ve model dışa aktarmak için kullanılabilir. Işık ve özel malzemeler dışa aktarımda tam taşınmayabilir.
- **Yazıdan ya da görselden 3D (Meshy 6/7, Tripo, Hunyuan3D):** karakterler ve objeler için.
- **Karar:** Oyunun beyni bizim kodumuz olacak (Three.js; online'a ve Capacitor'a hazır). Higgsfield sanat atölyemiz olacak: karakterler, objeler, animasyonlar, konsept görseller, fragman.
- **En kaliteli sonuç için:**
  1. Önce tek bir "stil formülü" yazılır, her görsel aynı formülle üretilir.
  2. Karakterlerde önce temiz bir konsept görsel çıkar: tek kişi, tam boy, düz arka plan, kollar gövdeden ayrık. Onaylanınca 3D'ye çevrilir (T-poz, iskelet ve hazır animasyonlar).
  3. Telefonda akıcılık için poligon bütçesi: oyuncu 15-30 bin, bot 5-15 bin, obje 1-5 bin, arka plan 300-1.500.
  4. PBR haritaları sadece gerekiyorsa açılır.
- Terminal Higgsfield'ın dosya sunucusuna ulaşamazsa, üretilen modelleri oyuna koymak için ağ izni gerekecek.
- **Higgsfield Games'in kodu dışarı çıkmıyor.** Kod sadece Higgsfield'ın kendi bulut çalışma alanında düzenleniyor, Git şifresi verilmiyor. Üretilen dosyalar (model, görsel, ses) ise indirilebiliyor.
- **Google AI Studio:** orada da kodu bir yapay zekâ (Gemini) yazıyor. Bağımsız bir incelemeye göre 3D model hattı yok.
- **Google Project Genie (Genie 3):** sadece video çıkarıyor. Bir dünya en fazla 60 saniye, 720p; ABD'de, aylık 250 dolarlık abonelikle açık. Oyun yapımı için uygun değil.
## Higgsfield fiyatları (5 Kasım 2026)
Kredi harcamadan maliyet sorgusuyla ölçüldü.

| Üretim | Kredi |
|---|---|
| Karakter 3D (görselden 3D, Meshy 7, dokulu, iskeletli, T-poz, 20 bin poligon) | 44 |
| Yazıdan 3D (Meshy 6, dokulu) | 25 |
| Yazıdan 3D (Tripo); ucuz obje için | 5 |
| Konsept görsel, Nano Banana Pro 2K | 2 |
| Konsept görsel, GPT Image 2.6 | 0,25 |
| Video, Seedance 2.5 | yaklaşık 15 |

### MVP sanat ihtiyacı (tahmin): yaklaşık 1.000-1.300 kredi
- 14 karakter (oyuncu, 11 bot, Lal, Bora): yaklaşık 600
- Konsept görseller: yaklaşık 100
- 30 kadar obje: 150-400
- Fragman: yaklaşık 90

### Paketler
| Paket | Kredi / ay | Aylık | Yıllık ödemede, aylık |
|---|---|---|---|
| Plus | 1.000 | 49 $ | 39 $ |
| Ultra | 3.000 | 129 $ | 99 $ |

- 3 günlük ücretsiz Plus denemesi: 100 kredi.
  - Sadece MCP üzerinden çalışıyor, kart gerekiyor.
  - İptal edilmezse ayda 49 $'a yenileniyor. Bu sohbette "cancel auto-renewal" yazarak iptal ediliyor.
- **Önemli:** "Sınırsız" ve "ücretsiz" üretimler sadece higgsfield.ai sitesinde geçerli. MCP'de yani Claude'da çalışmıyor, Claude sadece kredi harcayabilir.
- Sınırsızlar sadece görsel ve video modellerini kapsıyor, 3D modelleri kapsamıyor.
- 7 günlük sınırsızlar satın almadan sonraki 7 gün geçerli. 365 günlük sınırsızlar bir yıl geçerli; kampanya 6 Kasım'da bitiyor.

### Öneri
1. İskelet kredisiz yapılır, şimdilik paket gerekmiyor.
2. Görsel yön testi için 3 günlük ücretsiz deneme kullanılır.
3. Beğenilirse Plus aylık alınır.

## Açık sorular (acil değil)
- Küçük satın alınabilir avantajlar online modda nasıl dengelenecek?
- İz sistemi kesinleşsin mi?
- Karakter yaratma seçenekleri ve "neden buradasın" seçenekleri.
- Prototip linki nerede yayınlanacak?

## Kullanıcının "hibrit" cevaplarını nasıl yorumladık
Kullanıcı itiraz ederse değiştir.
- **Sunucu:** ikili sunucu. Lal (kadın) eleme gecesini, Bora (erkek) parkurları sunar. Kule perde arkasındaki yapımcı.
- **Yakınlaşma:** ağırlık dostluk ve rekabette; nadiren hafif ima var, açık sahne asla yok.
- **Sır:** kayıp uygarlık ile yapımcıların gizli planı birleşik.
- **Zaman:** istediğin kadar oynarsın, bazı büyük olaylar gerçek günlere bağlı açılır.
- **Ekran yönü:** adada yaşam yatay, yarış dikey. Klipler her zaman dikey çıkar.
