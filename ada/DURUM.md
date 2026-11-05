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
