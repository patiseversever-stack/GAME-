# Kural kararları (v2 maç tasarımı, kullanıcıyla soru-cevap)

Kaynak: kullanıcının cevapları (2026-11-02). Kodlamaya sorular bitince geçilecek.

## 1. Modlar
- Dört mod: Süreli, Hakimiyet, Ölüm maçı, Klasik kısa.
- Süreli: 15 dk (süre dolunca puanla biter, yarım düello tamamlanır).
- Hakimiyet: illerin %70'i.
- Ölüm maçı: kullanıcı "45 dk çok uzun, 30 dk" dedi; 30 dk sonra ne olacağı (ani ölüm mü puan mı) teyit edilecek.

## 2. Zincir saldırı
- Kazandıkça aynı turda devam, sınırlı.
- Sınır haritaya göre: kişi başı il sayısının ~%15'i, en az 2 en çok 5.
- Kaybedince sıra geçer, savunana +100; kimse bilemezse il geçmez, sıra geçer.
- Kategori çarkı turun başında 1 kez.

## 3. Başkent
- Zincirde kuleler arka arkaya yıkılabilir (her kule zincir sınırından 1 hak yer); başkent tek turda düşebilir.
- Kule onarımı var: sıranın başında "Kule onar" (soru bilinirse 1 kule; o tur saldırı yok; en az 1 kule ayaktaysa).
- Başkent düşünce oyuncu elenir, illeri saldırana geçer.
- Başkente komşuysa her an saldırılabilir.

## 4. Kalkan ve jokerler
- Kalkan saldırıyı sorusuz karşılar: "KALKAN!", soru yok, kalkan kırılır; saldıranın zincir hakkı yanmaz, devam eder.
- Kalkan kurulduktan sonraki ilk saldırıyı (hangi il olursa) karşılar.
- Jokerler maç içinde kazanılır (ör. her 3 fetihte 1 rastgele joker, başkent yıkınca 1 kalkan).
- Kanat jokeri yok.

## 5. Harita ve puan
- Bölge haritası kişi başı 8 il (2 kişi 16, 3 kişi 24, 4 kişi 32).
- Tüm Türkiye: yayılmada yarısı dağıtılır (4 tur), kalan iller tarafsız; tarafsıza saldırı tek kişilik kolay soru.
- İl değerleri eşit (200; fetih +200, savunma +100; başkent 1000).
- Geride kalana hafif yardım: en az ili olanın zincir sınırı +1.

## 6. Bot savaşlarını izleme
- İki botun düellosunda soru yok: ~5 sn özet (kim kime ok → "X BİLDİ · Y BİLEMEDİ" kartı → il rengi yavaşça değişir / kule yıkılır).
- Eşlide takım arkadaşının düellosu daha uzun (soru metni ve açılan cevap görünür); diğerleri özet.
- Botların sırasında "Atla ⏩" düğmesi: kalan bot hamleleri anında uygulanır, sıra sana gelir; dokunmak tek anı geçer.
- Botların bütün hamleleri özetle gösterilir.

## 7. Çevrimiçi
- Başka iki oyuncunun düellosu canlı izlenir (soru + gerçek süre); izleyen de cevaplar, bilirse küçük puan (+20).
- Çevrimiçinde dört mod da açık; çıkanın yerine bot geçer.
- Seçim süreleri: ilk hedef 12 sn, zincirdeki sonraki hedefler 8 sn; diğerleri aynı.
- Kopan oyuncu maç bitene kadar her an dönebilir (dönene kadar bot oynar).

## 8. Bitiş, kazanan, elenme, eşli
- Ölüm maçı: 30 dk; sonra ani ölüm (kalkan çalışmaz, kule onarılmaz, zincir sınırı kalkar), tek kalan kazanır.
- Kazanan puanla (il + başkent + savunma); eşitlikte altın soru.
- Elenen insan: "İZLE" (Atla düğmesiyle) ya da "SONUCU GÖR" (kalan maç anında arkada biter).
- Eşli sıra dönüşümlü kalır (A1, B1, A2, B2).

## 9. Mod ayrıntıları
- Klasik kısa: yayılma 3–4 tur + 6 savaş turu (~10 dk), zincir sınırı haritaya göre.
- Hakimiyet: 25. dakikadan sonra eşik her 2 dk'da %5 iner (%70 → %65 → …).
- Tarafsız ile saldırı: tek kişilik kolay soru (zorluk −0,5); bilirsen il senin (+200), zincir devam; bilemezsen sıra geçer.
- Menüde varsayılan mod: Klasik kısa.

## 10. Hatalar (soru değil, düzeltilecek)
- Tufan (ve uzun filmli tipler): sonuç ekranı süresi cevap filminden düşülüyor, film erken kesiliyor. Film tam oynamalı,
  sonuç ekranı üstüne eklenmeli; çevrimiçinde sunucunun film süresi buna göre büyümeli (12 sn tavanı da kesiyordu).
- İzlenen bot düellosunda sayaç gerçek süreyi, çubuk 2,6 sn'yi gösteriyor (bot özetiyle soru kalkacak; çevrimiçi canlı
  izlemede gerçek süre).
- Kalkan sonrası sıra bitiyordu; başkentte tek kule yıkılınca sıra geçiyordu (zincir kuralıyla çözülür).

## Uygulama sırası
1. Hatalar: Tufan film süresi.
2. Zincir saldırı + sınır + çark turda 1 + geride kalana +1; kalkan sorusuz; kule zinciri + kule onarımı.
3. Modlar: Klasik kısa (6 savaş turu), Süreli 15 dk, Hakimiyet %70 (+25 dk eşik düşüşü), Ölüm maçı (30 dk ani ölüm);
   menüde mod seçimi (varsayılan Klasik), HUD'da süre / hakimiyet çubuğu.
4. Harita: kişi başı 8 il; 81 ilde yarı yayılma + tarafsız iller (tek kişilik kolay soru).
5. Bot izleme: sorusuz özet (~5 sn), eşlide takım arkadaşı uzun, "Atla ⏩"; elenince İZLE / SONUCU GÖR.
6. Jokerler maç içinde kazanılır.
7. Çevrimiçi: canlı izleme + izleyici tahmini (+20), zincirde 8 sn hedef seçimi, kopan oyuncu her an dönebilir.
8. Her aşamada: benzetim (test/sim.mjs) ile süre/bitiş nedeni ölçümü, önce/sonra görseli, oyun + defter yayını.
