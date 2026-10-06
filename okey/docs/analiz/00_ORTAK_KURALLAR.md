# Analiz serisi — ortak kurallar (her parçadan önce oku)

Bu klasördeki dosyalar (`01_...` – `06_...`) Patisever Okey'in parça parça, derinlemesine analizidir.
Her parça ayrı bir görevdir. Sana hangi parça verildiyse **yalnız onu** yap.

## Çalışma akışı

1. Sana "Parça N'i yap" denir. Bu dosyayı ve ilgili parça dosyasını oku.
2. Analizi yap. Raporu `docs/analiz/RAPOR_0N.md` olarak yaz, ekran görüntülerini `docs/analiz/ss/0N/` klasörüne koy.
3. **Rapordan sonra dur.** Düzeltmeye başlama. Rapor başka bir yapay zekâya gider; o, düzeltme talimatını hazırlar.
4. Düzeltme talimatı gelince onu uygula. Test et. Sonunda "Parça N düzeltildi, testler: …, Parça N+1'e hazırız" diye raporla.

Elinde yarım bir iş varsa (ör. çevrim içi ekranlar), analize başlamadan önce onu bitir, testleri çalıştır ve commit et.

## Süre sınırı (önemli)

Bu analiz **hızlı ve derin** olmalı.
- **Üst sınır 60 dakika.** Bu bir hedef değil, tavandır. İş 15 dakikada bitiyorsa 15 dakikada bitir; süreyi doldurmak
  için oyalanma, gereksiz ek test ya da tekrar yapma.
- Her soruyu cevaplayacak kadar kanıt topla, fazlasını değil. Cevap netleştiyse sonraki maddeye geç.
- 60 dakikaya yaklaşırsan kalan maddeleri hızlıca bitir; doğrulayamadıklarını `BİLİNMİYOR` diye işaretle ve raporu yaz.
- **Toplu testleri ekransız çalıştır.** Kural motorunu doğrudan kullan, ekran çizme. Örnek: `src/game/sim.js`
  içindeki `playMatch`. Ölçüm: 100 maç klasikte yaklaşık 40 sn, 101'de yaklaşık 13 sn sürüyor.
  Saf fonksiyon testleri (dizme, toplam hesabı) 10.000 elde bile saniyeler sürer.
- **Ekranlı (tarayıcı) denemeleri az ve hedefli yap.** Her soru için 1–3 örnek ve ekran görüntüsü yeterli.
  Tarayıcıda uzun maç oynatma; gereken ana gelmek için oyunun test kancalarını (`window.__okey`) kullan.
- Uzun süren işleri arka planda başlat, beklerken kodu incele.
- Bir test 5 dakikayı geçerse durdur, nedenini rapora yaz ve devam et.

## Kurallar

1. **Bu bir analizdir.**
   - Ürün kodunu değiştirme.
   - Deploy etme. Bulutta kaynak oluşturma ya da silme.
   - Ücretli bir şey açma.
   - Serbest olanlar: okumak; test, derleme ve yerel sunucu çalıştırmak (`npm run dev`, `wrangler dev --local`);
     ölçmek; ekran görüntüsü almak. Ölçüm, otomatik oynatma ve senaryo betiklerini yalnız `tools/analiz/` klasörüne koy.
     Bu betikler daha sonra kalıcı teste dönüşebilir, o yüzden düzgün yaz.
2. **Gerçekten dene.** Kodu okumak yetmez. Oyunu aç, oyna, otomatik oynat, ekran görüntüsü al.
   Bir şeyin "çalıştığını" ancak gördüysen ya da ölçtüysen yaz.
   - Telefon boyutları:
     - en az 568×320 (küçük yatay)
     - 844×390 (orta)
     - 932×430 (büyük)
   - Kalite modları: Oyunda 3B (`?quality=` ile) ve DOM modu varsa ikisini de dene.
3. **Kanıt göster.** Her bulguda dosya:satır, komut çıktısı ya da ekran görüntüsü yolu olsun.
4. **Uydurma.** Her iddianın yanına durumunu yaz:
   - `ÖLÇÜLDÜ`: gördün ya da ölçtün
   - `TAHMİN`: çıkarım yaptın
   - `BİLİNMİYOR`: doğrulayamadın; nasıl doğrulanacağını da yaz
5. **Gizli bilgi.** Anahtar, token ya da parola değerlerini asla yazma, ekrana basan komut çalıştırma.
   Sadece hangi dosyada ya da hangi değişkende olduğunu söyle.
6. **Eksiksiz ol.** Parçadaki her soruya cevap ver. "Kapsam dışı" deyip geçme. Bir şey bizde yoksa `YOK` yaz ve
   nasıl olması gerektiğini öner.
7. **Soruları çoğalt.** Parçadaki listeler başlangıçtır. Okey bilgine ve kodda gördüklerine dayanarak, bizim
   sormadığımız eksik ve hataları da bul. Rapordaki "Ek bulgular" bölümü bunlar içindir.
8. **Başka parçaya ait bir şey görürsen** raporun sonundaki "Diğer parçalara notlar" bölümüne yaz, kaybolmasın.

## Bağlam (kısa)

- **Oyun:** Klasik Okey ve 101 Okey. Kaynak `src/` altında vanilla ES modülleri ve three.js. Tek dosya HTML'e derlenir,
  React Native uygulamasının (sanane-main) içinde WebView'da çalışır. Yalnız yatay ekran, Türkçe.
- **Ayrıntılar:** `docs/HANDOFF.md` ve `README.md`.
- **Kurallar:** Kural motoru `src/game/` altında. Kural ayarları `src/game/game.js` içindeki `DEFAULT_RULES` nesnesinde.
- **Kalite çıtası:** Apple seviyesi ve rakip okey oyunlarından açıkça daha iyi. Hiçbir şey üst üste binmemeli.
  Her ekran koyu zemin, cam yüzeyler, altın vurgu ve serif başlıklardan oluşan tasarım diliyle uyumlu olmalı.

## Rapor biçimi (`RAPOR_0N.md`)

1. **Özet:** En önemli 10 bulgu, tek cümle hâlinde.
2. **Kullanıcının soruları:** Parçada "Kullanıcının soruları" bölümü varsa her soruya bir satır. Biçim:

   | No | Soru | Cevap (Evet/Hayır/Kısmen) | Kanıt / ekran görüntüsü | Not |
   | --- | --- | --- | --- | --- |

3. **Durum tablosu:** Parçadaki her başlık için durum (`VAR` / `KISMEN` / `YOK`), bulgu sayısı ve tek cümle.
4. **Bulgular:** Önem sırasına göre, şu biçimde:

   ```
   ### ISTAKA-04 — "Diz" son 13'ü alt satıra atıyor, grup tanınmıyor
   - Önem: P0 (canlı öncesi şart) | P1 (önemli) | P2 (iyileştirme) | P3 (fikir)
   - Durum: ÖLÇÜLDÜ
   - Yeniden üretme: 1) … 2) … 3) …
   - Beklenen: … / Gerçekleşen: …
   - Kanıt: src/ui/rack.js:312, ss/02/istaka-04.png
   - Kök neden (biliniyorsa): …
   - Öneri: …
   - Efor: S | M | L
   ```

5. **Ek bulgular:** Bizim sormadığımız ama bulduğun her şey, aynı biçimde.
6. **Sahibine sorulacak kararlar:** Numaralı liste. Her soruda seçenekler, senin önerin ve gerekçesi.
7. **Önerilen düzeltme sırası:** Bulgu ID'leriyle, bağımlılık sırasına göre.
8. **Diğer parçalara notlar.**
9. **Ekler:** Çalıştırılan komutlar ve özet çıktıları, yazdığın betiklerin yolları, test sonuçları.

Raporu bitirince baştan sona bir kez daha oku. Parçadaki her soru ve her maddenin raporda bir karşılığı var mı,
kontrol et.
