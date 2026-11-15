# Soru defteri (durum): oyunun kendi verisinden (say.json: say.mjs çıktısı) ve test sonuçlarından (testler.txt) üretilir.
# python3 -I gen.py <say.json> <testler.txt> <cikti.html>
import json, sys, html

say = json.load(open(sys.argv[1], encoding='utf-8'))
testler = [l.strip() for l in open(sys.argv[2], encoding='utf-8') if l.strip()]
OUT = sys.argv[3]
esc = lambda s: html.escape(str(s), quote=True)
fmt = lambda n: f'{n:,}'.replace(',', '.')

CATS = [('tarih', 'Tarih', '#e0583a'), ('cografya', 'Coğrafya', '#2f9bd8'), ('spor', 'Spor', '#ff8a1e'), ('bilim', 'Bilim', '#33b86b'), ('sanat', 'Sanat', '#a55bd6'), ('eglence', 'Genel Kültür', '#ec4f93')]
OYUN = 'https://claude.ai/artifact/Je7JxXFSZWwquWPYCBqZx7'
GAL = 'https://claude.ai/artifact/M3YsYK34kRQds5QoRV6kQZ'

# tip başına durum notu (yalnız doğrulanmış bilgi). durum: tamam | dikkat | eksik
NOT = {
	'kazi': ('tamam', '99 yapı görseli, koyu premium folyo, sinematik son kazıma. Çevrimiçinde görsel karo karo sunucudan gelir, payı sunucu sayar.'),
	'penalti': ('dikkat', 'Maçta. Cevap filminin süresi gerçek telefonda denenmedi.'),
	'golge': ('tamam', 'Yeni: 99 yapı görselinden siluet, Karagöz perdesi, sırayla açılan üç ipucu, cevapta perde aralanır; maçta açıldı.'),
	'gozkarari': ('tamam', '310 görsel; maçta öteki tiplerden sık çıkar.'),
	'mancinik': ('tamam', ''),
	'kimim': ('tamam', ''),
	'harfal': ('tamam', 'Klavye yerine harf havuzu.'),
	'azbilinen': ('tamam', '5 seçenek.'),
	'fitil': ('tamam', ''),
	'tufan': ('tamam', ''),
	'kayip': ('tamam', ''),
	'ilavi': ('tamam', ''),
	'kusbakisi': ('tamam', ''),
	'sive': ('dikkat', '25 soru: maçta en az soru kalan tiplerden.'),
	'halat': ('tamam', 'Canlı tur: yalnız düelloda.'),
	'yanlis': ('tamam', ''),
	'ikidogru': ('tamam', ''),
	'balon': ('tamam', 'Maçta (yeni). 42 doğrulanmış soru, her birine kısa açıklama; sade sonuç ekranı.'),
	'mayin': ('dikkat', 'Maçta (yeni). Dar ekranda adlar artık binmiyor; kalabalık cevapta bazı küçük illerin adı söner. Cevap filminin süresi gerçek telefonda denenmedi.'),
	'rota': ('dikkat', 'Maçta (yeni). Cevap filminin süresi gerçek telefonda denenmedi.'),
	'tunel': ('tamam', 'Maçta (yeni). 33–44 sn: yayılmada seyrek, düelloda normal.'),
	'kelimeavi': ('tamam', 'Maçta (yeni). 37–57 sn: yayılmada seyrek. Kısa ekranda tablo büyüdü (360×640: 190 → 242 px), harfler iri.'),
	'kosu': ('eksik', 'Galeride, 5 örnek. Maça hiç alınmadı.'),
	'baglanti': ('eksik', 'Galeride, 5 örnek. Maça hiç alınmadı.'),
}
ESKI_NOT = {
	'pin': ('tamam', 'Harita tipi.'),
}

ACIK = [
	('Açılış süresi', 'Banka iki katına çıkınca 4× yavaş işlemcide açılış 1 sn uzadı (normal hızda fark yok). Bankayı menü açıldıktan sonra yüklemek bu farkı geri alır; istenirse yapılır.', 'bilgi'),
	('Göz Kararı +200', '200 yeni görselin komutları (GK-311–GK-510, 10 konu) hazır; görseller gelince bağlanacak. Şu an maçta 310 görselli soru.', 'bekliyor'),
	('Gerçek telefon', 'Penaltı, Mayın Tarlası ve Uçuş Rotası cevap filmlerinin süresi gerçek telefonda denenmedi.', 'bekliyor'),
	('Çevrimiçi istemci paketi', 'Oyun tek dosya: soru bankası (cevaplarıyla) ve yapı görselleri istemcinin içinde, çevrimiçi görünüm soru kimliğini taşıyor. Çevrimiçi insan istemcisi yazılırken bankasız ayrı paket ve tuzlanmış kimlik gerekir; Gölge Oyunu’nda görsel numarası da gizlenmeli (Kazı’daki gibi karo).', 'bilgi'),
]
BITEN = [
	('Soru bankası 10.437 → 20.103', '9.666 yeni soru (tarih +1.653, coğrafya +1.587, sanat ve edebiyat +1.769, bilim +1.728, spor +1.299, genel kültür +1.630). Her dosyayı bir ajan yazdı, ayrı bir ajan soru soru denetledi; yanlış bilgi, ikinci doğru şık, başka sorunun cevabını açan kök ve başka tipte aynı bilgi ayıklandı (dosya başına %5–20 silindi). “Kim daha yakın” soruları 1.226 → 2.811: Tahmin 574 → 1.331, Mancınık 452 → 1.175 (Tahmin sorularından kendiliğinden kurulur), Haritada Bul 101 → 206. Zorluk %26,5 kolay, %47,2 orta, %26,4 zor.'),
	('Son denetim', "Yeni 9.101 soruda birebir aynı soru 0; bilgi parçası taraması başka tipte birebir tekrar eden 10 bilgiyi buldu, değiştirildi. İçerik denetiminde yeni bulgu yok (10 bilinen istisna). En uzun yeni sorular 320 ve 360 genişlikte soru ve cevap evresinde: 132 ekranın 130'u temiz, kalan 2 düzeltildi. Testler 38/38, benzetim temiz."),
	('Anagram uzun kelime', 'KONSERVATUVAR (13 harf) ve İSKANDİNAVYA (12) kutuları 320 ve 360 genişlikte kenardan taşıyordu. Uzun kelimede aralık daralır, kutu küçülür; en uzun 6 kelime × 2 ekran × soru/cevap: 24/24 temiz.'),
	('Soru hafızası 25.000', 'Cihazdaki hafıza 15.000 soru tutuyordu; banka 20 bini geçince çok oynayanın ilk gördüğü sorular havuz bitmeden yeniden çıkabilirdi. Sınır 25.000 (bankanın tamamı sığar); test, sınır bankadan küçük kalırsa kırmızı yanar.'),
	('Açılış ölçümü', 'Dosya 6,5 → 8,6 MB. Normal hızda fark ölçülmedi (oyun hazır 3,18 → 3,20 sn); 4× yavaş işlemcide +1,0 sn (8,6 → 9,7 sn).'),
	('Soru bankası 8.015 → 10.437', "2.422 yeni soru (tarih +423, coğrafya +415, sanat ve edebiyat +430, bilim +387, spor +352, genel kültür +415). Webden doğrulanmış, özgün yazılmış kültür soruları; il verisinden üretilen 107 soru bankanın %1'i. Küçük tipler büyüdü: Balon 100, Zaman Tüneli 100, Kelime Avı 100, Penaltı 120, Mayın 75, Rota 71, Fitil 60. Ekran denetimi 468/468 temiz, içerik denetiminde yeni bulgu yok, testler 38/38."),
	('Soru geçmişi hesapta', "Sunucu her hesabın soru hafızasını saklar, cihazın özetiyle birleştirir: telefon değişince gördüğü soru tekrar etmez. Çevrimiçi özet sınırı 6.000'den 10.000 soruya çıktı."),
	('Yayın öncesi gece testi', '1.008 soru ekranı (36 tip × en uzun sorular × 6 ekran boyu, soru/joker/cevap), 484 maç ekranı baştan sona oynanarak, düşük cihaz (işlemci 1×/4×/6×, 3 kademe) ve 11 maçlık bellek testi. 0 sayfa hatası, 0 donma, bellek sızıntısı yok. Ayrıntılar, tablolar ve eski/yeni görseller: [[RAPOR]].'),
	('Adam Asmaca harf kartları', 'Jokerden sonra kartlar yarı yolda üst üste kalıyordu: soru kartının sığdırma ölçümü her karede kendini yeniden başlatıyordu. Döngü kalktı.'),
	('Göz Kararı şıkları', 'Şıklar heceden bölünüyordu ("Üze-rinde"); artık kelime bölünmüyor, uzun kelime küçülüyor. Denetçiye kelime bölünmesi kontrolü eklendi: 144 durumda 0.'),
	('Maç akışı', 'Savunma sorusunda botun ATLA düğmesi açık kalıyordu (duraklat düğmesine biniyor, basınca savunmayı atlatıyordu); VS kartında TUR rozeti portreye biniyordu. İkisi de düzeldi.'),
	('Maç sonu kısa telefonda', "320×568'de ödül satırları ve reklam düğmesi alttaki düğmelerin arkasında kalıyordu (79 px, seviye atlayınca 34 px); artık kaydırmasız sığıyor."),
	('Savaş filmi akıcılığı', "Arayüz her karede ekran boyunu DOM'dan okuyup zorunlu yerleşim hesabı yaptırıyordu. Düşük kademede 6× yavaş işlemcide film p95: 69 → 23 ms."),
	('Kazı Kazan hilesi', 'Çevrimiçinde görsel ve numarası istemciye gitmez; kazınan karolar sunucudan gelir, pay sunucunun gönderdiği karodan sayılır. Bot “hiç kazımadım” dese de sunucu kendi saydığını kullanıyor (sınandı).'),
	('Çevrimiçi kartlar', 'Balon, Zaman Tüneli, Kelime Avı ve Kazı kartları cevabı ya da görseli sunucudan ister; tarayıcıda sahte sunucuyla oynatılıp sınandı.'),
	('Kelime Avı', 'Kısa ekranda tablo büyüdü (320×568: 178 → 200 px, 360×640: 190 → 242 px), harfler hücrede iri; 18/18 çakışma durumu temiz.'),
	('Elenen prototipler', 'Fetih Koşusu ve Bağlantı Duvarı kodu, örnekleri ve testleri silindi.'),
	('Maça girdi: 5 tip', 'Balon Patlat, Mayın Tarlası, Uçuş Rotası, Zaman Tüneli, Kelime Avı: ağırlıklar (uzun turlar yayılmada seyrek), maçta en çok 1–3, sunucu adımları, sızıntı testi; 6 uzak koltuklu maçta her biri 5–8 kez oynandı, benzetim temiz.'),
	('Resimli kaldırıldı', 'Eski çizimli tip (bankada 0 soru); yerini Göz Kararı aldı. Kodu, ağırlıkları ve testleri silindi.'),
	('Mayın Tarlası adları', '320 genişlikte 4 kişilik cevapta adlar üst üste biniyordu (Kütahya-Afyonkarahisar, Karaman-Adana); artık binen küçük ilin adı söner, bayraklar küçüldü.'),
	('Joker denetimi (36 tip)', 'Her tipte bütün jokerler basılıp ekran 320, 360 ve 390 genişlikte ölçüldü; hepsi temiz. Bulunanlar düzeltildi: bildirim yan düğmelerin altına giriyordu, il ve yöre etiketlerinin üstüne biniyordu, Halat olay yazısı kesiliyordu.'),
	('Adam Asmaca donması', 'Seyirci jokerine basınca sayfa tamamen donuyordu (öneri kodu kendini sonsuz tetikliyordu). Düzeltildi; oyunda da aynı hata vardı.'),
	('Balon Patlat', '42 soru doğrulandı (Kahramanmaraş yerine Niğde), her soruya kısa açıklama; seri parıltısı ve HEPSİ kutlaması; sonuç ekranı sade: doğru cevaplar okunaklı haplar, tek puan.'),
	('Gölge Oyunu (görselli)', '99 soru; gölgede karışabilecek şekiller şık yapılmadı, şıkların baş harfleri farklı; 3B maket perdesi kaldırıldı; maçta açıldı.'),
	('50/50 jokeri', 'Aralığı zaten dar tahmin sorularında aralık artık daralıyor (simülasyonun bulduğu eski hata).'),
	('Kazı Kazan v2', 'Koyu premium folyo ve sinematik son kazıma; 99 yapı görseli (beyaz zemin saydam), 99 doğrulanmış soru, koyu premium folyo, ışıldayan kazıma, sinematik son kazıma; maça girdi.'),
	('Kız Kulesi', 'Görseli bozuk geldiği için Kazı Kazan’dan çıkarıldı.'),
	('Penaltı', 'Maça girdi: 46 soru, maçta 2–3, sunucu adımı, sızıntı testi.'),
	('Şık rozetleri', 'Seçilen şık boş kart olur, oyuncu portreleri yan yana dizilir (her tipte).'),
	('Kaldırılanlar', 'Kasa Soygunu, Terazi ve Kaçış Odası kullanıcı kararıyla kaldırıldı.'),
]
YAPILMADI = ['Sefer Yolu', 'Ezgi Avı', 'Asker Bahsi', 'Bir İşlem', 'Harita Hafızası', 'Blöf', 'Dürbün Avı', 'Plaka Hesabı', 'Haritadaki Hata', 'Artırma', 'Akıl Okuma', 'Harita Yapbozu', 'Sisi Dağıt', 'Şifreli Harita']


def catbar(cat, n):
	if not n:
		return '<span class="bar0">soru yok</span>'
	seg = ''.join(f'<i style="--w:{cat.get(k, 0) / n * 100:.2f}%;--c:{c}" title="{esc(ad)}: {cat.get(k, 0)}"></i>' for k, ad, c in CATS if cat.get(k, 0))
	return f'<span class="bar">{seg}</span>'


def diffs(d):
	return ''.join(f'<span class="df d{k}">{d.get(str(k), d.get(k, 0))}</span>' for k in (1, 2, 3))


def durum(code):
	return {'tamam': '<span class="pill ok">Tamam</span>', 'dikkat': '<span class="pill wa">Dikkat</span>', 'eksik': '<span class="pill no">Eksik</span>'}[code]


eski = say['eski']
yeni = say['yeni']
havuz = say['havuz']
macY = [t for t in yeni if t['mac'] and not t['kapali']]
kapali = [t for t in yeni if t['kapali']]
galeri = [t for t in yeni if not t['mac'] and t['t'] not in ('kosu', 'baglanti')] # elenen prototipler galeride de yok
eskiOyun = {k: v for k, v in eski.items() if v['w'] > 0 and v['n'] > 0}
eskiBos = {k: v for k, v in eski.items() if not (v['w'] > 0 and v['n'] > 0)}
nTip = len(eskiOyun) + len(macY)
nAcik = sum(1 for a in ACIK if a[2] in ('sırada', 'bekliyor'))
gecen = sum(1 for l in testler if l.endswith(' 0 hata'))


def row_yeni(t):
	st, nt = NOT.get(t['t'], ('tamam', ''))
	taze = '<span class="yeni">YENİ</span>' if t['taze'] else ''
	snr = f'{t["sinir"][0]}–{t["sinir"][1]}' if t.get('sinir') else '—'
	return (f'<tr data-d="{st}"><td><b>{esc(t["ad"])}</b>{taze}<small>{esc(t["tanit"])}</small></td>'
		f'<td class="n">{fmt(t["n"])}</td><td>{catbar(t["cat"], t["n"])}</td><td class="dd">{diffs(t["diff"])}</td>'
		f'<td class="n">{snr}</td><td>{durum(st)}{f"<p>{esc(nt)}</p>" if nt else ""}</td></tr>')


def row_eski(k, v):
	st, nt = ESKI_NOT.get(k, ('tamam', ''))
	return (f'<tr data-d="{st}"><td><b>{esc(v["label"])}</b><small>{esc(k)}</small></td><td class="n">{fmt(v["n"])}</td>'
		f'<td>{catbar(v["cat"], v["n"])}</td><td class="dd">{diffs(v["diff"])}</td><td>{durum(st)}{f"<p>{esc(nt)}</p>" if nt else ""}</td></tr>')


TH_Y = '<tr><th>Tip</th><th class="n">Soru</th><th>Kategori</th><th class="dd">Zorluk 1·2·3</th><th class="n">Maçta</th><th>Durum</th></tr>'
TH_E = '<tr><th>Tip</th><th class="n">Soru</th><th>Kategori</th><th class="dd">Zorluk 1·2·3</th><th>Durum</th></tr>'

cat_rows = ''.join(
	f'<div class="cr"><span class="cn"><i style="background:{c}"></i>{esc(ad)}</span><span class="cb"><i style="--w:{havuz["cat"].get(k, 0) / max(havuz["cat"].values()) * 100:.1f}%;--c:{c}"></i></span><b>{fmt(havuz["cat"].get(k, 0))}</b></div>'
	for k, ad, c in CATS)
legend = ''.join(f'<span><i style="background:{c}"></i>{esc(ad)}</span>' for k, ad, c in CATS)
acik_html = ''.join(f'<li class="a-{ {"sırada": "s", "bekliyor": "b", "karar": "k", "bilgi": "i"}[d] }"><span class="tag">{esc(d.upper())}</span><div><b>{esc(a)}</b><p>{esc(b)}</p></div></li>' for a, b, d in ACIK)
biten_html = ''.join(f'<li><b>{esc(a)}</b><p>{esc(b)}</p></li>' for a, b in BITEN).replace('[[RAPOR]]', '<a href="https://claude.ai/artifact/RsdMq8F87xD5stM3vh99Yw" style="color:var(--gold)">Fetih Ligi Test Raporu</a>')
test_html = ''.join(f'<li class="{"ok" if l.endswith(" 0 hata") else "no"}"><code>{esc(l.split(":")[0])}</code><span>{esc(l.split(":", 1)[1].strip())}</span></li>' for l in testler)

PAGE = f'''<title>Soru Defteri</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@1,700;1,800&family=Fredoka:wght@400;500;600&family=Lilita+One&display=swap">
<style>
/* Oyunun Arena dili: gece laciverti, fetih altını, Lilita başlık, Barlow Condensed eğik etiket, Fredoka metin. Tek koyu görünüm. */
:root {{
  --bg: #0a1230; --panel: #111d42; --panel2: #16264f; --line: rgba(255,210,90,.16); --line2: rgba(255,255,255,.08);
  --fg: #eef2ff; --mute: #a3afd3; --gold: #ffd25a; --ink: #2a1800;
  --ok: #5fd98a; --wa: #ffb43d; --no: #ff6b5e; --info: #78c4ff;
  --display: 'Lilita One', 'Arial Rounded MT Bold', system-ui, sans-serif;
  --label: 'Barlow Condensed', 'Arial Narrow', system-ui, sans-serif;
  --body: 'Fredoka', 'Nunito', system-ui, sans-serif;
  color-scheme: dark;
}}
* {{ box-sizing: border-box }}
body {{ background: var(--bg); color: var(--fg); font: 400 15.5px/1.5 var(--body);
  background-image: radial-gradient(1000px 420px at 50% -140px, rgba(255,210,90,.13), transparent 70%); background-repeat: no-repeat }}
body::before {{ content: ""; position: fixed; inset: 0 0 auto; height: env(safe-area-inset-top, 0px); z-index: 10; background: var(--bg) }}
.wrap {{ max-width: 1040px; margin: 0 auto; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-block: 28px 72px; display: grid; gap: 34px }}
a {{ color: var(--gold) }}
h1, h2 {{ font-family: var(--display); font-weight: 400; margin: 0; text-wrap: balance }}
.eb {{ font: italic 800 13px/1 var(--label); letter-spacing: .18em; text-transform: uppercase; color: var(--gold) }}
header {{ display: grid; gap: 12px }}
h1 {{ font-size: clamp(38px, 9vw, 60px); line-height: 1; color: var(--gold); text-shadow: 0 3px 0 var(--ink) }}
.lead {{ margin: 0; font-size: 18px; max-width: 62ch }}
.links {{ display: flex; gap: 10px; flex-wrap: wrap }}
.links a {{ font: italic 800 15px/1 var(--label); letter-spacing: .08em; text-transform: uppercase; text-decoration: none; color: var(--ink); background: var(--gold); padding: 9px 14px; transform: skewX(-8deg); box-shadow: 0 3px 0 #a8740f }}
.links a.alt {{ color: var(--gold); background: transparent; box-shadow: inset 0 0 0 1.5px var(--gold) }}
.kpi {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px }}
.k {{ background: linear-gradient(170deg, var(--panel2), var(--panel)); border: 1px solid var(--line); border-radius: 14px; padding: 14px 16px 12px; display: grid; gap: 4px }}
.k b {{ font: 400 34px/1 var(--display); font-variant-numeric: tabular-nums }}
.k span {{ font: italic 800 12.5px/1.2 var(--label); letter-spacing: .12em; text-transform: uppercase; color: var(--mute) }}
.k.g b {{ color: var(--gold) }} .k.o b {{ color: var(--ok) }} .k.r b {{ color: var(--no) }} .k.i b {{ color: var(--info) }}
section {{ display: grid; gap: 12px }}
section > h2 {{ font-size: clamp(24px, 5vw, 30px); display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap }}
section > h2 small {{ font: italic 800 14px/1 var(--label); letter-spacing: .12em; text-transform: uppercase; color: var(--mute) }}
.sub {{ margin: -4px 0 0; color: var(--mute); max-width: 70ch }}
.tw {{ overflow-x: auto; border: 1px solid var(--line); border-radius: 14px; background: var(--panel) }}
table {{ width: 100%; border-collapse: collapse; min-width: 720px }}
th {{ text-align: left; font: italic 800 12.5px/1 var(--label); letter-spacing: .12em; text-transform: uppercase; color: var(--mute); padding: 12px 12px; border-bottom: 1px solid var(--line); background: rgba(0,0,0,.18) }}
td {{ padding: 11px 12px; border-bottom: 1px solid var(--line2); vertical-align: top }}
tr:last-child td {{ border-bottom: 0 }}
td b {{ font-weight: 600 }}
td small {{ display: block; color: var(--mute); font-size: 13px; line-height: 1.3; margin-top: 2px }}
td p {{ margin: 6px 0 0; font-size: 13.5px; line-height: 1.4; color: #d6ddf5; max-width: 46ch }}
.n {{ text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap }}
td.n {{ font: 400 18px/1.2 var(--display) }}
.dd {{ white-space: nowrap }}
.df {{ display: inline-block; min-width: 34px; margin-right: 4px; padding: 2px 6px; border-radius: 6px; text-align: center; font-size: 13px; font-variant-numeric: tabular-nums; background: rgba(255,255,255,.06) }}
.df.d1 {{ color: #9be7b4 }} .df.d2 {{ color: #ffd88a }} .df.d3 {{ color: #ffa79c }}
.bar {{ display: flex; width: 150px; height: 10px; border-radius: 5px; overflow: hidden; background: rgba(255,255,255,.06); margin-top: 6px }}
.bar i {{ width: var(--w); background: var(--c) }}
.bar0 {{ color: var(--no); font-size: 13px }}
.pill {{ display: inline-block; font: italic 800 12px/1 var(--label); letter-spacing: .1em; text-transform: uppercase; padding: 4px 8px; transform: skewX(-8deg) }}
.pill.ok {{ color: #082a14; background: var(--ok) }} .pill.wa {{ color: #2b1700; background: var(--wa) }} .pill.no {{ color: #fff; background: var(--no) }}
.yeni {{ margin-left: 7px; font: italic 800 11px/1 var(--label); letter-spacing: .1em; color: #fff; background: #e23b3b; padding: 2px 6px; vertical-align: 2px }}
.legend {{ display: flex; gap: 12px; flex-wrap: wrap; font-size: 13px; color: var(--mute) }}
.legend i, .cn i {{ display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 6px }}
.cats {{ background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 14px 16px; display: grid; gap: 9px }}
.cr {{ display: grid; grid-template-columns: 120px minmax(0,1fr) 70px; gap: 12px; align-items: center }}
.cn {{ font-size: 14.5px }}
.cb {{ height: 12px; border-radius: 6px; background: rgba(255,255,255,.06); overflow: hidden }}
.cb i {{ display: block; height: 100%; width: var(--w); background: var(--c) }}
.cr b {{ text-align: right; font: 400 18px/1 var(--display); font-variant-numeric: tabular-nums }}
ul.l {{ list-style: none; margin: 0; padding: 0; display: grid; gap: 8px }}
ul.l li {{ display: grid; grid-template-columns: auto minmax(0,1fr); gap: 12px; align-items: start; background: var(--panel); border: 1px solid var(--line2); border-radius: 12px; padding: 12px 14px }}
ul.l li b {{ font-weight: 600 }}
ul.l li p {{ margin: 3px 0 0; color: #d6ddf5; font-size: 14.5px; max-width: 72ch }}
.tag {{ font: italic 800 12px/1 var(--label); letter-spacing: .1em; padding: 5px 8px; transform: skewX(-8deg); white-space: nowrap; margin-top: 1px }}
.a-s .tag {{ background: var(--gold); color: var(--ink) }} .a-b .tag {{ background: var(--wa); color: #2b1700 }}
.a-k .tag {{ background: var(--info); color: #071a30 }} .a-i .tag {{ background: rgba(255,255,255,.12); color: var(--fg) }}
ul.b li {{ grid-template-columns: minmax(0,1fr); border-left: 3px solid var(--ok) }}
ul.t {{ list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 6px }}
ul.t li {{ display: flex; justify-content: space-between; gap: 10px; background: var(--panel); border-radius: 10px; padding: 8px 12px; font-size: 13.5px; border-left: 3px solid var(--ok) }}
ul.t li.no {{ border-left-color: var(--no) }}
ul.t li span {{ color: var(--mute); text-align: right }}
code {{ font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 13px; color: var(--gold) }}
.chips {{ display: flex; flex-wrap: wrap; gap: 6px }}
.chips span {{ background: var(--panel); border: 1px solid var(--line2); border-radius: 8px; padding: 5px 10px; font-size: 14px; color: var(--mute) }}
.flt {{ display: inline-flex; gap: 4px; background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 3px; flex-wrap: wrap }}
.flt button {{ font: 600 13px var(--body); color: var(--mute); background: none; border: 0; border-radius: 9px; padding: 6px 12px; cursor: pointer }}
.flt button[aria-pressed=true] {{ background: var(--gold); color: var(--ink) }}
.hide {{ display: none }}
footer {{ color: var(--mute); font-size: 13.5px }}
@media (max-width: 520px) {{ .cr {{ grid-template-columns: 92px minmax(0,1fr) 56px }} }}
</style>
<div class="wrap">
<header>
  <span class="eb">Fetih Ligi · 15 Kasım 2026 durumu</span>
  <h1>Soru Defteri</h1>
  <p class="lead">Hangi soru tipi oyunda, hangisi yalnız galeride, kaçar soru var, ne bitti ne kaldı. Sayılar oyunun kendi kodundan sayıldı (soru bankası, galeri örnekleri ve maçın tip listesi).</p>
  <div class="links"><a href="{OYUN}" target="_blank" rel="noopener">Oyunu aç</a><a class="alt" href="{GAL}" target="_blank" rel="noopener">Soru galerisini aç</a></div>
</header>

<div class="kpi">
  <div class="k g"><b>{fmt(havuz['n'])}</b><span>Maçta sorulabilen soru</span></div>
  <div class="k o"><b>{nTip}</b><span>Maçta açık soru tipi</span></div>
  <div class="k i"><b>{len(galeri)}</b><span>Yalnız galeride tip</span></div>
  <div class="k r"><b>{len(kapali) + len(eskiBos)}</b><span>Kapalı ya da sorusuz tip</span></div>
  <div class="k"><b>{nAcik}</b><span>Açık iş</span></div>
</div>

<section>
  <h2>Kategoriler <small>maç havuzu</small></h2>
  <div class="cats">{cat_rows}</div>
</section>

<section>
  <h2>Açık işler <small>{nAcik} iş + {sum(1 for a in ACIK if a[2] == 'karar')} karar</small></h2>
  <ul class="l">{acik_html}</ul>
</section>

<section id="yeni">
  <h2>Yeni tipler · maçta <small>{len(macY)} tip · {fmt(sum(t['macSoru'] for t in macY))} soru</small></h2>
  <div class="legend">{legend}</div>
  <div class="flt" role="group" aria-label="Duruma göre süz"><button aria-pressed="true" data-f="">Hepsi</button><button aria-pressed="false" data-f="tamam">Tamam</button><button aria-pressed="false" data-f="dikkat">Dikkat</button><button aria-pressed="false" data-f="eksik">Eksik</button></div>
  <div class="tw"><table><thead>{TH_Y}</thead><tbody>{''.join(row_yeni(t) for t in sorted(macY, key=lambda t: -t['n']))}</tbody></table></div>
</section>

<section>
  <h2>Maçta kapalı <small>{len(kapali)} tip</small></h2>
  <div class="tw"><table><thead>{TH_Y}</thead><tbody>{''.join(row_yeni(t) for t in kapali)}</tbody></table></div>
</section>

<section>
  <h2>Yalnız galeride <small>{len(galeri)} tip · {fmt(sum(t['n'] for t in galeri))} soru · maça girmedi</small></h2>
  <div class="tw"><table><thead>{TH_Y}</thead><tbody>{''.join(row_yeni(t) for t in galeri)}</tbody></table></div>
</section>

<section>
  <h2>Klasik tipler · maçta <small>{len(eskiOyun)} tip · {fmt(sum(v['n'] for v in eskiOyun.values()))} soru</small></h2>
  <p class="sub">Soru bankasındaki tipler. Çarkın kategorisine ve ana göre (yayılma ya da düello) ağırlıkla seçilir.</p>
  <div class="tw"><table><thead>{TH_E}</thead><tbody>{''.join(row_eski(k, v) for k, v in sorted(eskiOyun.items(), key=lambda kv: -kv[1]['n']))}{''.join(row_eski(k, v) for k, v in eskiBos.items())}</tbody></table></div>
</section>

<section>
  <h2>Bu turda biten</h2>
  <ul class="l b">{biten_html}</ul>
</section>

<section>
  <h2>Önerilip yapılmayanlar <small>{len(YAPILMADI)} fikir</small></h2>
  <p class="sub">Eski öneri defterinde vardı, kodda yok. Kasa Soygunu, Terazi ve Kaçış Odası yapılıp kaldırıldı. Eski öneri defterinin tamamı (telefon çizimleri, tut/ele seçimleri) burada duruyor: <a href="eski-oneriler.html">Eski öneri defteri</a>.</p>
  <div class="chips">{''.join(f'<span>{esc(x)}</span>' for x in YAPILMADI)}</div>
</section>

<section>
  <h2>Testler <small>{gecen}/{len(testler)} hatasız</small></h2>
  <ul class="t">{test_html}</ul>
</section>

<footer>Sayılar 15 Kasım 2026’da oyunun kodundan alındı (son commit claude/eloquent-feynman-h3ctvm dalında). Sorular buraya yüklenmedi; hepsi galeride oynanabilir.</footer>
</div>
<script>
// durum süzgeci (yalnız "Yeni tipler · maçta" tablosu)
(() => {{
  const box = document.querySelector('#yeni');
  const bs = box.querySelectorAll('.flt button');
  bs.forEach((b) => b.addEventListener('click', () => {{
    bs.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    const f = b.dataset.f;
    box.querySelectorAll('tbody tr').forEach((tr) => tr.classList.toggle('hide', !!f && tr.dataset.d !== f));
  }}));
}})();
</script>
'''
open(OUT, 'w', encoding='utf-8').write(PAGE)
print('yazıldı', OUT, len(PAGE))
