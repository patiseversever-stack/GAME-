// Design rulings: every in-brief conflict (§2 GDD vs §4.G tech vs §9.G/§11.G acceptance) bound to ONE value.
// Mirrored as the "Çelişkiler ve kararlar" table in docs/GDD.md. `dataRef` names the data field that holds the
// chosen value; tests/unit/meta.test.ts cross-checks the numeric ones against the live data files.
// Precedence used (brief header): rules & balance → §2; algorithms → §4.G; plus one meta-rule: when a §9.G test
// or §11.G done-criterion names a concrete number, that measured number wins (tests may not be loosened).

export interface Ruling {
  id: string;
  topic: string;
  /** What each source says. */
  sources: readonly string[];
  chosen: string;
  rationale: string;
  dataRef?: string;
}

export const RULINGS: readonly Ruling[] = [
  // ------------------------------------------------------------------ KANAT
  {
    id: 'K-01',
    topic: 'Bırakınca otomatik düzelme zaman sabiti',
    sources: ['§2.2: yatış τ 0,6 s, burun 0,8 s', '§4.G.5: φ→0 ve C_L→C_trim, τ = 0,4 s'],
    chosen: 'τ = 0,4 s (her iki eksen), birinci derece yaklaşım + faz sönümü',
    rationale:
      '§2.2 tepki sayılarını "kesin model 4.G\'de" diyerek 4.G\'ye devrediyor; bırakma düzelmesi tepki modelinin parçası. Üstel yaklaşım sarsıntısız (yumuşak), 65° yatış 1,2 s\'de 3°\'ye iner; dokunmatikte "bırakmak her zaman güvenli" niyeti daha güçlü sağlanır. Flight ajanı bu değerle ayarladı.',
    dataRef: 'TUNING.control.tauRelease',
  },
  {
    id: 'K-02',
    topic: 'Yatış sınırı ve yalpa hızı',
    sources: ['§2.2: ±80°, 140°/s (tasarım hissi)', '§4.G.5: φ_hedef = sx/31·65°, ≤150°/s'],
    chosen: 'Yatış 65°, yalpa ≤150°/s; yunuslama ≤55°/s (§2.2, 4.G\'de karşılığı yok → sınır olarak)',
    rationale: '§2.2 bu satırı açıkça 4.G\'ye devrediyor. 65° ile 42 m/s\'de dönüş yarıçapı ≈ 84 m; Rota Kâşifi 104 m (60°) kısıtıyla güvenli payda.',
    dataRef: 'TUNING.control.bankMaxDeg',
  },
  {
    id: 'K-03',
    topic: 'Sıyırma (graze) mesafesi',
    sources: ['Brif başı + §2.3/§2.5: temassız d < 1,5 m, +250×Ç, nesne başına 1 s', '§4.G.6: d < 3 m yerel minimum, V > 140 km/s, güç (3−d)/3', '§1 FTUE: "2,5 m geçiş, SIYIRMA +250"'],
    chosen: 'd < 1,5 m; algılama §4.G (yerel minimum, V > 140 km/s, geçiş başına 1 olay, nesne başına 1 s); güç (1,5−d)/1,5; puan 250×Ç(d)',
    rationale:
      'Brif başındaki "Bilinen kararlar" bağlayıcı. FTUE\'deki ilk sıyırma betikli ~1,2 m geçişle yapılır (Rehber Rüzgâr d < 2 m\'de yalnız yumuşak iter, engellemez); açılır yazı gerçek değeri gösterir (peri bacasında 250×5 = +1.250).',
    dataRef: 'TUNING.score.grazeD',
  },
  {
    id: 'K-04',
    topic: 'Kapı halkası boyutu',
    sources: ['§2.10: "Kapı halka çapı: W1 14 m → W5 9 m"', '§4.G.7: gates[].radius (örnek 12 m)'],
    chosen: 'Değerler YARIÇAP: W1 14 · W2 12,75 · W3 11,5 · W4 10,25 · W5 9 m',
    rationale:
      'Tek başparmakla 150–230 km/s\'de 4,5 m yarıçaplı kapı (çap yorumu) dokunmatikte cezalandırıcı; Günün Rotası\'nda kapılar zorunlu (+2 s ceza). Kapının işi çizgiyi göstermek, zorluk yakınlıktan gelmeli. 4.G örneği (12 m) yarıçap yorumuyla tutarlı. Tam Yardım kapı mıknatısı yarıçapı %15 büyütür.',
    dataRef: 'WORLD_META[].gateRadius',
  },
  {
    id: 'K-05',
    topic: 'Kapadokya (W1) rüzgârı',
    sources: ['§2.10: rüzgâr W1 0 → W4–W5 4 m/s', '§4.G.7 world.json örneği: kapadokya wind 4 m/s; §4.G.5 yamaç kaldırması rüzgâra bağlı'],
    chosen: 'Oynanış rüzgârı = RouteDef.wind (W1 0 · W2 1,5 · W3 3 · W4 4 · W5 4 m/s). world.json rüzgârı yalnız görsel (bulut, bayrak, çimen); RouteDef.wind = 0 iken yamaç kaldırması da 0.',
    rationale: 'Yeni oyuncunun dünyasında sürüklenme olmamalı (§2.10 denge). Kapadokya\'nın enerjisi 3 termal + balon yüksekliğinden gelir.',
    dataRef: 'WORLD_META[].windSpeed',
  },
  {
    id: 'K-06',
    topic: 'Termal gücü ve boyutu',
    sources: ['§2.5: girişte +100, içeride +7 m/s', '§4.G.5: w = w0·e^(−(r/R)²), R 30–60 m, w0 4–8 m/s'],
    chosen: 'w0 = 7 m/s her dünyada (Gauss profili); zorluk yarıçapla: W1 55 · W2 50 · W3 45 · W4 40 · W5 35 m; sayı W1 3 · W2 2 · W3 2 · W4 1 · W5 1',
    rationale: '§2 değeri çekirdek kaldırma; §4.G profili algoritma. Dar termal = merkezlemesi zor = ileri dünyada beceri.',
    dataRef: 'WORLD_META[].thermalW0',
  },
  {
    id: 'K-07',
    topic: 'Hayalet/Düello kodu öneki ve uzunluğu',
    sources: ['§2.5/§2.8: KNT1- öneki, tasarım hedefi ≤ 600 karakter', '§4.G.8: "K1." + base64url(header + payload + crc32), 120 s uçuş ≤ 3.000', '§11.G: ≤ 3.000'],
    chosen: 'Kanonik biçim K1.<base64url> (§4.G); paylaşılan/görünen biçim KNT1-<etiket>-<gövde> (G214 / W1R3 / S1). Çözücü ikisini de kabul eder. Kabul sınırı ≤ 3.000, ≤ 600 tasarım hedefi ölçülüp raporlanır.',
    rationale: 'Paylaşım kartı biçimi §2.8\'de "birebir"; ikili biçim algoritma alanı (§4.G). Bitti kriteri 3.000.',
    dataRef: 'ghostCode.GHOST_PREFIX / GHOST_DISPLAY_PREFIX',
  },
  {
    id: 'K-08',
    topic: 'Yavaş Mod ve 🐢 işareti',
    sources: ['§2.2: Yavaş Mod yalnız Kariyer ve Serbest Uçuş', '§2.8: Günün Rotası kartında "Yavaş Mod ise 🐢"'],
    chosen: 'Günün Rotası ve Düello\'da Yavaş Mod kapalı; 🐢 yalnız Kariyer kartında görünür. 🛟 (yardım) her kartta.',
    rationale: 'Aynı rota-aynı koşul adaleti kural (§2.2). Kariyer\'de puan sim zamanıyla ölçüldüğü için yavaş mod yalnız işaretlenir.',
  },
  {
    id: 'K-09',
    topic: 'Rehber Rüzgâr / Uçuş Yardımı / yakınlık asistanı',
    sources: ['§2.9: Rehber Rüzgâr d < 2 m yumuşak itme, çarpma imkânsız', '§2.10: Tam = d < 2 m & kapanma > 8 m/s itme + 5 s\'de bir burun kaldırma + kapı mıknatısı %15', '§4.G.5: τc < 0,6 s → (1 − τc/0,6) düzeltme'],
    chosen: 'Rehber Rüzgâr = Tam Yardım + çarpma yerine sekme (W1 R1–R3 varsayılan açık). Tam = §4.G sürekli düzeltme + §2.10 itme/burun kaldırma/mıknatıs. Az = yalnız 1,0 s önceden uyarı.',
    rationale: 'Üç tanım aynı sistemin kademeleri; birleştirilince çelişki kalmaz. Bayrak hayalet koduna ve karta (🛟) yazılır.',
    dataRef: 'TUNING.assist',
  },
  {
    id: 'K-10',
    topic: 'İniş bölgesi ve hedef',
    sources: ['§2.2: hedef çevresinde ~250 m yarıçaplı silindir (paraşüt butonu, ⭐)', '§4.G.7: landing.radius 25'],
    chosen: 'landing.zoneRadius = 250 m (buton + ⭐); landing.radius = 25 m hedef diski görseli; bonus halkaları 2/5/10 m.',
    rationale: 'İki alan farklı şeyleri tanımlıyor; RouteDef ikisini de taşıyor.',
    dataRef: 'TUNING.canopy.zoneRadius',
  },
  {
    id: 'K-11',
    topic: 'Bölge İÇİNDE paraşüt açılmazsa (brifte boşluk)',
    sources: ['§2.2: yalnız bölge dışında 20 m altı → Acil Paraşüt → Yarım Uçuş'],
    chosen: 'Bölge içinde de 20 m\'de acil kanopi açılır; iniş geçerli (⭐ alınabilir), iniş bonusları yarıya iner, Cesur Açılış verilmez.',
    rationale: 'Ölüm/ani ceza yok ilkesi (§2.2); ödül yine de elle açılışı teşvik eder.',
  },
  {
    id: 'K-12',
    topic: 'Otomatik Paraşüt ve Cesur Açılış',
    sources: ['§2.2: Otomatik Paraşüt ideal yükseklikte açar, iniş bonusu yarıya', '§2.5: Cesur Açılış 60–90 m +300'],
    chosen: 'Otomatik açılış 75 m\'de olsa da Cesur Açılış bonusu ve görevi yalnız ELLE açılışta.',
    rationale: 'Cesaret ödülü oyuncu kararına bağlı olmalı.',
    dataRef: 'TUNING.canopy.autoOpenAGL',
  },
  {
    id: 'K-13',
    topic: '3 yıldız eşiği',
    sources: ['§2.5: ⭐⭐⭐ ≥ 0,85 × uzman bot', '§9.G: "3 yıldız eşiği ≤ uzman skoru × 0,95"'],
    chosen: '0,85 × uzman (⭐⭐ 0,50 ×). 9.G cümlesi doğrulama sınırıdır (0,85 ≤ 0,95 sağlanır), çelişki değil.',
    rationale: '§2 denge değeri.',
    dataRef: 'CAREER_STARS',
  },
  {
    id: 'K-14',
    topic: 'Takip kamerası FOV',
    sources: ['§2.4: dikey FOV portre 74°→86°, yatay 48°→58°', '§4.G.9: FOV 70° → 230 km/s\'de +12°'],
    chosen: '§2.4 değerleri (portre 74→86, yatay 48→58); +12° aralığı iki kaynakta da aynı.',
    rationale: 'Kamera dili oyun hissi (§2).',
  },
  {
    id: 'K-15',
    topic: 'Usta Görevi ödülleri',
    sources: ['§2.5: 60 görev, "her biri bir kozmetik açar"', '§2.7: toplam 20 desen + 12 palet + 10 iz = 42; kaynaklar rütbe ve kartpostal setleriyle paylaşılıyor', '§1: 2. gün kancası "Usta Görevleri\'nden yarım kalan desen"'],
    chosen: 'Her dünyanın R1\'inde her görev ayrı bir palet/iz açar (5×3 = 15: 9 palet + 6 iz). R2–R4\'te rotanın üç görevi birlikte o rotanın desenini örer (15 desen; ilerleme 1/3 → 3/3).',
    rationale: 'Her görev bir kozmetiğe bağlı kalır, 42 kozmetiğe sığar, §1\'deki "yarım kalan desen" kancası birebir oluşur; yeni dünyaya girişte (R1) anında ödül.',
    dataRef: 'ROUTE_META[].usta[].unlocks',
  },
  {
    id: 'K-16',
    topic: 'XP\'de yıldızların sayılması',
    sources: ['§2.7: XP = puan/1.000 + yıldız×200 + …'],
    chosen: 'Yalnız YENİ kazanılan yıldız 200 XP verir; Günün Rotası 500 XP günün ilk bitirişinde; tekrarlar yalnız puan/1.000.',
    rationale: 'Tekrar oynamayla 600 XP/90 s sömürüsü olmaz; brif formülü korunur.',
    dataRef: 'XP_RULES',
  },
  // ------------------------------------------------------------------ SÜRÜ.io
  {
    id: 'S-01',
    topic: 'Nefes',
    sources: ['§2.6: Sıkı −14/s, Geniş +22/s, 0\'da 25\'e kadar kilit', '§4.G.10: Sıkı −20/s, Geniş 0,5 s sonra +12/s, kilit 30'],
    chosen: '−14/s, +22/s (gecikmesiz), kilit 25',
    rationale: 'Denge §2. Kontrol "nefes ritmi": kısa bas-bırak ritmi ödüllendirilmeli, dolum gecikmesi ritmi cezalandırır.',
    dataRef: 'SURU.BREATH_DRAIN/BREATH_REGEN/BREATH_UNLOCK',
  },
  {
    id: 'S-02',
    topic: 'Lider hızı',
    sources: ['§2.6: Sıkı +%25, Geniş −%10, Yalnız +%30', '§4.G.10: temel 12 m/s, Sıkı ×1,3'],
    chosen: 'Temel 12 m/s; Sıkı ×1,25 (15 m/s), Geniş ×0,90 (10,8 m/s), Yalnız ×1,30 (5 s)',
    rationale: 'Çarpanlar denge (§2); temel hız yalnız 4.G\'de var.',
    dataRef: 'SURU.TIGHT_SPEED_MUL/WIDE_SPEED_MUL',
  },
  {
    id: 'S-03',
    topic: 'Lider dönüş hızı',
    sources: ['§2.6: ω = 140°/s × clamp(√(20/N), 0,35, 1)', '§4.G.10: ω = 3,0/√max(1, n/40) rad/s, alt 0,6'],
    chosen: '§2.6 formülü (N = takipçi + lider)',
    rationale: 'Kartopu freni bir denge değeri. 400 kuşta 49°/s.',
    dataRef: 'SURU.TURN_BASE/TURN_REF_N/TURN_MIN_F',
  },
  {
    id: 'S-04',
    topic: 'KUŞATMA geometrisi ve süresi',
    sources: ['§2.6: halka [6, 30] m, dilim ≥2 kuş ve pay ≥%70, ≥30 dilim 0,6 s', '§4.G.10: [max(4, 0,6·R_B), 35] m, ≥300°, B\'nin %70\'i içeride, 0,5 s', '§9.G-23/§11.G: 0,5 s tutma, 270° tetiklemez'],
    chosen: 'Halka [max(4, 0,6·R_B), 35] m, 36 dilim, ≥30 dolu dilim (≥300°), B kuşlarının ≥%70\'i A halkasının ortalama yarıçapı içinde, 0,5 s; kaskad 1,5 s. Dilim "dolu" eşiği sim ajanında: ≥1 kuş + halkada ≥30 kuş.',
    rationale:
      'Sabit [6,30] büyük B sürüsünü kuşatılamaz yapar (N=600 Geniş R ≈ 32 m). 0,5 s bitti kriterinde ölçülüyor. 9.G-23 geometrisinde (60 kuş, 15 m halka) eşit aralıkta dilim başına ≥2 kuş en fazla 240° verir; bu yüzden ≥1 kuş + halka toplamı eşiği.',
    dataRef: 'SURU.SIEGE_*',
  },
  {
    id: 'S-05',
    topic: 'Gün Batımı Halkası',
    sources: ['§2.6: 2:15–3:00 çap 600 → 200 m', '§4.G.10, §9.G-25, §11.G: son 45 s\'de yarıçap 300 → 110 m'],
    chosen: 'Yarıçap 300 → 110 m, 2:15 → 3:00 doğrusal',
    rationale: 'Bitti kriteri ve test bu sayıyı ölçüyor; fark 10 m yarıçap, dengeye etkisi ihmal edilebilir.',
    dataRef: 'SURU.RING_R0/RING_R1',
  },
  {
    id: 'S-06',
    topic: 'Halka dışı ("gece") kaybı',
    sources: ['§2.6: halka dışındaki takipçiler %3/s yabanileşir, lider içeri itilir', '§4.G.10: dışarıdaki lider saniyede 2 takipçi kaybeder'],
    chosen: 'Halka dışındaki takipçiler %3/s (deterministik birikimle) yabanileşir; kuşlar ve lider içe itilir.',
    rationale: 'Denge §2.',
    dataRef: 'SURU.NIGHT_DRIFT_PER_SEC',
  },
  {
    id: 'S-07',
    topic: 'Yabani yakalama',
    sources: ['§2.6: grup merkezi r + 4 m içinde → grup katılır; r = k√N, Sıkı 0,6, Geniş 1,3', '§4.G.10: kuş başına R_f = k√n, Geniş 1,35, Sıkı 0,8'],
    chosen: '§2.6: grup bütün olarak katılır, eşik r + 4 m, k 0,6 / 1,3',
    rationale: '"Yakındaki gruba git, katılmalarını izle" FTUE anı grup katılımıyla okunur; değerler denge.',
    dataRef: 'SURU.CAPTURE_PAD/R_K_TIGHT/R_K_WIDE',
  },
  {
    id: 'S-08',
    topic: 'Temas savaşı (dönüşüm)',
    sources: ['§2.6: ağırlık Sıkı ×1,6, lider ≤12 m ×1,3; D_B ≥ 0,62; λ = 2,2·(D_B − 0,5)/s', '§4.G.10: K(d) çekirdeği, s_j 1,25, eşik w_m > 1,15·w_own, p = 4·(…)·Δt'],
    chosen: 'Algoritma §4.G (poly6 çekirdek, yalnız frontier kuşlar, değişiklikler tick sonunda); ağırlık/eşik/hız §2.6 (1,6 / 1,3 / 0,62 / 2,2)',
    rationale: 'Algoritma 4.G, denge §2.',
    dataRef: 'SURU.CONV_*',
  },
  {
    id: 'S-09',
    topic: 'Doğan',
    sources: ['§2.6: ilk 0:40, sonra her 30 ± 5 s, 2 s uyarı, kenar kuşlarının %6–12\'si 40 m öteye', '§4.G.10: 60. sn\'den itibaren 1–3 doğan, 1,5 m\'de kuş ürker, 0,8 s bekleme'],
    chosen: '§2.6 zamanlama/oranlar; geçiş başına 1 doğan; §4.G hedefleme (en büyük sürünün kenar kuşu) ve ürkütme mekaniği. Kimse zarar görmez.',
    rationale: 'Zamanlama denge §2, takip algoritması §4.G.',
    dataRef: 'SURU.HAWK_*',
  },
  {
    id: 'S-10',
    topic: 'Eleme çekirdeği',
    sources: ['§2.6: 4 m içinde ≥ 8 kuş', '§4.G.10: 3 m içinde ≥ 6 kuş veya düşman lider ≤ 3 m'],
    chosen: '≥ 8 kuş / 4 m (§2.6) VEYA düşman lider ≤ 3 m (4.G eki, çelişmiyor)',
    rationale: 'Denge §2.',
    dataRef: 'SURU.CORE_R/CORE_BIRDS/CORE_LEADER_R',
  },
  {
    id: 'S-11',
    topic: 'Fırtına bulutu',
    sources: ['§2.6: 45 m, 3 m/s, içeride takipçiler %4/s dağılır, Nefes dolmaz', '§4.G.10: ayrılma ×3 + dürtüler; liderden 2·R_f uzakta 3 s kalan kuş yabanileşir'],
    chosen: '%4/s dağılma (denge) + ayrılma ×3 ve dürtüler (hareket); Nefes içeride dolmaz',
    rationale: 'İkisi farklı katmanlar; oran §2.',
    dataRef: 'SURU.STORM_*',
  },
  {
    id: 'S-12',
    topic: 'Aura deseni kozmetiği ↔ okunurluk',
    sources: ['§2.6: aura deseni (8) kozmetik', '§3.8: tekrar eden sahip renkleri aura desenleriyle (düz/kesikli/noktalı) ayrılır; sahip renkleri kozmetik değildir'],
    chosen: 'Kozmetik aura = aura dairesinin İÇ motifi; kenar stili (düz/kesikli/noktalı) ve renk sistem tarafından atanır.',
    rationale: 'Okunurluk oynanıştır; kozmetik onu bozamaz.',
  },
  {
    id: 'S-13',
    topic: 'YZ lig zorluğu',
    sources: ['§2.6: tepki 450 ms (Bronz) → 180 ms (Elmas), karar 4 → 10 Hz', '§4.G.10: kişilik tepkisi 180–300 ms + lig ofseti (Bronz +150, Elmas −50), 5 Hz'],
    chosen: 'Kişilik tabanı + lig ofseti; ofsetler §2.6 ortalamalarını tutturur: Bronz +220, Gümüş +150, Altın +85, Platin +15, Elmas −50 ms (kişilik ortalaması 230 ms). Karar aralığı 7/6/5/4/3 tick (≈4,3 → 10 Hz).',
    rationale: 'Hedef değerler §2; yapı §4.G.',
    dataRef: 'LEAGUES[]',
  },
];

export function ruling(id: string): Ruling | undefined {
  return RULINGS.find((r) => r.id === id);
}
