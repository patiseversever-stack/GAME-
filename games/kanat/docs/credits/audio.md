# Ses ve müzik — emeği geçenler / lisans

**KANAT ve SÜRÜ.io'daki tüm sesler, müzikler ve ambiyanslar tamamen prosedüreldir:** oyunun kendi kaynak kodunda (`src/audio/**`) Web Audio API ve saf TypeScript sinyal işleme ile çalışma anında/yüklemede sentezlenir.

- Hiçbir ses kaydı, örnek (sample), loop paketi, ses bankası, MIDI dosyası veya üçüncü taraf müzik **kullanılmamıştır**. Dağıtılan pakette ses dosyası yoktur (bu nedenle `assets/manifest.json`'a ses kaydı gerekmez).
- Freesound, Sketchfab vb. giriş gerektiren kaynaklar ve CC-BY / CC-BY-SA / CC-BY-NC içerik kullanılmamıştır. CC0 kayıt da gerekmemiştir (martı, dalga, yağmur, gök gürültüsü dahil her şey sentezdir).
- Müzik motifleri KANAT için yazılmıştır. Hicaz, Uşşak, Hüseyni, Rast ve Kürdi makam dizileri yalnız **dizi/renk esintisi** olarak kullanılmıştır (müzik kuramı, kamu malı). Bilinen bir eserden melodi, ritim kalıbı veya düzenleme alıntılanmamıştır. Aksak ölçüler (7/8, 9/8) geleneksel ritim ailelerine genel bir göndermedir.
- Kullanılan algoritmalar kamuya açık ve serbesttir: Karplus–Strong telli çalgı sentezi (1983; ilgili patentlerin süresi çoktan doldu), RBJ "Audio EQ Cookbook" biquad filtreleri, Paul Kellet pembe gürültü filtresi, feedback-delay-network yankı, ITU-R BS.1770-4 ölçüm yöntemi (K-ağırlıklandırma, true peak).
- Ölçüm ve doğrulama araçları: Chromium (Playwright), ffmpeg (`volumedetect`, `ebur128`, `astats`) — yalnız geliştirme ortamında, ürüne girmez.

Lisans: ses kodu projenin kendi kodudur; ek atıf yükümlülüğü yoktur.
