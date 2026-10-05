# Aksoy Kesici Takımlar — yapılacaklar

İlk sürüm (MVP) yayında. Kalan işler aşağıda; tamamlananlar işaretlenecek.

## Devam eden
- [ ] Teknik araçlar: kesme hızı / devir hesaplayıcı, ISO uç kodu çözücü, kılavuz matkap tablosu
- [ ] KVKK, çerez politikası ve 404 sayfalarının son hâli
- [ ] Katalog, ürün ve marka sayfalarının son kontrolleri

## 3D model (kullanıcının GLB dosyası gelince)
- [ ] GLB'yi `gltf-transform` ile optimize et: meshopt sıkıştırma, WebP 1K doku, parçaları birleştirme yok, hedef ≤ 1,5 MB
- [ ] `src/scripts/showcase/glb.ts` içindeki `GLB` ayarını doldur: yön, boy (mm), uç ucu hizası, gömülü uç var mı
- [ ] Uçsuz ("boş cep") sürümü geldiyse kodla üretilen uçları ve torx vidaları cep konumlarına oturt (`model.ts` → `seats`)
- [ ] Malzemeleri gerçek metale çevir, ölçü çizgisi çapalarını yeni modele göre ayarla
- [ ] Poster görsellerini ve OG görselini yeniden üret (`node scripts/poster.mjs`, `node scripts/og.mjs`)

## Test
- [ ] Tüm sayfalar: masaüstü 1440 ve mobil 390 ekran görüntüleri, yatay taşma kontrolü
- [ ] Teklif Sepeti → WhatsApp mesajı uçtan uca, arama paleti (elmas uç / klavuz eş anlamlıları)
- [ ] Kırık link taraması, Lighthouse (performans / erişilebilirlik / SEO)
- [ ] Gerçek iPhone Safari ve orta seviye Android'de 3D vitrin akıcılığı

## Firmadan beklenen bilgiler
- [ ] Künye: vergi dairesi ve numarası, e-posta, açık adres (gösterilsin mi?)
- [ ] Hizmet verilen şehirlerin kesin listesi (şu an tahmini: Ankara, Konya, Kayseri, Eskişehir, Kırıkkale, İzmir, Manisa, Denizli, Aydın, Uşak)
- [ ] "Wunher" markası (kutu fotoğrafı)
- [ ] KYOTO Cutting Tools ve STORM&K'nin menşei ve üreticisi
- [ ] Blog yazılarının Kemal Aksoy tarafından kontrolü (şu an "Taslak", noindex)
- [ ] Ürün görselleri: tedarikçiden yazılı izin ya da kendi çekimleri

## Yayın
- [ ] Vercel bağlantısı (Root Directory: `aksoy-site`, Production Branch: çalışma dalı)
- [ ] Alan adı alınınca: `SITE_URL` ortam değişkeni, robots açılır, Search Console, Google İşletme Profili (hizmet bölgesi işletmesi)
- [ ] İsteğe bağlı: çerezsiz analiz (Cloudflare Web Analytics)
