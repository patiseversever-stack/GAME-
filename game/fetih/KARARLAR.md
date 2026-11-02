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
