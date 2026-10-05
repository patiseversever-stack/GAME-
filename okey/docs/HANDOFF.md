# Patisever Okey — devir belgesi

Bu belge projeyi başka bir yapay zekâ kodlama aracına (ya da bir geliştiriciye) devretmek için yazıldı.
Önce bunu, sonra `README.md` dosyasını okuyun.

## 1. Hedef ve çalışma biçimi

- Hedef: dünyanın en iyi okey oyunu (Klasik Okey + 101 Okey). Yalnız **yatay ekran**, mobil öncelikli.
- Kalite çıtası: Apple tasarım direktörü seviyesi. Basit ya da sıradan görünen hiçbir ekran kabul edilmez.
  Rakiplerden açıkça daha iyi görünmeli: derinlik, ışık, illüstrasyon, akıcı animasyon. Hiçbir şey üst üste binmemeli.
- Proje sahibi **aşama aşama** ilerler. Her aşamanın sonunda durulur, önce/sonra ekran görüntüleri ve çalışan bir link gösterilir,
  onay beklenir. Onay gelmeden sonraki aşamaya geçilmez.
- Arayüz dili Türkçe; kod yorumları da Türkçe.

## 2. Kurulum ve komutlar

```bash
cd okey
npm ci
npm run dev        # http://localhost:5173 (derlemeden, canlı modüller)
npm test           # 204 test: kural motoru, botlar, çözücü, yerleşim, ad filtresi, parite
npm run build      # dist/okey-oyunu.html (~4 MB, uygulama + tarayıcı), dist/live.html
```

- Kaynak: vanilla ES modülleri + three.js. esbuild her şeyi **tek bir HTML dosyasına** gömer (yazı tipleri, modeller, CSS dahil).
- `dist/live.html` dosyasında doctype yok (önizleme için). Bağımsız açarken başına
  `<!doctype html><meta charset="utf-8">` ekleyin.
- CSS sırası `tools/build.mjs` içindeki `STYLES` listesindedir:
  `[... 'play', 'rewards', 'result', 'bazaar', 'rotate']`. Yeni stil dosyası eklerseniz hem oraya hem `index.html` içine bağlantı ekleyin.

## 3. Bitmiş aşamalar

| Aşama | İçerik |
| --- | --- |
| 1 | Kaynağın depoya alınması, mobil düzeltmeler, eski motorla parite testleri |
| 2 | Kahvehane müzik motoru (ud, kanun, ney, def; makamlar), masa düzeni, animasyonlar, botlar |
| 3 | XP ve seviyeler, unvanlar, avatar çerçeveleri, kutlama efektleri, taş takımları, Çarşı (ödüllü reklam), seviye atlama ekranı, yeni el sonu ekranı, kullanıcı adı ve küfür filtresi, 16 avatar, İstanbul illüstrasyonları |

### Aşama 3 ayrıntıları (bağlayıcı kararlar)

- **Seviye eğrisi:** `xpForNext(L) = 150 + 90·(L−1)` (`src/meta/profile.js`). Seviye 30 için yaklaşık 40.900 XP gerekir.
  Bilinçli olarak ne iki günde biten ne de aylar süren bir eğri.
- **Katalog:** `src/meta/progression.js`. Unvanlar Çaylak → Paşa; seviye ve Çarşı çerçeveleri; 12 kutlama efekti;
  taş takımları ivory / çini / ebru / yağlı boya.
- **Reklam kuralları (kesin):** ödül **yalnız** reklam sonuna kadar izlenip `rewarded === true` dönerse verilir.
  Hata, reklam bulunamaması ya da yarıda kapatma ödül vermez. Öğe başına 5, 6 ya da 7 reklam gerekir.
  `AD_RULES = { cooldownMs: 180000, dailyCap: 12, retryMs: 45000 }` (reklam ağını yormamak için bekleme süresi).
- **Çip fiyatları** şimdilik "yakında" olarak gösteriliyor. Çevrim içi aşamayla açılacak.
- **Taş önizlemeleri** gerçek oyundaki gibi: bir sırt yüzü + bir ön yüz (`src/render3d/tile-preview.js`).
- **Kullanıcı adı filtresi:** `src/meta/name-filter.js` (saf işlev, sunucuda da aynen kullanılacak). Türkçe harf eşleme, rakam/simge
  hileleri, araya konan ayırıcılar, uzatılan harfler, noktasız ı ("amına" engellenir, "Amina" geçer), sahte yetkili adları.
  Testler: `tests/name-filter.test.mjs`.
- **El sonu ekranı** (`src/app/result.js`) iki sayfalıdır: 1) portre, başlık, XP ve el; 2) puan tablosu ve XP halkası.
  5,2 saniye sonra kendiliğinden ikinci sayfaya geçer. Satırlar yer değiştirmez (çakışma olmasın diye); sıra değişimi ▲▼ ile gösterilir.

## 4. Korunması gereken sözleşmeler (uygulama kabuğu bunlara bağlı)

- `window.__okey` (`settings`, `profile`, `audio`, `ui`, `ctl`), `window.__menu`, `window.__okeyReplayIntro()`
- `header.h4-top` ve `.h4-ic` (uygulama çıkış düğmesini buraya ekler)
- `window.PatiOkeyHost`, `window.ReactNativeWebView`
- El sonu ekranında `.is-result` sınıfı, "Yeni oyun" düğme adı; düğme sayıları: maç sonu 2, el sonu 3
- **Ödüllü reklam köprüsü** (`src/app/ads.js`):
  1. `window.PatiOkeyHost.showRewardedAd({ placement })` → `Promise<boolean | { rewarded: boolean }>`, ya da
  2. Oyun `ReactNativeWebView.postMessage({ type: 'OKEY_REWARDED_AD_REQUEST', id, placement })` gönderir; uygulama
     `window.__okeyAdResult(id, rewarded)` ya da `postMessage({ type: 'OKEY_REWARDED_AD_RESULT', id, rewarded })` ile döner.
  - `rewarded` değeri tam olarak `true` olmalıdır. İkisi de yoksa açıkça "TEST REKLAMI" yazan bir demo pencere açılır.

## 5. Kalan adımlar

### 5.1 Uygulama deposunda test güncellemesi (zorunlu)

Uygulama deposundaki (sanane-main) mobil testin `checkLayout` el sonu yerleşim denetimleri eski tek sayfalık ekranı bekliyor
(`.sheet`, `.result__row`, kaydırma yok). Yeni ekran iki sayfalı (`.rs3`). `.is-result` ve düğme sayıları korundu;
yalnız yerleşim denetimlerinin yeni yapıya göre güncellenmesi gerekiyor.

### 5.2 Aşama 4: çevrim içi oyun

- Odalar, arkadaş daveti, çipli masalar, sıralama tabloları.
- Sunucu: **Cloudflare Workers + Durable Objects** (her masa bir Durable Object) + **D1** (profil, envanter, sıralama).
- Kimlik: **Supabase Auth**. İstemci Supabase JWT alır; Worker bu JWT'yi doğrular.
- Kural motoru `src/game/` saf mantıktır; sunucuda aynen çalıştırılıp hamleler sunucuda doğrulanmalı (hile önleme).
- Profil verisi hesaba hazır: `profile.snapshot()` / `profile.adopt()` (`src/meta/profile.js`). Ad filtresi sunucuda da çalıştırılmalı.
- Çip fiyatları ("yakında") bu aşamada etkinleşir.

### 5.3 Son teslim

Zip + README + kullanıcının yerel ajanı (sanane-main) için bir talimat metni. Talimat 5.1'deki test güncellemesini ve
4. bölümdeki reklam köprüsü sözleşmesini mutlaka içermeli.

## 6. Güvenlik kuralları (kesin)

- Token, anahtar ya da parola **asla** sohbete yapıştırılmamalı, istenmemeli.
- Kimlik bilgileri yalnız ortam değişkenleriyle verilir: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`.
- Supabase **service_role** anahtarı kullanılmaz.
- `.env`, `.dev.vars` gibi gizli dosyalar zip'lere, raporlara ya da commit'lere girmez.
- Canlıya alma (deploy) işini kullanıcının kendi makinesindeki yerel ajan, kendi anahtarlarıyla yapar.

## 7. Dikkat edilecekler

- Profil v2 kayıt anahtarı: `patisever.profile.v1` (içinde `v: 2`), ayarlar: `patisever.settings.v1`.
- Çerçeveler tuvalde prosedürel boyanır (`src/render3d/tile-themes/frames.js`) ve IndexedDB'de önbelleğe alınır
  (sürüm anahtarı `VER = 'fr2'`). Çerçeve çizimini değiştirirseniz `VER` değerini artırın, yoksa eski görsel önbellekten gelir.
- Efektler: `src/ui/effects.js` (`Celebration`), avatarlar: `src/ui/avatars.js` (16 katmanlı SVG karakter),
  illüstrasyonlar: `src/ui/illustrations.js`.
- El sonu ekranı açıkken 3B sahne `stage.setSuspended(true)` ile durdurulur (zayıf telefonlarda akıcılık için).
- Görsel değişikliklerden sonra mutlaka gerçek ekran görüntüsü alıp kendiniz eleştirin. Testlerin geçmesi tek başına yeterli değildir.
