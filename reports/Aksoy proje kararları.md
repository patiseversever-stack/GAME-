# Aksoy Kesici Takımlar — proje kararları

Ankette verilen cevapların özeti. Site kurulurken bu dosya esas alınır.

## Firma
- **Ad:** Aksoy Kesici Takımlar
- **Yasal tür:** Şahıs şirketi. Künye için sahibin adı soyadı, vergi dairesi ve numarası, adres ve e-posta eksik.
- **Satış:** Sanayiye saha satışı yapılıyor, fiziksel dükkân yok.
- **Hizmet bölgesi:** İç Anadolu ve Ege.
- **WhatsApp:** +90 535 610 19 89
- **Çalışma saatleri:** Mesai saati yazılacak, yanına "WhatsApp'tan mesai dışında da yazın, ilk fırsatta dönelim" notu eklenecek.
- **Logo:** Yok. Grafit & TiN tarzında yeni logo tasarlanacak.

## Markalar ve hukuki ifade
- **Markalar:** Iscar, Tungaloy, Gühring, Korloy, Kyocera ("kyoto"), DESKAR ("descar"), SANT. "wunher" henüz belirsiz; kullanıcı kutunun fotoğrafını gönderecek.
- **Bayilik:** Hiçbir markayla yazılı bayilik anlaşması yok.
  - Sitede "yetkili bayi" yazılmayacak, yerine "… ürünleri tedarik edilir" denecek.
  - Marka logoları kullanılmayacak.
  - Markaların sahiplerine ait olduğunu belirten bir uyarı metni eklenecek.
- **Sepet adı:** "Teklif Sepeti". "Sipariş" kelimesi kullanılmayacak (ETBİS kaydı gerekmesin diye).

## Katalog
- **İlk ürünler:** Türkiye'de en çok aranan kodlarla 60–100 ürünlük bir başlangıç kataloğu kurulacak. Abi daha sonra satmadığı ürünleri çıkaracak.
- **Görseller:** Kullanıcı üretici sitelerindeki görselleri seçti.
  - Telif riski kullanıcıya bildirildi.
  - Görseli olmayan ürünlerde kodla üretilmiş 3D render yedek olarak kullanılacak.
- **Fiyat:** Gösterilmeyecek, ürünlerde "Teklif alın" yazacak.
- **Stok durumu:** Şimdilik gösterilmeyecek, altyapısı hazır tutulacak.
- **Ürün verisi yönetimi:** Şimdilik bir dosyada tutulacak, ileride Google Sheets'e geçilebilir.

## İçerik
- **Dil:** Yalnızca Türkçe.
- **Ekstra bölümler:** Teklif Sepeti + WhatsApp, teknik araçlar (hesaplayıcılar ve ISO kod çözücü), marka sayfaları, blog.
- **Blog:** Yazıları Claude hazırlayacak, abi teknik doğruluğunu kontrol ettikten sonra yayınlanacak.

## Tasarım ve teknik
- **Tasarım dili:** Grafit & TiN.
  - Giriş ve marka sayfaları koyu zeminli, katalog açık zeminli olacak.
  - Vurgu rengi TiN altını (#D9A441).
  - Başlıklarda Space Grotesk, metinlerde IBM Plex Sans kullanılacak.
- **Altyapı:** Astro ile statik site; ana sayfadaki 3D bölüm three.js + GSAP ScrollTrigger ile yapılacak.
- **3D model:** Kullanıcı ChatGPT'de görsel üretip Meshy ile GLB dosyasına çevirecek.
  - Önerilen seçenek: PCLNR kater + CNMG uç.
  - Uç, vida ve parmak freze kodla üretilecek.
- **Yayın:**
  - Şimdilik Vercel'in ücretsiz alt alan adında (vercel.app) yayınlanacak, domain sonra alınacak.
  - Uyarı: vercel.app adresleri Türkiye'de erişime engellenmiş olabilir ve Vercel'in ücretsiz planı ticari kullanıma izin vermiyor. Bu adres sadece önizleme amaçlı kullanılacak; müşterilere açmadan önce domain alınacak.
