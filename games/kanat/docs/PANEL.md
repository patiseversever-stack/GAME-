# KANAT — Oyuncu Paneli kayıtları

Beş persona her turda aynı beş soruyu yanıtlar: **(1) 10 saniyede anladım mı? (2) "Bir daha" dedim mi? (3) Arkadaşıma gönderir miydim? (4) Ucuz görünen ne? (5) Kafamı karıştıran ne?** Brif §1 çıtası: personaların ≥ %80'i "konsol/PC kalitesi" demeli; her tur sonunda alınan aksiyonlar `docs/decisions/<tur>-review.md` satır numaralarıyla bağlanır.

| Persona | Yaş | Profil |
|---|---|---|
| Deniz | 13 | sabırsız, TikTok'a klip gönderir |
| Ece | 24 | rekabetçi, rekor ve rozet kovalar |
| Murat | 38 | metroda 3 dakikalık oturumlar |
| Ayşe | 52 | teknolojiye güveni düşük, aile WhatsApp grubu |
| Hasan | 60 | büyük yazı, tek el, titreyen başparmak |

---

## F1 — ön üretim turu (2026-10-08)

**Kapsam:** yalnız okuma — `docs/GDD.md` (§3, §7 FTUE, §9 UI), brif §1 ilk 30 sn filmi, §2.9, §2.11, `src/content/meta/**`, `src/ui/strings/tr.ts`, `src/ui/screens/*.ts`, `src/ui/hud/hud.css`, `docs/shots/terrain/*.webp`. Oynanabilir yapı henüz yok (rota 0/20), bu yüzden yanıtlar tasarım belgesi, metinler ve ekran kodu üzerinden.

**Genel karar:** Çekirdek fikir beş personanın hepsinde tutuyor. "Atla"dan sonra tek başparmakla sürüklemek, bırakınca kanadın kendiliğinden düzelmesi, yakınlığın puan, ton ve renk olarak hissedilmesi, ölüm olmaması ve 1 saniyede yeniden deneme her yaş için anlaşılır. Sorunlar dört yerde toplandı: (1) yaşlı ve teknolojiye güveni düşük oyuncu için okunurluk ve yol bulma, (2) yayılma halkası (klip video değil, düello kodu ham metin), (3) Usta Görevleri ve ödül görünürlüğü, (4) yukarıdan bakınca arazi bake'inde ucuz duran izler. P0 yok, P1 sayısı 6. "Konsol/PC kalitesi" oylaması bu turda yapılamadı (oynanabilir kare yok) — F2'de ölçülecek.

### Deniz (13, sabırsız)
1. **10 sn'de anladım mı?** Büyük ölçüde evet: 4. saniyede "Atla", 7. saniyede kanat açılıyor, hız hissi 10. saniyeden önce geliyor. Ama yükleme ekranı birkaç saniye sürerse 10 saniye "Atla"dan önce bitiyor; 1,5–4 sn sinematikte dokunuşumun sayılıp sayılmadığı belli değil. Asıl "vay" anı (Sıyırma, ağır çekim) 18. saniyede.
2. **"Bir daha" dedim mi?** Evet: 1 sn'de yeniden başlamak, ×5 tonları, sayının katlanması. Ama ilk uçuştan sonra sonuç ekranı ve "Tekrar" yok, art arda iki "açıldı" kartı hızımı kesiyor.
3. **Arkadaşa gönderir miydim?** Klip video olsa hemen; emoji kartı "annemlerin Wordle'ı".
4. **Ucuz görünen:** yukarıdan arazide sert siyah/mor gölge lekeleri, taranmış yamaçlar, Pamukkale'de mozaik, Karadeniz'in kamuflaj yeşili; gerçek geometri yoksa uydurma rota haritası ve düz SVG dünya kartları.
5. **Kafamı karıştıran:** pek yok; SÜRÜ'de altın sürümü turuncu rakipten ayırmak zor.

**Alınan aksiyonlar:** 1,5 sn'den sonraki her dokunuş doğrudan atlar, ayrı yükleme ekranı yok, simge → "Atla" ≤ 8 sn (#56); kompakt FTUE sonuç kartı + [Giy] (#40); açılmalar tek kartta (#41); Paylaş = Klip / Kart / Metin, klip 1080×1920 (#38, #14); arazi bake düzeltmeleri terrain'e (#39); fallback harita ve SVG kart teslimde yok (#53); "SEN" etiketi, çift halka, turuncu en son (#49).

### Ece (24, rekabetçi)
1. **10 sn'de anladım mı?** Evet.
2. **"Bir daha" dedim mi?** Evet: yakınlık kademeleri, kombo, çizgi seçimi, termal ve ilmek rotası, 0,85 × uzman eşiği, Günün Rotası'nda hız-yakınlık gerilimi ve hayaletler gerçek derinlik; "0,4 sn daha" isteği oluşuyor.
3. **Arkadaşa gönderir miydim?** Düello koduyla evet, ama 600–3.000 karakterlik kod çirkin.
4. **Ucuz görünen:** gerçek rotaya uymayan sahte harita çizgileri; 49 seviye ödülünün 26'sı SÜRÜ kozmetiği, giysime rütbeyle yalnız 3 şey geliyor.
5. **Kafamı karıştıran:** ilk 3 rota raylı (Rehber Rüzgâr, %15 kapı mıknatısı); yardımla alınan yıldız ve rekorlar işaretsiz, "Sıfır Temas" ve "Temassız 3⭐" yardımla kolaylaşıyor; Usta metinleri "Usta Görevi" ya da "1 puanı geç" görünebilir, süre hedefi tam sayıya yuvarlanıyor; rota seçiminde hayalet seçimi yok; lig düşmediği için yalnız oynama süresini ölçüyor.

**Alınan aksiyonlar:** rütbe hattı yalnız uçuş tarafı — kanopi 13, kart çerçevesi 12, hayalet rengi 12, menü saati 4 (#52, K-23); 🛟 rekor işareti + yardımsız görev/rozet kuralı + erken yardım azaltma teklifi (#50, #21, K-20); Usta tür kimlikleri UI anahtarlarıyla birebir, göreli metin, süre `1:18.4` biçimi (#35); hayalet seçimi Yok / En iyim / Kılavuz (#51); Elmas'ta `skillIndex` (#61); düello bağlantısı (#37).

### Murat (38, metroda 3 dk)
1. **10 sn'de anladım mı?** Evet; ikinci açılışta "Devam" kartı anında oyuna sokuyor.
2. **"Bir daha" dedim mi?** Evet: 60–120 sn rota ve 3 dk SÜRÜ turu metroya uyuyor, Günün Rotası geri getirir. Ama 100. saniyede çarpınca en baştan başlamak can sıkıyor; "Kilim 2/3" ve XP çubuğu ekranda görünmüyor.
3. **Arkadaşa gönderir miydim?** Günün Rotası kartını aile grubuna evet; ama kartta bağlantı yok.
4. **Ucuz görünen:** uçuşta yok.
5. **Kafamı karıştıran:** başka dünya/rota için Modlar → Kariyer → Dünyalar → Rotalar (3 kat); sessizken açılıştaki 1,5 sn siyah ekran "dondu mu?"; her rotada yükleme bekleme.

**Alınan aksiyonlar:** "Bu bölümü çalış" (son kapıdan, ANTRENMAN; #54, #27, K-26); rota kartında ödül çipi "Kilim 2/3", sonuçta XP çubuğu (#51); düello/Günün Rotası paylaşımında derin bağlantı (#37); menüde "Dünyalar ve rotalar" (#44); 0,3 sn şafak titremesi (#59); sonuç ekranında ön yükleme, aynı dünyada yükleme ekranı yok (#63).

### Ayşe (52, teknolojiye güveni düşük)
1. **10 sn'de anladım mı?** "Atla" ve nabız atan başparmak net; ama atlayınca bütün HUD aynı anda geliyor, boğuldum.
2. **"Bir daha" dedim mi?** "Devam"a basmayı sürdürürüm, modları keşfetmem.
3. **Arkadaşa gönderir miydim?** Günün Rotası kartını belki; düello kodunu hayır (WhatsApp'ta virüs gibi).
4. **Ucuz görünen:** hayır.
5. **Kafamı karıştıran:** uçuş ortasında "Ters mi? [Evet][Hayır]" (ne ters?); "Yardımı kapatmak ister misin?" (hangi yardım?); Yarım Uçuş'tan sonra iniş bölgesi nerede?; 11–12,5 px soluk yazılar; Yalpa, Yunuslama, Expo, Sim hızı, Okabe-Ito, FPS, LP, YZ; "Usta"nın 6 anlamı; "Çek" (fotoğraf mı?); ana menüde dünyalar yok.

**Alınan aksiyonlar:** ilk uçuşta HUD kademeli açılır, hız gizli (#42); "Yukarı çekince burun insin mi?" [Evet, çevir] / [Hayır, böyle kalsın], sim durur, vay anlarına binmez (#43); "Yardımı azaltmak ister misin?" → Az (#21); iniş oku + "İNİŞ 820 m" + 2 km ışık sütunu + Yarım Uçuş mini haritası (#36); Büyük yazı ve 13 px taban (#34); sade dil listesi (#57); uzman bot = "Kılavuz Pilot" (#58, K-27); "Aşağı çek" (#59); ×N metinlerinde mesafe (#62); "Dünyalar ve rotalar" (#44); düello paylaşımı insan cümlesi (#37).

### Hasan (60, büyük yazı, tek el)
1. **10 sn'de anladım mı?** Evet.
2. **"Bir daha" dedim mi?** Evet, Yavaş Mod ve Otomatik Paraşüt'ü bulabilirsem; Erişilebilirlik'te yalnız 2 seçenek var.
3. **Arkadaşa gönderir miydim?** Torunlarıma, kod bir bağlantıysa evet.
4. **Ucuz görünen:** hayır.
5. **Kafamı karıştıran / kontrol rahatlığı:** her yerden sürüklemek ve "bırakmak güvenli" tek elle çok rahat; 88 pt PARAŞÜT sağ altta mükemmel. Sorunlar: 45 pt yarıçap ve 3,6 pt ölü bölge titreyen başparmağa fazla hassas; başparmağım yakınlık halkasını kapatıyor; flare için ~0,7 sn pencere, FTUE'den sonra ipucu yok; Duraklat ve Geri sol üstte; "Büyük HUD" menü yazısını büyütmüyor; SÜRÜ'de Nefes yayı başparmağımın altında, basılı tutup yön vermek sürüyü sıkıştırıyor.

**Alınan aksiyonlar:** tek Erişilebilirlik bölümü + Sakin kontrol ön ayarı + titreme algılı tek kart (#46); halka başparmaktan ~90 px kaçar, Alt/Orta ayarı (#45); Kariyer'de flare ipucu varsayılan açık (#47); iki parmak duraklatma, `onBack`, Büyük yazıda Geri alt çubukta (#60); "Büyük yazı" tüm arayüzü ölçekler (#34); Nefes yayı liderin çevresinde, açık el / yumruk ikonları (#48 — yön ile formasyonun aynı parmakta olması brif §2.6 kontrol tanımı, korunur); *prefers-reduced-motion* → Konfor Kamerası varsayılan, 2 erken çıkışta "Daha sakin kamera?" (#64).

### F1 sonrası açık ölçümler (F2 panelinde)
- "Konsol/PC kalitesi" oylaması (≥ 4/5 persona) gerçek karelerle: FTUE 0–30 sn, Kapadokya 3 m / 30 m, sonuç ekranı, SÜRÜ gün batımı.
- Ayşe ve Hasan: Büyük yazı açıkken menü → rota → sonuç akışı, en parlak arka planda kontrast ölçümü.
- Deniz: simge → "Atla" süresi (hedef ≤ 8 sn, orta cihaz) ve klip paylaşımı.
- Murat: geç çarpmadan "Bu bölümü çalış" ile 3 dk'lık oturumda kaç bölüm çalışılabildiği.
- Ece: yardımsız rozet/görev ayrımının sonuç ve rota kartında okunurluğu.
