# Aksoy Kesici Takımlar — yapılacaklar

Site yayında: https://game-aksoy-site.vercel.app (Vercel, varsayılan daldan derlenir).

## Tamamlandı
- [x] 3D kaydırma vitrini: SDUM tipi U-matkap (WCMX trigon uçlar), 6 sahne, film kontrolü, sabit etiketler
- [x] Kategori kartlarında canlı 3D modeller; hesaplayıcıda canlı kesme simülasyonu
- [x] 40 gerçekçi 3D ürün görseli (`node scripts/render-products.mjs`, dev sunucusu açıkken)
- [x] Ürün başına WhatsApp önizleme görseli (`node scripts/og-products.mjs`)
- [x] Teknik araçlar, KVKK, çerez politikası, 404
- [x] Metinlerin sadeleştirilmesi; anlamsız kodların (PAFTA, REF, A1…) kaldırılması
- [x] Mobil dokunma hedefleri ≥ 44 px, taşma yok, erişilebilir etiketler
- [x] Lighthouse: erişilebilirlik, en iyi uygulamalar ve SEO 100; katalog/ürün sayfası performansı 90+
- [x] Kanonik adres gerçek yayın adresi; robots.txt ve site haritası açık
- [x] Ekran kartı olmayan cihazlarda 3D yerine hafif statik görünüm
- [x] Teklif sepeti: konum (harita), teslim şekli, termin; liste bağlantısı paylaşma; form alanları sayfa değişince korunur
- [x] Tüm ürün adları ve sayfa metinleri sade Türkçeyle yeniden yazıldı
- [x] Klavye erişimi: menü, arama ve sepette odak pencerede kalır; Esc sırayla kapatır
- [x] Malzemeyle arama ("paslanmaz", "titanyum"…) ve tutucuların malzeme süzgecinden çıkarılması

## 3D model (isteğe bağlı GLB)
- [ ] Gelecekte gerçek tarama/CAD modeli gelirse: `gltf-transform` ile optimize et (meshopt, WebP 1K, ≤ 1,5 MB), `src/scripts/showcase/glb.ts` ayarını doldur

## Test
- [ ] Gerçek iPhone Safari ve orta seviye Android'de 3D vitrin akıcılığı
- [ ] Teklif Sepeti → WhatsApp mesajının gerçek telefonda uçtan uca denenmesi

## Firmadan beklenen bilgiler
- [ ] Künye: vergi dairesi ve numarası, e-posta, açık adres (gösterilsin mi?)
- [ ] Hizmet verilen şehirlerin kesin listesi (şu an tahmini: Ankara, Konya, Kayseri, Eskişehir, Kırıkkale, İzmir, Manisa, Denizli, Aydın, Uşak)
- [ ] "Wunher" markası (kutu fotoğrafı)
- [ ] KYOTO Cutting Tools ve STORM&K'nin menşei ve üreticisi
- [ ] Blog yazılarının Kemal Aksoy tarafından kontrolü (onaylanana kadar arama motorlarına kapalı; `src/data/posts.ts` → `draft: false`)

## Yayın
- [ ] Alan adı alınınca: Vercel'de `SITE_URL` ortam değişkeni, Search Console, Google İşletme Profili (hizmet bölgesi işletmesi)
- [ ] İsteğe bağlı: çerezsiz analiz (Cloudflare Web Analytics)
