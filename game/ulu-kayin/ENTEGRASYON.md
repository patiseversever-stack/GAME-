# Ulu Kayın: ana oyuna bağlama rehberi

Ulu Kayın, Gündönümü'nün ikinci modudur. Ana oyundan bağımsız yazıldı. Kendi tuvalini (canvas), çizicisini, arayüzünü ve sesini kendisi kurar. Ana oyunun koduna dokunmaz. Bağlamak için menüye bir buton koyup birkaç satır eklemek yeterlidir.

## Dosyalar

| Yol | Ne işe yarar |
|---|---|
| `src/` | Modun okunur kaynak kodu (ES modülleri, `three` paketini kullanır). Ana projeye kopyalanacak olan bu. |
| `dist/ulu-kayin.esm.js` | Aynı kodun tek dosyalık hâli; `three` içinde değildir, ana oyunun kendi `three` kopyasını kullanır. |
| `dist/UluKayin_Test.html` | Tek başına açılan test sayfası (her şey içinde, internetsiz çalışır). Telefonda denemek için. |
| `tools/shot.mjs`, `tools/sim.mjs` | Geliştirme araçları: ekran görüntüsü ve otomatik oynanış testi. |

Three.js sürümü ana oyunla aynıdır: **r170**.

## Bağlama (4 adım)

### 1. Kaynak kodu ana projeye kopyala

`game/ulu-kayin/src` klasörünü ana oyunun kaynaklarının yanına koy (örneğin `src/ulu-kayin/`). Ana oyun esbuild ile paketleniyorsa başka ayar gerekmez: `three` importları ana oyunun `three` paketine çözülür.

### 2. Menüye buton ekle

Gökyüzü haritasındaki mod düğmelerinin yanına:

```html
<button class="btn ghost tap" id="btnUluKayin">Ulu Kayın <small>Hayat Ağacı</small></button>
```

### 3. Modu aç ve kapat

```js
import { createUluKayin } from './ulu-kayin/index.js';

let uk = null;

async function openUluKayin() {
	window.__ukOpen = true; // ana döngü bunu görünce çizmeyi bırakır (4. adım)
	if (!uk) {
		uk = await createUluKayin({
			container: document.body,
			// Kayıt: ana oyunun kendi kaydına yaz (verilmezse localStorage kullanılır)
			store: {
				get: (k) => ($.data.uk || {})[k],
				set: (k, v) => {
					($.data.uk ||= {})[k] = v;
					$.save();
				},
			},
			hooks: {
				// Oyuncu "geri" dediğinde
				onExit: () => {
					uk.close();
					window.__ukOpen = false;
				},
				// Bölüm bitince kazanılan ışık tozu ana oyunun hesabına
				onReward: ({ level, stars, dust }) => {
					$.data.dust = ($.data.dust || 0) + dust;
					$.save();
				},
				// İsteğe bağlı: ana oyunun seslerini kullanmak için. true dönerse modun kendi sesi çalmaz.
				// Adlar: step, drop, dropLost, ui, win, fail, unlock
				sfx: (name) => false,
				// İsteğe bağlı: titreşim (true dönerse mod kendisi titretmez)
				haptic: (pattern) => false,
			},
		});
	}
	uk.open();
}

document.getElementById('btnUluKayin').addEventListener('click', openUluKayin);
```

### 4. Mod açıkken ana oyun çizmesin

Ana oyunun kare döngüsünün (`wr` fonksiyonu) en başına:

```js
if (window.__ukOpen) return; // Ulu Kayın açık: GPU'yu ona bırak
```

İki oyunun aynı anda çizmesi telefonu boşuna yorar. Ana oyunun müziği varsa mod açılırken kısılmalıdır.

## Notlar

- **Ayrı tuval:** Mod kendi `<canvas>`ını `z-index: 50` ile ekranın üstüne açar. `close()` gizler, `destroy()` tamamen boşaltır (GPU belleği dahil). Oyuncu uzun süre ana oyunda kalacaksa `destroy()` çağrılabilir. Bir sonraki açılış yeniden kurar (yaklaşık 1 saniye).
- **Yazı tipleri:** Arayüz `Cormorant Garamond` ve `Manrope` ailelerini kullanır. Ana oyunda zaten gömülü oldukları için ek bir şey gerekmez.
- **Kayıt anahtarları:** `progress` (bölümler, yıldızlar, ışık tozu), `settings` (ses, titreşim, grafik, pil), `perf` (cihaza özel otomatik kalite ayarı).
- **Kostüm:** Zifir'in kenar rengi `src/game/zifir.js` içinde `rim` seçeneğidir. Gardıroptaki renk bağlanmak istenirse `Zifir` oluşturulurken `rim` verilebilir.

## Akıcılık ve pil kuralları (neden kasmaz)

- Görüntü **tek geçişte** biter: ışık, gölge, sis, ton eşleme ve renk düzenleme her malzemenin kendi shader'ında yapılır. Ekrana sonradan "film efekti" geçişi uygulanmaz. Kenar yumuşatma donanımın kendi MSAA'sıyla yapılır.
- **Shader'lar açılışta derlenir.** Oyun sırasında hiçbir shader yeniden derlenmez, hiçbir render hedefi yeniden kurulmaz. Otomatik kalite yalnızca çözünürlük ölçeği ve kare hızı sınırıyla oynar.
- **Kare hızı ekran yenilemesine göre eşit aralıklıdır.** 120 Hz ekranda 60 kare çizilir; zayıf cihazda 90 Hz ekranda 45 kare. Kareler gecikirse önce çözünürlük kısılır, sonra 30 kareye geçilir. Bulunan ayar ekran kartına göre kaydedilir.
- **Pil koruma:** Pil %20'nin altına iner ve şarjda değilse otomatik olarak 30 kare ve düşük çözünürlük. Ayarlardan "Tasarruf" ya da "Performans" da seçilebilir.
- **Menüde 30 kare.** Duraklatma ve bitiş ekranlarında sahne donar, hiç çizim yapılmaz. Sekme gizlenince döngü durur.
- **Arayüzde bulanıklık efekti yok** (`backdrop-filter` kullanılmaz). Animasyonlar yalnızca `transform` ve `opacity` ile yapılır.
- **Ekran kartı tanıma** Realme, Oppo ve Xiaomi'de yaygın kartları (Mali-G52/G57/G68, Adreno 610-619, PowerVR GE8xxx) özel olarak tanır.
- Bir karede yaklaşık 35-45 çizim çağrısı ve yaklaşık 110 bin üçgen var. Gölge haritası tektir (düşük kademede 1024, diğerlerinde 2048).

## Test

- Telefonda: `dist/UluKayin_Test.html` dosyasını indirip tarayıcıda aç. Adres sonuna `?q=0`, `?q=1` ya da `?q=2` eklenirse kalite kademesi zorlanır (Düşük, Orta, Yüksek).
- Geliştirme:
  ```bash
  cd game/ulu-kayin
  npm install
  npm run build            # dist/ dosyalarını üretir
  node build.mjs --dev     # küçültmesiz, hata ayıklama için
  node tools/sim.mjs       # 8 bölümü üç farklı bot oyuncuyla oynatır
  node tools/shot.mjs görünümler.json çıktı-klasörü   # ekran görüntüsü
  ```
