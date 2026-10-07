# Gündönümü: mağazaya çıkış kurulumu

Oyun tek bir HTML dosyasıdır (`Gundonumu.html`). İçinde tüm kod, yazı tipleri ve
Three.js bulunur, internet gerektirmez. Google Play ve App Store'a çıkmak için bu
dosyayı bir **uygulama kabuğuna** koymak gerekir. Burada Capacitor anlatılıyor.

Vibe coding aracına şunu söylemen yeterli:

> "docs/YAYIN_KURULUMU.md dosyasına göre Gündönümü'nü Capacitor ile Android ve iOS
> uygulamasına çevir. Paket adı: com.ADIN.gundonumu"

---

## 1. Tam ekran: oyunun kendi tarafı (hazır)

- **Tarayıcıda (Android Chrome, iPad Safari):** Dokunmatik cihazda ilk dokunuşta oyun
  tam ekrana geçer. Durum çubuğu (saat, pil) ve alttaki gezinme tuşları gizlenir.
  Oyuncu geri hareketiyle çıkarsa bir sonraki dokunuşta yeniden girer.
- **Ayarlar → Tam ekran:** Oyuncu bunu kapatabilir. Tarayıcı tam ekranı desteklemiyorsa
  bu satır hiç görünmez.
- **iPhone Safari:** Apple, iPhone'da web sayfasının tam ekrana geçmesine izin vermez.
  Bu yüzden iPhone'da çubukları ancak mağaza uygulaması (kabuk) gizleyebilir.
- **Kabuk içinde:** Capacitor algılanınca oyun kendi tam ekran isteğini yapmaz. Çubukları
  aşağıdaki yerel kod gizler. Capacitor dışında bir kabuk kullanıyorsan oyundan önce
  `window.GUNDONUMU_NATIVE = true` tanımla.

---

## 2. Capacitor projesini kurmak

```bash
npm i @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap init "Gündönümü" com.ADIN.gundonumu --web-dir www
mkdir -p www && cp Gundonumu.html www/index.html
npx cap add android
npx cap add ios
npx cap sync
```

Oyunu her yeniden derlediğinde (`python3 scripts/build_game.py`) şunları çalıştır:

```bash
cp Gundonumu.html www/index.html
npx cap sync
```

---

## 3. Android: durum ve gezinme çubuğunu gizlemek (immersive mod)

`android/app/src/main/java/com/ADIN/gundonumu/MainActivity.java` dosyasının tamamı:

```java
package com.ADIN.gundonumu;

import android.os.Bundle;
import android.webkit.WebView;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {
  private String safeJs = null;

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    hideSystemBars();

    // Kamera deliği / çentik payını oyuna bildir (bkz. aşağıdaki not)
    WebView w = getBridge().getWebView();
    ViewCompat.setOnApplyWindowInsetsListener(w, (v, insets) -> {
      Insets cut = insets.getInsets(WindowInsetsCompat.Type.displayCutout());
      float d = getResources().getDisplayMetrics().density;
      safeJs = String.format(java.util.Locale.US,
        "window.gdSetSafe&&gdSetSafe({top:%d,bottom:%d,left:%d,right:%d})",
        Math.round(cut.top / d), Math.round(cut.bottom / d), Math.round(cut.left / d), Math.round(cut.right / d));
      pushSafe();
      return ViewCompat.onApplyWindowInsets(v, insets);
    });
    getBridge().addWebViewListener(new WebViewListener() {
      @Override public void onPageLoaded(WebView webView) { pushSafe(); }
    });
  }

  // Bildirim paneli ya da reklam kapanınca çubuklar geri gelir: odak dönünce yeniden gizle
  @Override
  public void onWindowFocusChanged(boolean hasFocus) {
    super.onWindowFocusChanged(hasFocus);
    if (hasFocus) hideSystemBars();
  }

  private void hideSystemBars() {
    WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
    WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
    c.hide(WindowInsetsCompat.Type.systemBars());
    // Kenardan kaydırınca çubuklar kısa süre görünür, sonra kendiliğinden kaybolur
    c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
  }

  private void pushSafe() {
    if (safeJs == null || getBridge() == null) return;
    WebView w = getBridge().getWebView();
    w.post(() -> w.evaluateJavascript(safeJs, null));
  }
}
```

**Çentik payı hakkında:** Oyunun arayüzü `env(safe-area-inset-*)` değerlerine göre
kenarlardan içeri çekilir. Bazı Android WebView sürümleri bu değeri 0 bildirir; o zaman
üstteki düğmeler kamera deliğinin altına girebilir. Yukarıdaki kod kesik payını
`gdSetSafe({ top, bottom, left, right })` ile oyuna bildirir (CSS piksel). Oyun, WebView'in
bildirdiği değerle bu değerden büyük olanı kullanır. Kamera delikli bir telefonda mutlaka dene.

---

## 4. iOS: durum çubuğunu gizlemek

iPhone'da durum çubuğu gizlenebilir. Alttaki ana ekran çizgisi tamamen kaldırılamaz,
ama birkaç saniye dokunulmayınca soluklaşır. Ayrıca kenardan yanlışlıkla kaydırınca
oyundan çıkılmaz, ilk kaydırma oyuna gider.

`ios/App/App/GameViewController.swift` dosyasını oluştur:

```swift
import UIKit
import Capacitor

class GameViewController: CAPBridgeViewController {
  override var prefersStatusBarHidden: Bool { true }
  override var prefersHomeIndicatorAutoHidden: Bool { true }
  override var preferredScreenEdgesDeferringSystemGestures: UIRectEdge { .all }
}
```

Sonra `ios/App/App/Base.lproj/Main.storyboard` içinde Bridge View Controller'ın
**Custom Class** alanını `GameViewController` yap (Xcode → Identity Inspector).

iPhone'da çentik ve Dynamic Island payını WKWebView doğru bildirir. Ek bir şey gerekmez.

---

## 5. Kayıtlar

İlerleme `localStorage` içinde tutulur. Android'de kalıcıdır. iOS, cihazın depolama
alanı çok azaldığında WebView verisini silebilir. Daha güvenli olması için ileride
`@capacitor/preferences` eklentisine yedeklemek önerilir. `src/10_boot.js` içindeki
`Save.save` ve `Save.load` tek giriş noktasıdır.

---

## 6. Mağazaya çıkmadan önce kontrol listesi

**Her iki mağaza**
- [ ] Uygulama simgesi (1024×1024 kaynak), açılış ekranı (`@capacitor/assets` ile üretilebilir)
- [ ] Mağaza ekran görüntüleri (telefon + tablet), kısa ve uzun açıklama
- [ ] Gizlilik politikası sayfası (reklam olduğu için zorunlu)
- [ ] Reklamlar: `docs/REKLAM_KURULUMU.md` (gerçek kimlikler, GDPR/UMP onayı, `app-ads.txt`)
- [ ] Gerçek cihazda deneme: en az bir düşük seviye Android, bir kamera delikli Android,
      bir iPhone, bir tablet. Performans, ses, tam ekran, çentik payı, kayıt.

**Google Play**
- [ ] Hedef API seviyesi Play'in güncel şartını karşılıyor (Android Studio'da `targetSdkVersion`)
- [ ] İmzalı AAB (`./gradlew bundleRelease`), yükleme anahtarı güvenli yerde
- [ ] Veri güvenliği formu, reklam beyanı, içerik derecelendirmesi (IARC), hedef kitle
- [ ] Yeni kişisel geliştirici hesabıysa kapalı test şartı (belirli sayıda test kullanıcısı,
      belirli gün sayısı) tamamlandı. Güncel şartı Play Console'da kontrol et.

**App Store**
- [ ] Apple Developer Program üyeliği, Xcode ile imzalama
- [ ] App Privacy (gizlilik etiketleri), yaş derecelendirmesi
- [ ] Reklam izleme varsa App Tracking Transparency izni
