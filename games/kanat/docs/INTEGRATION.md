# KANAT — Mobil uygulamaya entegrasyon

Bu belge KANAT'ı bir native uygulamanın içine WebView ile gömmek için gereken her şeyi anlatır. Köprü sözleşmesi (§7.2), performans motoru (§5) ve ayarlar ekranının yapısı **3 oyunda birebir aynıdır**. Uygulama tarafında tek bir adaptör yazmanız yeterli.

- Köprü kaynağı: `src/bridge/GameBridge.ts`
- Canlı test sayfası: `dist/web/host-demo.html`. Oyunu iframe'de açar, tüm mesajları loglar, her komutun butonu vardır.
- E2E kanıtı: `node tests/e2e/run-all.mjs bridge`. Her mesaj tipi gidip gelir.

---

## 1. Hangi çıktıyı kullanmalı?

| Çıktı | Ne zaman | Not |
|---|---|---|
| `dist/web/` (**önerilen**) | (a) Statik bir HTTPS host'a koyup URL ile açmak. (b) Uygulama paketine gömüp yerel bir şema veya sunucuyla açmak. | Çok dosyalı, göreli yollu, hash'li. Hiçbir CDN'e bağlı değil, tamamen offline çalışır. |
| `dist/single/kanat.html` | Tek dosya isteyen durumlar. `file://` ile de açılır. | Çalışma zamanı verisi HTML'e base64 olarak gömülüdür. Taşan dünya paketleri yanındaki `packs/` klasöründedir (§1.1). |

**`file://` uyarısı:** `dist/web` dosyalarını `file://` ile açmayın. Chromium ve WebKit `file://` üzerinden `fetch`, WASM ve KTX2 yüklemeyi engeller. Bu yüzden Android'de `WebViewAssetLoader`, iOS'ta `WKURLSchemeHandler` ya da Flutter'da `InAppLocalhostServer` kullanın. `dist/single/kanat.html` ise `file://` için tasarlandı:
- Gömülü dosyalar bir `fetch` köprüsünden servis edilir.
- `packs/*.js` klasik `<script>` olarak yüklenir. `file://` bunu engellemez.

### 1.1 Tek dosya ve `packs/`
- Hedef: `kanat.html` ≤ 25 MB (25.000.000 bayt).
- Build sırasında `tools/gen-single-pack.ts`, `public/` altındaki her çalışma zamanı dosyasını (dünyalar, fontlar, varsa basis transcoder) toplar. Ardından öncelik sırasıyla HTML'e gömer: ortak dosyalar, fontlar, `kapadokya` (ana mod), sonra diğer dünyalar.
- Bütçeyi aşan **dünyalar bütün hâlinde** `dist/single/packs/kanat-pack-N.js` dosyalarına taşar. Bir dünya iki dosyaya bölünmez.
- **`packs/` klasörünü `kanat.html` ile aynı dizinde tutun.** Bu dosyalar yalnızca o dünya açılırken yüklenir.
- Hangi dünyanın nerede olduğu build çıktısında yazar: `[kanat-pack] …` satırı ve `dist/single-pack-report.json`.
- SÜRÜ.io arazi verisi kullanmaz, bu yüzden her zaman tek dosyanın içindedir. Ana mod ve en az bir ek mod tek dosyadadır.

---

## 2. Köprü protokolü (özet)

**Zarf** (her iki yönde JSON string):

```json
{ "v": 1, "game": "kanat", "type": "<tip>", "id": "<opsiyonel istek id>", "payload": { } }
```

**Oyun → host taşıyıcıları.** Oyun bunları sırayla dener ve ilk bulduğunu kullanır:
1. `window.ReactNativeWebView.postMessage`
2. `window.webkit.messageHandlers.gameBridge.postMessage`
3. `window.AndroidGameBridge.postMessage` (`@JavascriptInterface`)
4. `window.GameBridgeChannel.postMessage` (Flutter `JavaScriptChannel`)
5. `window.flutter_inappwebview.callHandler('gameBridge', json)`
6. `window.parent.postMessage(json, '*')` (iframe)

Hiçbiri yoksa oyun standalone çalışır: köprü sessizce hiçbir şey yapmaz.

**Host → oyun** için üç yol var:
- `window.GameBridge.receive(jsonString)`
- `message` olayı. `window` ve `document` dinlenir; RN Android'de olay `document`'e gelir.
- URL parametreleri.

**URL parametreleri:** `?lang=tr|en&quality=auto|ultra|high|medium|low&mode=<id>&muted=0|1&safeTop=&safeBottom=&safeLeft=&safeRight=`. `test=1` yalnızca otomasyon içindir.

### 2.1 Oyun → host olayları

| `type` | `payload` | Ne zaman |
|---|---|---|
| `ready` | `{version, modes[], capabilities}` | İlk etkileşimli ekran (menü) hazır. **Komut göndermeden önce bunu bekleyin.** |
| `loading` | `{progress: 0..1}` | Boot başında `0`, yükleme boyunca ara değerler, en sonda `1`. |
| `started` | `{mode}` | Bir mod veya uçuş başladı. |
| `ended` | `{mode, score, stars, durationSec, result}` | Uçuş, tur veya düello bitti. |
| `haptic` | `{pattern}` | `"light"`, `"medium"`, `"heavy"`, `"success"`, `"warning"`, `"error"` ya da ms dizisi `[titreşim, ara, titreşim, …]`. |
| `share` | `{text, imageDataUrl?, videoBlobUrl?, mimeType?}` | Paylaşım kartı veya klip. |
| `analytics` | `{name, params}` | Yalnızca host'a gider. Oyunda üçüncü taraf SDK yoktur. |
| `storage:set` | `{key, value}` | `value` bir JSON **string**'dir. Olduğu gibi saklayın. |
| `storage:get` | `{key, id}` | Aynı `id` ile `storage:value` gönderin. Zarfın `id` alanı da aynıdır. |
| `exit` | `{}` | Oyuncu çıkmak istedi: Çıkış butonu, ya da `back` geldiğinde kapatılacak katman yoktu. |
| `perf` | `{tier, fpsP50, fpsP90}` | Kademe değişince ve oyun sürerken 30 saniyede bir. |
| `error` | `{message, fatal}` | Yakalanmamış hatalar (`window.onerror`, `unhandledrejection`). |

### 2.2 Host → oyun komutları

| `type` | `payload` | Oyunun davranışı |
|---|---|---|
| `pause` | `{}` | Simülasyon, rAF ve ses durur. Uygulama arka plana geçerken gönderin. |
| `resume` | `{}` | Oyun devam eder. Uçuş sırasındaysa "Devam" katmanı çıkar; oyuncu arka plandayken ölmez. |
| `mute` | `{muted}` | Host sessizliği. Oyuncunun kendi ses ayarından bağımsızdır; ikisinden biri açıksa ses kapalıdır. |
| `setLocale` | `{lang}` | `tr` veya `en`. Kalıcı ayara yazılır. |
| `setSafeArea` | `{top, right, bottom, left}` | CSS px. `env(safe-area-inset-*)` ile birleştirilir; büyük olan geçerlidir. |
| `setQuality` | `{tier}` | `auto`, `ultra`, `high`, `medium` veya `low`. Ayarlar ekranındaki Grafik seçimiyle aynıdır. |
| `storage:value` | `{id, value}` | `storage:get` cevabı. Kayıt yoksa `value: null`. |
| `setProfile` | `{displayName?, avatarUrl?}` | Oyuncu adı ve avatarı (hayalet kartı vb.). |
| `back` | `{}` | Android geri tuşu. En üstteki katman kapanır (ayarlar, duraklat menüsü, modal). Uçuş sırasında duraklat menüsü açılır. Kapatılacak bir şey yoksa oyun `exit` gönderir. |

### 2.3 Depolama sözleşmesi
- Host `storage:get`'e **800 ms içinde** cevap vermezse oyun o oturum boyunca yalnızca kendi `localStorage` önbelleğini kullanır. `storage:set` göndermeye yine de devam eder.
- Host `null` döner ama önbellekte veri varsa, örneğin uygulama verisi silinmişse, oyun önbellekteki değeri host'a geri yazar.
- Anahtarlar:
  - `kanat.settings`: ayarlar, `v: 1`.
  - `kanat.save`: ilerleme, `save.v1`.
  - `kanat.perf.profile.v1` cihaza özeldir. Yalnızca yerelde tutulur, host'a gönderilmez.
- Değerler opaktır. Şemaya dokunmayın; migration'ları oyun yapar.

---

## 3. Platform kodları (kopyala-yapıştır)

Aşağıdaki örneklerde `GAME_URL` iki biçimden biri olabilir:
- Paketlenmiş `dist/web` adresi, ör. `https://appassets.androidplatform.net/assets/kanat/index.html`.
- Uzak bir HTTPS adresi.

### 3.1 React Native (`react-native-webview`)

```tsx
import React, { useRef, useCallback } from 'react';
import { BackHandler, AppState, Platform } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics'; // veya react-native-haptic-feedback

type Envelope = { v: 1; game: string; type: string; id?: string; payload: any };

export function KanatScreen({ onExit }: { onExit: () => void }) {
  const ref = useRef<WebView>(null);
  const ready = useRef(false);

  const send = useCallback((type: string, payload: object = {}, id?: string) => {
    const env: Envelope = { v: 1, game: 'kanat', type, payload, ...(id ? { id } : {}) };
    // postMessage → oyunda 'message' olayı (iOS: window, Android: document — ikisi de dinleniyor)
    ref.current?.postMessage(JSON.stringify(env));
  }, []);

  const onMessage = useCallback(async (e: WebViewMessageEvent) => {
    const msg: Envelope = JSON.parse(e.nativeEvent.data);
    if (msg.v !== 1) return;
    const p = msg.payload ?? {};
    switch (msg.type) {
      case 'ready': ready.current = true; break;
      case 'storage:get': {
        const value = await AsyncStorage.getItem(p.key);
        send('storage:value', { id: p.id, value }, p.id);
        break;
      }
      case 'storage:set': await AsyncStorage.setItem(p.key, p.value); break;
      case 'haptic': playHaptic(p.pattern); break;
      case 'share': /* Share.open({ message: p.text, url: p.imageDataUrl }) */ break;
      case 'exit': onExit(); break;
    }
  }, [send, onExit]);

  React.useEffect(() => {
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!ready.current) return false;
      send('back');          // oyun katman kapatır ya da 'exit' gönderir
      return true;
    });
    const app = AppState.addEventListener('change', (s) => send(s === 'active' ? 'resume' : 'pause'));
    return () => { back.remove(); app.remove(); };
  }, [send]);

  return (
    <WebView
      ref={ref}
      source={{ uri: GAME_URL + '?lang=tr' }}
      originWhitelist={['*']}
      onMessage={onMessage}
      javaScriptEnabled
      domStorageEnabled
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      bounces={false}
      overScrollMode="never"
      setSupportMultipleWindows={false}
      allowFileAccess={false}
      androidLayerType="hardware"
      contentInsetAdjustmentBehavior="never"
      style={{ flex: 1, backgroundColor: '#0e141c' }}
    />
  );
}

function playHaptic(p: string | number[]) {
  if (Array.isArray(p)) return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  const map: Record<string, () => Promise<void>> = {
    light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
    medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
    heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
    success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
    error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  };
  map[p]?.();
}
```

`injectJavaScript` de kullanılabilir: `ref.current?.injectJavaScript(\`window.GameBridge && window.GameBridge.receive(${JSON.stringify(JSON.stringify(env))}); true;\`)`.

### 3.2 Flutter — `webview_flutter` (JavaScriptChannel)

```dart
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';

class KanatPage extends StatefulWidget {
  const KanatPage({super.key});
  @override
  State<KanatPage> createState() => _KanatPageState();
}

class _KanatPageState extends State<KanatPage> with WidgetsBindingObserver {
  late final WebViewController _c;
  bool _ready = false;

  void _send(String type, [Map<String, dynamic> payload = const {}, String? id]) {
    final env = {'v': 1, 'game': 'kanat', 'type': type, 'payload': payload, if (id != null) 'id': id};
    // jsonEncode iki kez: JS string literal'i içinde JSON string
    _c.runJavaScript('window.GameBridge && window.GameBridge.receive(${jsonEncode(jsonEncode(env))});');
  }

  Future<void> _onMessage(JavaScriptMessage m) async {
    final msg = jsonDecode(m.message) as Map<String, dynamic>;
    final p = (msg['payload'] ?? {}) as Map<String, dynamic>;
    final prefs = await SharedPreferences.getInstance();
    switch (msg['type']) {
      case 'ready': _ready = true; break;
      case 'storage:get': _send('storage:value', {'id': p['id'], 'value': prefs.getString(p['key'])}, p['id']); break;
      case 'storage:set': await prefs.setString(p['key'], p['value']); break;
      case 'haptic': _haptic(p['pattern']); break;
      case 'exit': if (mounted) Navigator.of(context).maybePop(); break;
    }
  }

  void _haptic(dynamic p) {
    switch (p) {
      case 'light': HapticFeedback.lightImpact(); break;
      case 'medium': HapticFeedback.mediumImpact(); break;
      case 'heavy': case 'error': HapticFeedback.heavyImpact(); break;
      default: HapticFeedback.selectionClick();
    }
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _c = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF0E141C))
      ..addJavaScriptChannel('GameBridgeChannel', onMessageReceived: _onMessage)
      ..loadRequest(Uri.parse('$GAME_URL?lang=tr'));
    // iOS: WebKitWebViewControllerCreationParams(allowsInlineMediaPlayback: true, mediaTypesRequiringUserAction: const {})
    // Android: (c.platform as AndroidWebViewController).setMediaPlaybackRequiresUserGesture(false)
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState s) {
    if (!_ready) return;
    _send(s == AppLifecycleState.resumed ? 'resume' : 'pause');
  }

  @override
  Widget build(BuildContext context) => PopScope(
        canPop: false,
        onPopInvokedWithResult: (didPop, _) { if (!didPop) _send('back'); },
        child: Scaffold(backgroundColor: const Color(0xFF0E141C), body: WebViewWidget(controller: _c)),
      );
}
```

### 3.3 Flutter — `flutter_inappwebview` (callHandler + localhost sunucu)

`dist/web` içeriğini `assets/kanat/` altına koyun ve `pubspec.yaml`'da `assets/kanat/` ile alt klasörlerini listeleyin.

```dart
import 'dart:convert';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';

final localhost = InAppLocalhostServer(documentRoot: 'assets/kanat', port: 8080);

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await localhost.start(); // http://localhost:8080/index.html → fetch/WASM/KTX2 sorunsuz
  runApp(const MyApp());
}

InAppWebView(
  initialUrlRequest: URLRequest(url: WebUri('http://localhost:8080/index.html?lang=tr')),
  initialSettings: InAppWebViewSettings(
    javaScriptEnabled: true,
    mediaPlaybackRequiresUserGesture: false,
    allowsInlineMediaPlayback: true,
    disableContextMenu: true,
    supportZoom: false,
    transparentBackground: false,
    hardwareAcceleration: true,
  ),
  onWebViewCreated: (c) {
    controller = c;
    c.addJavaScriptHandler(handlerName: 'gameBridge', callback: (args) async {
      final msg = jsonDecode(args.first as String) as Map<String, dynamic>;
      final p = msg['payload'] as Map<String, dynamic>? ?? {};
      if (msg['type'] == 'storage:get') {
        // callHandler'ın dönüş değeri oyunda gelen mesaj olarak işlenir → senkron cevap verebilirsiniz
        final value = prefs.getString(p['key']);
        return jsonEncode({'v': 1, 'game': 'kanat', 'type': 'storage:value', 'id': p['id'], 'payload': {'id': p['id'], 'value': value}});
      }
      if (msg['type'] == 'storage:set') prefs.setString(p['key'], p['value']);
      if (msg['type'] == 'exit') Navigator.of(context).maybePop();
      return null;
    });
  },
);

// host → oyun
void send(String type, [Map<String, dynamic> payload = const {}]) {
  final env = jsonEncode({'v': 1, 'game': 'kanat', 'type': type, 'payload': payload});
  controller.evaluateJavascript(source: 'window.GameBridge && window.GameBridge.receive(${jsonEncode(env)});');
}
```

`flutter_inappwebview` köprüsü sayfa açıldıktan sonra hazır olur (`flutterInAppWebViewPlatformReady`). Oyun ilk 5 saniyede gönderdiği mesajları sıraya alır ve köprü gelince iletir. Böylece `ready` ve `loading` kaybolmaz.

### 3.4 Swift — `WKWebView`

```swift
import UIKit
import WebKit

final class KanatViewController: UIViewController, WKScriptMessageHandler, WKNavigationDelegate {
    private var webView: WKWebView!
    private var ready = false

    override func viewDidLoad() {
        super.viewDidLoad()
        let cfg = WKWebViewConfiguration()
        cfg.allowsInlineMediaPlayback = true
        cfg.mediaTypesRequiringUserActionForPlayback = []
        cfg.userContentController.add(self, name: "gameBridge")        // → window.webkit.messageHandlers.gameBridge
        cfg.setURLSchemeHandler(KanatSchemeHandler(), forURLScheme: "kanat") // paketlenmiş dist/web
        webView = WKWebView(frame: view.bounds, configuration: cfg)
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 0.055, green: 0.078, blue: 0.11, alpha: 1)
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.navigationDelegate = self
        if #available(iOS 16.4, *) { webView.isInspectable = true }
        view.addSubview(webView)
        webView.load(URLRequest(url: URL(string: "kanat://app/index.html?lang=tr")!))
        NotificationCenter.default.addObserver(self, selector: #selector(bg), name: UIApplication.willResignActiveNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(fg), name: UIApplication.didBecomeActiveNotification, object: nil)
    }

    @objc private func bg() { send("pause") }
    @objc private func fg() { send("resume") }

    override func viewSafeAreaInsetsDidChange() {
        super.viewSafeAreaInsetsDidChange()
        let i = view.safeAreaInsets
        send("setSafeArea", ["top": i.top, "right": i.right, "bottom": i.bottom, "left": i.left])
    }

    func send(_ type: String, _ payload: [String: Any] = [:], id: String? = nil) {
        var env: [String: Any] = ["v": 1, "game": "kanat", "type": type, "payload": payload]
        if let id { env["id"] = id }
        guard let data = try? JSONSerialization.data(withJSONObject: env),
              let json = String(data: data, encoding: .utf8),
              let lit = try? JSONSerialization.data(withJSONObject: [json]),
              let arr = String(data: lit, encoding: .utf8) else { return }
        // arr = ["{...}"] → JS: receive(["{...}"][0])
        webView.evaluateJavaScript("window.GameBridge && window.GameBridge.receive(\(arr)[0]);")
    }

    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let s = message.body as? String, let d = s.data(using: .utf8),
              let msg = try? JSONSerialization.jsonObject(with: d) as? [String: Any],
              let type = msg["type"] as? String else { return }
        let p = msg["payload"] as? [String: Any] ?? [:]
        switch type {
        case "ready": ready = true; viewSafeAreaInsetsDidChange()
        case "storage:get":
            let key = p["key"] as? String ?? ""
            send("storage:value", ["id": p["id"] ?? "", "value": UserDefaults.standard.string(forKey: key) as Any], id: p["id"] as? String)
        case "storage:set": UserDefaults.standard.set(p["value"] as? String, forKey: p["key"] as? String ?? "")
        case "haptic": Haptics.play(p["pattern"])
        case "exit": dismiss(animated: true)
        default: break
        }
    }

    // iOS WebContent süreci bellekten öldürülürse: yeniden yükle (oyun kaydı host/local'dan geri gelir)
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { webView.reload() }
}

/// dist/web klasörünü uygulama paketinden "kanat://app/..." olarak servis eder (fetch/WASM çalışır).
final class KanatSchemeHandler: NSObject, WKURLSchemeHandler {
    private let root = Bundle.main.resourceURL!.appendingPathComponent("kanat") // dist/web → "kanat" klasör referansı
    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url else { return }
        let path = url.path.isEmpty || url.path == "/" ? "/index.html" : url.path
        let file = root.appendingPathComponent(String(path.dropFirst()))
        guard let data = try? Data(contentsOf: file) else {
            task.didFailWithError(URLError(.fileDoesNotExist)); return
        }
        let mime: String = {
            switch file.pathExtension.lowercased() {
            case "html": return "text/html"; case "js": return "text/javascript"; case "css": return "text/css"
            case "json": return "application/json"; case "wasm": return "application/wasm"; case "png": return "image/png"
            case "webp": return "image/webp"; case "ktx2": return "image/ktx2"; case "woff2": return "font/woff2"
            default: return "application/octet-stream"
            }
        }()
        let resp = HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1",
                                   headerFields: ["Content-Type": mime, "Content-Length": "\(data.count)", "Access-Control-Allow-Origin": "*"])!
        task.didReceive(resp); task.didReceive(data); task.didFinish()
    }
    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}
}

enum Haptics {
    static func play(_ p: Any?) {
        switch p as? String {
        case "light": UIImpactFeedbackGenerator(style: .light).impactOccurred()
        case "medium": UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        case "heavy": UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
        case "success": UINotificationFeedbackGenerator().notificationOccurred(.success)
        case "warning": UINotificationFeedbackGenerator().notificationOccurred(.warning)
        case "error": UINotificationFeedbackGenerator().notificationOccurred(.error)
        default: // ms dizisi: Core Haptics ile ya da kısa darbe olarak
            UIImpactFeedbackGenerator(style: .soft).impactOccurred(intensity: 0.6)
        }
    }
}
```

### 3.5 Kotlin — `WebView` + `WebViewAssetLoader`

`dist/web` içeriğini `app/src/main/assets/kanat/` altına kopyalayın. Manifest'te `android:hardwareAccelerated="true"` olsun; varsayılan zaten budur.

```kotlin
import android.annotation.SuppressLint
import android.os.Bundle
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.webkit.*
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewClientCompat
import org.json.JSONObject

class KanatActivity : AppCompatActivity() {
    private lateinit var web: WebView
    private var ready = false

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val loader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()
        web = WebView(this).apply {
            setBackgroundColor(0xFF0E141C.toInt())
            setLayerType(WebView.LAYER_TYPE_HARDWARE, null)
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true                 // localStorage (önbellek/yedek) için şart
            settings.mediaPlaybackRequiresUserGesture = false
            settings.allowFileAccess = false
            settings.setSupportZoom(false)
            overScrollMode = WebView.OVER_SCROLL_NEVER
            webViewClient = object : WebViewClientCompat() {
                override fun shouldInterceptRequest(v: WebView, r: WebResourceRequest) = loader.shouldInterceptRequest(r.url)
                override fun onRenderProcessGone(v: WebView, d: RenderProcessGoneDetail): Boolean {
                    recreate(); return true                     // bellek baskısında GPU/renderer süreci öldü
                }
            }
            addJavascriptInterface(Bridge(), "AndroidGameBridge")   // → window.AndroidGameBridge.postMessage
        }
        setContentView(web)
        web.loadUrl("https://appassets.androidplatform.net/assets/kanat/index.html?lang=tr")
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() { if (ready) send("back") else finish() }
        })
    }

    fun send(type: String, payload: JSONObject = JSONObject(), id: String? = null) {
        val env = JSONObject().put("v", 1).put("game", "kanat").put("type", type).put("payload", payload)
        if (id != null) env.put("id", id)
        val js = "window.GameBridge && window.GameBridge.receive(${JSONObject.quote(env.toString())});"
        web.post { web.evaluateJavascript(js, null) }
    }

    inner class Bridge {
        @JavascriptInterface
        fun postMessage(json: String) {
            val msg = JSONObject(json)
            val p = msg.optJSONObject("payload") ?: JSONObject()
            val prefs = getSharedPreferences("kanat", MODE_PRIVATE)
            when (msg.optString("type")) {
                "ready" -> ready = true
                "storage:get" -> {
                    val v = prefs.getString(p.optString("key"), null)
                    send("storage:value", JSONObject().put("id", p.optString("id")).put("value", v ?: JSONObject.NULL), p.optString("id"))
                }
                "storage:set" -> prefs.edit().putString(p.optString("key"), p.optString("value")).apply()
                "haptic" -> haptic(p.opt("pattern"))
                "exit" -> runOnUiThread { finish() }
            }
        }
    }

    private fun haptic(pattern: Any?) {
        val vib = getSystemService(Vibrator::class.java) ?: return
        val effect = when (pattern) {
            "light" -> if (Build.VERSION.SDK_INT >= 29) VibrationEffect.createPredefined(VibrationEffect.EFFECT_TICK) else VibrationEffect.createOneShot(12, 80)
            "medium" -> if (Build.VERSION.SDK_INT >= 29) VibrationEffect.createPredefined(VibrationEffect.EFFECT_CLICK) else VibrationEffect.createOneShot(25, 160)
            "heavy" -> if (Build.VERSION.SDK_INT >= 29) VibrationEffect.createPredefined(VibrationEffect.EFFECT_HEAVY_CLICK) else VibrationEffect.createOneShot(50, 255)
            "success" -> VibrationEffect.createWaveform(longArrayOf(0, 20, 60, 40), intArrayOf(0, 160, 0, 255), -1)
            "warning" -> VibrationEffect.createWaveform(longArrayOf(0, 40, 80, 40), -1)
            "error" -> VibrationEffect.createWaveform(longArrayOf(0, 60, 60, 60, 60, 60), -1)
            is org.json.JSONArray -> VibrationEffect.createWaveform(LongArray(pattern.length() + 1) { if (it == 0) 0L else pattern.optLong(it - 1) }, -1)
            else -> return
        }
        vib.vibrate(effect)
    }

    override fun onPause() { send("pause"); super.onPause(); web.onPause() }
    override fun onResume() { super.onResume(); web.onResume(); send("resume") }
}
```

Bağımlılık: `implementation("androidx.webkit:webkit:1.12.1")`.

### 3.6 Web iframe

```html
<iframe id="kanat" src="https://oyunlar.example.com/kanat/index.html?lang=tr"
        allow="autoplay; fullscreen; clipboard-write; web-share; gyroscope; accelerometer"
        style="width:100%;height:100%;border:0"></iframe>
<script>
  const frame = document.getElementById('kanat');
  const GAME_ORIGIN = 'https://oyunlar.example.com';
  const send = (type, payload = {}, id) =>
    frame.contentWindow.postMessage(JSON.stringify({ v: 1, game: 'kanat', type, payload, ...(id ? { id } : {}) }), GAME_ORIGIN);
  window.addEventListener('message', (e) => {
    if (e.origin !== GAME_ORIGIN || e.source !== frame.contentWindow) return;   // origin doğrulaması
    const msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
    if (msg.v !== 1) return;
    if (msg.type === 'storage:get') send('storage:value', { id: msg.payload.id, value: localStorage.getItem('host.' + msg.payload.key) }, msg.payload.id);
    if (msg.type === 'storage:set') localStorage.setItem('host.' + msg.payload.key, msg.payload.value);
    if (msg.type === 'exit') history.back();
  });
  document.addEventListener('visibilitychange', () => send(document.hidden ? 'pause' : 'resume'));
</script>
```

Örnek host'un tamamı `host-demo.html` içindedir.

---

## 4. Bilinen tuzaklar

- **`file://`:** `dist/web` dosyalarını `file://` ile açmayın (§1). Asset loader, scheme handler ya da localhost sunucu kullanın. `dist/single/kanat.html` `file://` ile çalışır. `packs/` klasörü yanında olmalıdır.
- **Bellek:**
  - iOS'ta WebContent süreci yaklaşık 1,5 GB'ı aşarsa öldürülür; 4 GB'lık iPhone'larda sınır daha düşüktür. `webViewWebContentProcessDidTerminate` içinde `reload()` çağırın.
  - Android'de `onRenderProcessGone` içinde WebView'i yeniden kurun.
  - Oyun kaydı her yazımda atomiktir, yeniden yükleme ilerleme kaybettirmez.
  - Oyun mod ve dünya değişiminde GPU kaynaklarını `dispose` eder.
  - JS heap bütçesi 150 MB. Toplam süreç bütçesi Düşük kademede 400 MB, Ultra'da 700 MB.
- **Ses unlock:**
  - Ses asla kendiliğinden başlamaz. İlk dokunuşta AudioContext `resume` edilir.
  - iOS'ta `allowsInlineMediaPlayback = true` ve `mediaTypesRequiringUserActionForPlayback = []` olmalı.
  - Android'de `mediaPlaybackRequiresUserGesture = false` olmalı.
  - iOS ses kesintisinde (telefon araması) AudioContext `interrupted` olur. Uygulamadan `pause`/`resume` göndermek bu durumu temiz kapatır.
- **120 Hz:**
  - Oyun rAF hızını ölçer. 120 Hz panelde her 2. kareyi çizer ve 60 FPS'e kilitlenir; judder olmaz.
  - "Ultra 120 Hz" ayarı yalnızca Xiaomi 13 sınıfında görünür ve varsayılan kapalıdır. Açılırsa her kare çizilir.
  - iOS WKWebView rAF'ı varsayılan olarak 60 Hz'de tutar. ProMotion için Info.plist'e `CADisableMinimumFrameDurationOnPhone = YES` ekleyin. Oyun her iki durumda da doğru çalışır.
  - Android'de bazı üreticiler WebView'i 60 Hz'e sabitler; bu bir hata değildir.
- **Düşük Güç Modu (iOS):**
  - rAF 30 FPS'e kilitlenir. Oyun bunu bir kısıt olarak tanır: kare aralığı istikrarlı 33 ms ve CPU işi düşük.
  - Bu durumda kademe düşürülmez. Perf panelinde "Kısıt (LPM): EVET" yazar.
  - Android pil tasarrufu modları benzer davranabilir.
- **Arka plan:** `pause` gönderilmezse bile oyun `visibilitychange` ve `pagehide` ile durur. Yine de uygulama yaşam döngüsünde `pause`/`resume` gönderin, çünkü bazı WebView'ler görünürlük olayını geç verir.
- **Geri tuşu:** Android geri tuşunu her zaman `back` olarak gönderin. Oyunun kapatacak katmanı yoksa `exit` gelir; o zaman ekranı kapatın.
- **Yön:** Oyun dikey ve yatayda çalışır; tasarım önceliği dikeydir. Yön kilidi host'un işidir. Öneri: `portrait` kilit, isteğe bağlı olarak `sensorPortrait` ya da kullanıcı ayarıyla yatay. Yatayda "İki Başparmak" seçeneği açılır.
- **Jiroskop (iOS):** `DeviceOrientationEvent.requestPermission()` yalnızca bir kullanıcı hareketi içinde çağrılabilir. Oyun izni Ayarlar'da jiroskop açılırken ve ilk dokunuşta ister. WKWebView'de izin diyaloğu uygulamanın adıyla çıkar.
- **Güvenli alan:** `viewport-fit=cover` açıktır ve oyun `env(safe-area-inset-*)` değerlerini okur. Android WebView bu değerleri bazen 0 verir. O yüzden `setSafeArea` gönderin ya da `?safeTop=..&safeBottom=..` parametrelerini kullanın.
- **Zoom ve seçim:** Pinch-zoom, double-tap zoom, uzun basma menüsü, metin seçimi ve overscroll CSS ile kapalıdır. Native tarafta ayrıca `supportZoom(false)` ve `disableContextMenu` önerilir.
- **CSP:** Uzaktan barındırıyorsanız ve CSP kullanıyorsanız şunlara izin verin:
  - `script-src 'self' 'wasm-unsafe-eval'`
  - `worker-src blob:`
  - `img-src 'self' data: blob:`
  - `connect-src 'self' data: blob:`

  Tek dosya build'i satır içi script ve `data:`/`blob:` kullanır.

---

## 5. Boyut raporu

Ölçüm tarihi 2026-10-08, `npm run build` sonrası. Bu ölçüm entegrasyondan **önce** alındı: `src/main.ts` henüz platform iskeletiydi. Oyun kodu (three.js dahil) entegre edildiğinde yeniden ölçün ve bu tabloyu güncelleyin.

| Çıktı | Boyut |
|---|---|
| `dist/web` toplam | 20,70 MB |
| ├ `worlds/kapadokya` | 4,48 MB |
| ├ `worlds/likya` | 4,42 MB |
| ├ `worlds/karadeniz` | 3,71 MB |
| ├ `worlds/erciyes` | 3,37 MB |
| ├ `worlds/pamukkale` | 4,40 MB |
| ├ `fonts` | 0,32 MB |
| └ JS/HTML (iskelet) | < 0,02 MB |
| **İlk yük** (`index.html` + JS + fontlar + Kapadokya) | ≈ 4,8 MB (hedef ≤ 10 MB) |
| `dist/single/kanat.html` | 21,73 MB (bütçe 25,00 MB). Gzip ile 16,41 MB. |
| `dist/single/packs/kanat-pack-1.js` | 5,87 MB (Pamukkale) |

Dünya verileri arazi ajanı tarafından hâlâ güncelleniyor. Bu yüzden rakamlar build'den build'e birkaç MB oynayabilir.

Yeniden ölçmek için:

```bash
npm run build                                   # [kanat-pack] satırı tek dosya özetini basar
cat dist/single-pack-report.json                # grup grup: inline mı, hangi pack'te mi
du -sb dist/web dist/web/worlds/* dist/web/fonts dist/web/assets
node tools/gen-single-pack.ts public            # build almadan plan (dry run)
```

Oyun JS'i büyüdükçe tek dosya bütçesi otomatik olarak korunur. Sığmayan son dünya bütünüyle `packs/` klasörüne geçer. Bütçe aşılırsa build hata verir.

---

## 6. Haptik eşlemesi (native öneri)

| Köprü `pattern` | Oyundaki kullanım (§2.3) | iOS | Android |
|---|---|---|---|
| `light` | Sıyırma (12 ms), kapı | `UIImpactFeedbackGenerator(style: .light)` | `VibrationEffect.createPredefined(EFFECT_TICK)` (API 29+), ya da `createOneShot(12, 80)` |
| `medium` | Balon İlmeği (25 ms) | `UIImpactFeedbackGenerator(style: .medium)` | `EFFECT_CLICK`, ya da `createOneShot(25, 160)` |
| `heavy` | Paraşüt açılışı, çarpma (50–90 ms) | `UIImpactFeedbackGenerator(style: .heavy)` | `EFFECT_HEAVY_CLICK`, ya da `createOneShot(50, 255)` |
| `success` | Yıldız damgası, rekor | `UINotificationFeedbackGenerator().notificationOccurred(.success)` | `createWaveform([0,20,60,40], [0,160,0,255], -1)` |
| `warning` | Uçuş Yardımı "Az" çarpma uyarısı | `.warning` | `createWaveform([0,40,80,40], -1)` |
| `error` | Geçersiz düello kodu | `.error` | `createWaveform([0,60,60,60,60,60], -1)` |
| `[10,40,10]` vb. | Çarpan artışı ("çift"), termal tıkları | Core Haptics `CHHapticPattern` (transient olaylar), ya da `.soft` impact | `createWaveform(longArrayOf(0, …), -1)` |

Oyunun kendi kuralları:
- Toplam haptik saniyede en fazla 150 ms'dir (yorgunluk sınırı).
- Ayarlardaki "Az" seviyesi `heavy` → `medium` → `light` sırasıyla bir basamak hafifletir ve `light`'ı atlar.
- "Kapalı" seviyesi hiç mesaj göndermez.
- Host yoksa Android'de `navigator.vibrate` kullanılır; iOS'ta haptik yoktur.

---

## 7. İlk adım (kontrol listesi)

1. `npm ci && npm run build` → `dist/web` ve `dist/single` üretilir.
2. `npx vite preview --port 4173` → `http://localhost:4173/host-demo.html` sayfasında butonları deneyin ve logu izleyin.
3. Platform kodunu §3'ten alın. Önce `ready`, `storage:get/set`, `back` → `exit` ve `pause`/`resume` akışlarını bağlayın.
4. Gerçek cihazda `docs/CIHAZ_TEST_LISTESI.md` protokolünü uygulayın (15 dakika).
