# Final 7 — Canlıya hazırlık talimatı

> Bu dosyayı yapay zekâ kodlama aracına ver ve "Bu dosyadaki görevi yap" yaz. Dosya kendi başına eksiksizdir.

Bağlam: `docs/analiz/FINAL_DURUM.md`. Oyun kodu büyük ölçüde hazır. Bu turun amacı sırasıyla:
1. Yedek ve kayıt
2. Güvenlik
3. Seviyeleri birleştirme
4. Ücretsiz planda güvenli botlar
5. Küçük düzeltmeler
6. Test sunucusu ve otomatik deneme
7. Canlıya alma (yalnız sunucu) ve mağaza formları

**Telefon sürümü üretilmeyecek.** APK, AAB, EAS build ya da TestFlight yok. Sahip uygulama paketini (AAB) ileride kendisi alacak. Bu turda uygulama tarafında yalnız kod hazırlanır, derlenmiş oyun uygulamaya aktarılır ve testler çalıştırılır.

---

## 0. Kurallar

1. **Gizli bilgi.**
   - Anahtar ve şifre değerlerini sohbete, loglara, rapora ya da commit'e asla yazma. Değeri ekrana basan komut
     çalıştırma.
   - Sahipten anahtarı sohbete yapıştırmasını **asla isteme.** Yeni değerler için yerel bir gizli dosya kullan:
     `%USERPROFILE%\.patisever-gizli.env`.
     - Dosya git dışında olacak. Yoksa oluştur; içine yalnız değişken adlarını boş değerle yaz.
     - Sahip değerleri Not Defteri'yle bu dosyaya yapıştırır.
     - Sen değerleri göstermeden bu dosyadan okuyup gereken yere yüklersin (`wrangler secret`, EAS, Vercel).
   - Supabase `service_role` / secret anahtarını yeni kodda kullanma.
2. **Sahibin açık onayı olmadan yapma.** Onayı tek cümleyle iste ("Onay: staging'e kuruyorum, evet mi?"); "evet" gelince
   yap. Onay gereken işler:
   - `git push` (iki depo da)
   - deploy (Cloudflare staging / production, Vercel)
   - canlı veritabanına migration ya da SQL
   - eski anahtarları kapatma ya da silme
   - OTA güncellemesi (EAS build / submit bu turda **yapılmaz**)
   - `ONLINE_DEFAULT = true` olan derlemenin uygulamaya girmesi

   Mağaza formlarını sen hazırlarsın, sahip gönderir.
3. **Sahip uğraşmak istemiyor.** Mümkün olan her şeyi sen yap. Ona yalnız zorunlu panel tıklamalarını bırak.
   - Tarifler numaralı, çok kısa ve sade olsun: hangi siteye girecek, hangi düğmeye basacak.
   - Teknik terim kullanma.
   - Sahip bir panelde iş yaparken sen kod adımlarına devam et.
4. **Sıra.** Adımları sırayla yap. Her adımın sonunda testleri çalıştır ve commit at. Her adımın üst süresi yazılı;
   erken biterse erken bitir.
5. **Bozulmaması gerekenler:**
   - `docs/HANDOFF.md` §4 sözleşmeleri
   - Parça 1–6 kararları
   - F1–F8 ve D1–D10 (`FINAL_DURUM.md` §2)
6. **Rapor.** Her adım sonunda sahibe 3–5 satırlık sade bir özet ver. En sonda `docs/analiz/FINAL_7_RAPOR.md` dosyasını yaz.

---

## 1. Sahibin yeni kararları (kesin)

- **F9 — Anahtarlar yenilensin.** Sızan anahtarlar yenilenecek, en az uğraşla (Adım 2).
- **F10 — Çipli masalar kalsın; mağaza formları doğru doldurulsun.**
  - Sanal çiple masaya girmek, gerçek para olmasa da mağazaların tanımında "simüle kumar"dır. Formlarda böyle
    beyan edilir: "Simüle kumar: evet. Gerçek para yok, çip satılmaz."
  - Hedef kitle 13+. Çocuk yaş grupları seçilmez.
  - Formu doldurunca mağazanın verdiği yaş derecesini sahibe göster.
  - Sahip bu dereceyi uygun bulmazsa çipli masalar panelden kapatılır (Adım 4'teki "çipsiz mod") ve form "hayır"
    olarak güncellenir.
  - Çipli masalar sonradan yeniden açılacaksa, açılmadan **önce** form yeniden güncellenmelidir.
- **F11 — Seviyeler birleşsin.** Oyuncunun tek bir seviyesi, unvanı ve koleksiyonu olur (Adım 3).

---

## 2. Adımlar

### Adım 1 — Yedek ve kayıt (≤ 20 dk)

1. **Yedek.**
   - `patisever-okey-tam` ve `sanane-main` klasörlerinin zip'ini al. `node_modules` ve büyük önbellekler hariç.
   - Zip'leri `%USERPROFILE%\Desktop\YEDEK-<tarih>\` altına koy.
   - Sahibe söyle: "Bu klasörü USB'ye ya da harici diske kopyala. İçinde anahtarlar olduğu için internet depolamasına
     yükleme."
2. **`sanane-main`.**
   - Yeni dal aç: `okey-yayin`.
   - Yalnız Okey ile ilgili dosyaları `git add <yol>` ile seçip iki commit'e ayır (`FINAL_DURUM.md` §8 listesi):
     - **Commit A — uygulama + Okey:**
       - `app/minigame-okey.tsx`
       - `src/features/minigames/*`
       - `assets/minigames/okey/*`
       - `scripts/*okey*`
       - manifest, entitlements, `eas.json`, `.easignore`, `.gitignore`
       - `TermsModal`, `DeleteAccountModal`, `src/lib/supabase.ts`
       - `docs/release-checks/*`
     - **Commit B — patisever-web:** güvenlik düzeltmesi + Supabase migration dosyası.
   - `docs/games/okey-review/**` görüntüleri commit'e girmesin (`.gitignore`).
   - Okey dışı değişikliklere **dokunma**: stash yok, silme yok, commit yok.
   - **Commit öncesi gizli bilgi taraması.** Commit'e girecek dosyalarda anahtar deseni ara (`eyJ…`, `sb_secret_`, `sk.`,
     `-----BEGIN PRIVATE KEY`, keystore şifresi). Varsa dosyayı çıkar ve sahibe değeri yazmadan söyle.
3. **Depo görünürlüğü.** İki deponun GitHub'da herkese açık mı özel mi olduğunu kontrol et ve sahibe söyle.
   **Herkese açıksa Adım 2-C hemen, bugün yapılmalı;** bunu sahibe açıkça yaz.
4. **Push.** Onay iste, sonra push et.

### Adım 2 — Güvenlik (sahip ~20–30 dk tıklama; sen ≤ 45 dk)

**A. Yayındaki web yönetim paneli açığı** (ADMIN-01/03/04/07/35)
1. patisever-web testleri: `test-require-admin` 15/15, `tsc`, `next build`.
2. Onaylı yayın: Vercel (git push ile otomatik ya da `vercel --prod`).
3. Onaylı migration: `20261008120000_…sql` canlı Supabase'e. Supabase CLI ile ya da sahibe "SQL Editor › yapıştır › Run"
   tarifiyle.
4. Sahip Supabase'te iki adımlı doğrulamayı (TOTP) açar ve kendini kaydeder (3 adımlık tarif ver). Sonra
   `ADMIN_REQUIRE_AAL2=1`.
5. Doğrula: Canlıda yönetici olmayan bir hesap yıkıcı işlem yapamamalı (403).

**B. Bildirim kayıtları tablosu** (SOSYAL-36)
- Erişim kuralı `USING (true)` yerine kişi yalnız kendi kaydını okuyup yazabilsin (`auth.uid() = user_id`).
- Migration dosyası yaz, mümkünse yerelde test et, onayla uygula.
- Uygulamanın bildirim kaydı akışı bozulmamalı.

**C. Anahtar yenileme** (GUVENLIK-01/02, HATA-05, `FINAL_DURUM.md` §2 B5)

| Sıra | Anahtar | Ele geçerse | Sahibin tıklaması | Senin işin |
| --- | --- | --- | --- | --- |
| 1 | Supabase tam yetkili anahtar (service_role / secret) | Tüm kullanıcı verisine tam erişim | Aşağıdaki C1 | Kullanıldığı her yeri yenisine geçir |
| 2 | Supabase kişisel erişim anahtarı (PAT) | Supabase hesabını yönetme | supabase.com › hesap › Access Tokens › eskisini **Revoke**, yenisini oluştur | Yerel ortam değişkenini güncelle |
| 3 | Firebase servis hesabı anahtarı | Bütün kullanıcılara bildirim gönderme | Google Cloud › IAM › Service Accounts › hesap › Keys › Add key (JSON) › indir. Yenisi çalışınca eskisini **Delete** | Yeni JSON'u Vercel / EAS gizli değişkenine yükle, yeniden yayınla, sonra eskisini sildir |
| 4 | Cloudflare API anahtarı | Cloudflare hesabında değişiklik | Cloudflare › My Profile › API Tokens › ilgili satır › **Roll** | Yerel ortam değişkeni ve `CF_API_TOKEN` Worker secret'ını güncelle |
| 5 | Mapbox gizli anahtarı (`sk.`) | Mapbox kullanım faturası | account.mapbox.com › Tokens › aynı izinlerle yenisini oluştur, eskisini sil | EAS gizli değişkenini güncelle |
| 6 | Android imza (keystore) şifreleri | Tek başına düşük risk; Play'e yükleme yetkisi ayrıca gerekir | **Sonraya:** Play Console › Uygulama bütünlüğü › yükleme anahtarını sıfırlama isteği | EAS kimlik bilgileri |

Kurallar:
- **Her anahtarda aynı sıra:**
  1. Yenisini oluştur.
  2. Kullanıldığı her yerde yenisine geç.
  3. Çalıştığını doğrula.
  4. Eskisini kapat (onaylı).
- **C1 — Supabase.** Anahtarın türünü, değerini göstermeden önekinden belirle: `sb_secret_` yeni tür, `eyJ` eski
  (JWT) tür.
  - **Yeni türse:** Proje › Settings › API Keys › yeni secret key. Kullanım yerlerini geçir, eskisini sil.
  - **Eski türse:** Eski service_role, uygulamanın içindeki herkese açık (anon) anahtarla aynı sistemde; tek başına
    kapatılamaz. Güvenli sıra:
    1. Projede yeni API anahtarlarını (publishable + secret) ve gerekiyorsa JWT imza anahtarlarını etkinleştir.
    2. Sunucu tarafındaki kullanımları yeni secret'a geçir.
    3. Uygulama ve web yeni publishable anahtarla çalışsın. Uygulama kodunu buna hazırla, böylece sahibin ileride alacağı
       AAB yeni anahtarla çıkar. Web (Vercel) yeni anahtara hemen geçebilir.
    4. Eski anahtarlar ancak yeni uygulama sürümü yayıldıktan sonra, sahibin onayıyla kapatılır. Bu turda kapatılmaz;
       raporun "Kalan işler" bölümüne tarihsiz bir adım olarak yaz ("Yeni sürüm yayıldıktan sonra eski Supabase anahtarlarını
       kapat").

    Eski anahtarları kapatmak eski uygulama sürümlerinin girişini etkiler; zorunlu güncelleme gerekiyorsa sahibe
    söyle. Adımları Supabase'in güncel belgesinden doğrula.
- **Git geçmişini temizlemek gerekmez.** Eski anahtar kapatılınca geçmişteki değer işe yaramaz.
- Bitince eski anahtarları kullanmaya devam eden bir yer kalmadığını tara.

### Adım 3 — Seviyeleri birleştirme (F11) (≤ 60 dk)

**Hedef:** Oyuncunun tek bir seviyesi, unvanı ve koleksiyonu olsun. Aynı seviye her yerde görünsün:
- çevrim dışı oyun ve Ödüller
- çevrim içi salon ve masa plakaları
- başkalarının gördüğü oyuncu kartı

**1. Kaynak.** Hesap açıkken doğruluk kaynağı sunucudaki profildir (D1). Telefondaki profil (`patisever.profile.v1`)
önbellek olur (`snapshot()` / `adopt()`).

**2. İlk girişte birleştirme** (hesap başına bir kez):
- **XP:** sunucu XP = max(sunucu XP, min(telefon XP, ilk birleştirme tavanı)). Tavan, seviye 12'ye karşılık gelen XP'dir
  ve config'de durur. Oyun yeni yayınlandığı için meşru bir oyuncu bunun üstünde olamaz.
- **Koleksiyon:** Çerçeve, efekt, taş takımı, unvan ve reklam ilerlemesi birleşir (union). Kuşanılan öğeler
  telefondaki gibi kalır.
- **İstatistikler:** Toplanmaz. Çevrim dışı ve çevrim içi ayrı alanlarda tutulur, profilde birlikte gösterilebilir.

**3. Sonraki çevrim dışı maçlar** (hesap açıkken): Telefon maç özetlerini kuyruğa alır, bağlantı olunca sunucuya
gönderir. Sunucu sınır koyar:
- maç başına en çok, motorun verebileceği gerçekçi en yüksek XP
- gün başına çevrim dışı XP tavanı (config, örneğin 2.500)
- maç kimliğiyle tekrar gönderime karşı koruma (idempotent)

**4. Hile koruması:** Çevrim dışı XP sıralamalara girmez. Sıralamadaki XP yalnız sunucunun doğruladığı çevrim içi
maçlardan gelir. Profilde yine tek seviye görünür.

**5. Çok cihaz:** Girişte sunucu profili telefona yazılır (`adopt`). Çakışmada sunucu kazanır; koleksiyonda birleşim
uygulanır.

**6. Misafir oyuncu:** Hesapsız oyuncunun ilerlemesi yalnız telefonda tutulur. Giriş yapınca 2. madde uygulanır.

**7. Arayüz:** Seviye, unvan ve çerçeve her yerde aynı görünsün. İlk birleştirmede kısa, şık bir bilgi çıksın:
"İlerlemen hesabına taşındı".

**8. Testler:**
- birleştirme kuralları ve tavanlar
- tekrar gönderim (idempotent)
- çevrim dışı XP'nin sıralama dışında kalması
- iki cihaz senaryosu
- hesap silinince birleşik verinin de silinmesi
- uzun koşu ve mevcut testlerin hepsi yeşil

**9. Panel:** Oyuncu ayrıntısında "çevrim dışı XP" ve "çevrim içi XP" ayrı görünsün. Tavanlar ayar olarak durur.

### Adım 4 — Ücretsiz planda güvenli botlar ve çipsiz mod (≤ 45 dk)

**1. Sunucu botlarının işlemci süresi.**
- Ücretsiz Cloudflare planında istek başına yaklaşık 10 ms işlemci sınırı var. Bir bot hamlesi bunu aşarsa alarm hata
  verir ve masa donabilir. Parça 1'de 101 Uzman botun bir kararı Node'da 83,7 ms'ye kadar ölçülmüştü.
- `BOT_CPU_MODE = free | full` ortam değişkeni ekle; varsayılan `free`.
  - **`free`:** Sunucu botları aramayı sınırlayan hafif bir karar yolu kullanır. Hedef: Node'da p99 ≤ 4 ms, en kötü
    ≤ 8 ms. Bunu 1.000 kararlık ölçümle doğrula; ölçüm kalıcı test olsun.
  - **`full`:** Bugünkü botlar.
- Her alarmda yalnız bir bot hamlesi yapılsın.
- Ücretliye geçiş adımlarına (`docs/OPERASYON.md` §7b) `BOT_CPU_MODE=full` satırını ekle.
- Çevrim dışı (telefondaki) botlar değişmez.

**2. Çipsiz mod** (F10'un yedeği). Panelde masa girişleri yalnız "Çipsiz" yapılınca:
- salonda, oda kurda ve hızlı oyunda çip girişi seçeneği ve bahis metni hiç görünmez
- çipli masa listelenmez
- sunucu çipli masa açmayı reddeder
- çip kazanma ve Çarşı etkilenmez

Bu davranış için kalıcı test ekle.

### Adım 5 — Küçük düzeltmeler (≤ 45 dk)

`FINAL_DURUM.md` §6'daki şu hatalar:
- **B-05:** Yasaklanan oyuncu canlı masadan hemen düşsün (4015).
- **B-06:** Susturma anında geçerli olsun.
- **B-11:** Bakım başlarken bekleyen hızlı masa başlamasın.
- **B-15:** Çevrim içi el sonuna karartma geçişi gelsin.
- **B-01:** 101 sahip kartında ad gereksiz kırpılmasın.
- **B-02:** Davetiye görseli moda göre değişsin.
- **B-03:** Bakım kartı 3B sehpayı örtmesin.
- **B-13:** "Deste" etiketi gelsin.

Görsel denetim 3 boyut × 2 temada yapılsın; çakışma 0 olmalı.

### Adım 6 — Test sunucusu ve otomatik deneme (≤ 60 dk)

1. **Hazırlık** (onaylı):
   - Cloudflare'de staging Worker ve staging D1 (ücretsiz plan).
   - Bütün migration'lar.
   - Secrets (yerel gizli dosyadan).
   - `ONLINE_MODE=on`.
   - Alan adı: `patisever.tr` Cloudflare'de mi, kontrol et. Değilse sahibe en basit yolu tarif et.
2. **Gerçek giriş:** Gerçek bir Supabase hesabıyla giriş (JWKS) çalışıyor mu?
3. **Otomatik iki oyunculu deneme** (telefon yok). Staging sunucusuna karşı, gerçek internet üzerinden iki ayrı tarayıcı
   istemcisiyle (`?online=…` ile staging'e bağlanan oyun) ve mevcut uçtan uca betiklerle şunları dene:
   1. Klasik maç.
   2. 101 maç.
   3. Eşli maç.
   4. Oda linkiyle ikinci istemcinin girmesi.
   5. 10 sn ve 60 sn bağlantı kopması, geri dönüş.
   6. Sekmenin arka plana alınıp geri gelmesi.
   7. Biri çıkınca yerine botun oturması.
   8. Çipli masa ve "Hareketler" (defter = cüzdan).
   9. Sıralamada görünme.
   10. Seviyenin iki istemcide aynı görünmesi.
   11. Panelde maçın görünmesi.
4. **Ölç ve rapora yaz:**
   - `exceededCpu` sayısı, Workers Logs ya da `wrangler tail` ile (hedef 0)
   - DO işlemci süresi p99
   - maç başına DO süresi (GB-s): hibernation çalışıyor mu? (`FINAL_DURUM.md` §4.3'teki 5,2 $ / 14 $ modeline göre)
   - hata sayısı
   - ortalama gidiş-dönüş süresi
5. **İzleme:** Cloudflare kullanım bildirimi (kota %80) ve ücretsiz bir dış izleme (her 5 dakikada `/api/health`).
   Kurulumu sen yap ya da sahibe 3 adımda tarif et.
6. **Sonraya telefon deneme listesi:** `docs/CIHAZ_DENEME.md` dosyasını yaz. Sahip ileride AAB'yi alınca telefonda
   (ve iPhone sürümü olursa iPhone'da) bunu uygulayacak. Liste sade Türkçe, her madde tek cümle olsun:
   - 3. maddedeki 11 deneme
   - uçak modu
   - uygulamayı arka plana atma
   - 3B masa akıcılığı
   - yön kilidi
   - titreşim
   - test reklamı
   - hesap silme
   - yeni Supabase anahtarıyla giriş
7. **Geçiş kapısı.** Aşağıdakilerin hepsi tamamsa Adım 7'ye geç:
   - `exceededCpu` = 0
   - 3. maddedeki 11 denemenin hepsi geçti
   - P0/P1 hata yok

   Biri bile eksikse **dur.** `FINAL_7_RAPOR.md` dosyasını o ana kadarki sonuçlarla yaz ve sahibe söyle.

### Adım 7 — Canlıya alma (onaylı; ≤ 60 dk)

1. Production Worker, D1, secrets ve alan adı: `FINAL_DURUM.md` §7.2 adımları.
2. **Doğrula:** `/api/health`, MFA'lı `/admin` girişi ve bir canlı maç.
3. **Oyun:** `ONLINE_DEFAULT = true` → `npm test` → `npm run build` → uygulamaya aktar → uygulama testleri → commit.
4. **Uygulama:** Derlenmiş oyun uygulamaya aktarılır, yeni Supabase anahtar ayarı uygulama koduna girer (Adım 2-C1),
   uygulama testleri çalıştırılır ve Okey dosyaları `okey-yayin` dalına commit edilir. **AAB / APK / EAS build üretme.**
   Sahibe kısa bir not bırak: "AAB'yi alırken ne yapmalı" (`docs/AAB_NOTU.md`; 5–6 madde: hangi dal, hangi komut, önce
   `CIHAZ_DENEME.md`).
5. **Mağaza formları:** `docs/MAGAZA_FORMLARI.md` dosyasına, sahibin kopyala-yapıştır yapabileceği hazır cevaplar yaz:
   - **Google Play:**
     - İçerik derecelendirmesi (IARC): simüle kumar evet (sanal çip, gerçek para yok, çip satılmaz).
     - Hedef kitle: 13+, çocuk grupları seçilmez.
     - Veri güvenliği (Data Safety).
     - Reklam: evet.
   - **Apple:** Yaş derecelendirme anketi, App Privacy.
   - Formu doldurunca çıkan yaşı sahip bildirsin. Uygun değilse çipsiz mod açılır (Adım 4-2) ve form "simüle kumar: hayır"
     olarak güncellenir.
6. Gerekiyorsa eski Supabase anahtarlarının hangi koşulda ve ne zaman kapatılacağını yaz (Adım 2-C1).

---

## 3. Bitince — `docs/analiz/FINAL_7_RAPOR.md`

- **Adımlar:** Her biri yapıldı mı, kanıtıyla (dosya, test, ölçüm, ekran görüntüsü).
- **Güvenlik:**
  - Hangi anahtarlar yenilendi, hangileri kaldı (yalnız adları).
  - Web paneli ve bildirim tablosunun durumu.
- **Staging ölçümleri tablosu:** işlemci, `exceededCpu`, maç başına GB-s, gidiş-dönüş süresi, hatalar.
- **Otomatik iki oyunculu deneme sonuçları** (11 madde) ve `CIHAZ_DENEME.md` dosyasının yolu.
- **Canlı durum:** Worker sürümü, `ONLINE_DEFAULT`, uygulamaya aktarılan oyun sürümü, `AAB_NOTU.md` yolu.
- **Kalan işler:** Sahibin işleri ve sonrası, en fazla 10 madde.
- **Git durumu:** İki depo, dallar, push edildi mi.

Son mesajın şu olsun:

```
Final 7 bitti: docs/analiz/FINAL_7_RAPOR.md
```
