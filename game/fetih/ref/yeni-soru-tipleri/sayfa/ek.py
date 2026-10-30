# YENİ öneriler 19–30 (wow 9+): çizimler, kartlar, ayrıntılar. gen2.py içinde exec edilir.
DET = {}

# 19 Plaka Hesabı
plate = lambda n, il, q=False: f'<span class="plt{" q" if q else ""}"><i>TR</i><b>{n}</b><em>{il}</em></span>'
MK['plaka'] = phone(hud() + '<div class="low">' + vs() + card('Coğrafya', 'PLAKA HESABI', 20, 'İzmir + Ankara = ?',
    f'<div class="eq">{plate("35", "İZMİR")}<span>+</span>{plate("06", "ANKARA")}<span>=</span>{plate("41", "?", True)}</div>' + opts(['Kocaeli', 'Sakarya', 'Kırşehir', 'Konya']), 72) + '</div>', DUEL, 'duelm')

# 20 Haritadaki Hata: Van Gölü Sivas'a taşınmış
_lk = json.load(open('/home/user/GAME-/game/fetih/src/data/turkiye.json'))['lakes']
_van = [l for l in _lk if l['name'].startswith('Van')][0]['ring']
_pts = [(_van[i], -_van[i + 1]) for i in range(0, len(_van), 2)]
_cx = sum(p[0] for p in _pts) / len(_pts)
_cy = sum(p[1] for p in _pts) / len(_pts)
_dx, _dy = C[58][0] - _cx, C[58][1] + 0.4 - _cy
_lake = '<path class="lake" d="M' + ' '.join(f'{x + _dx:.2f} {y + _dy:.2f}' for x, y in _pts[::3]) + 'Z"/>'
m, w = mapsvg([58, 66, 44, 24, 65, 60], hl=[], extra=_lake, pad=1.5, aspect=300 / 320)
MK['hata'] = phone(hud() + card('Coğrafya', 'HARİTADAKİ HATA', 25, 'Haritada bir hata var. İlk bulan kazanır!',
    '<p class="hint">Bir göl, nehir, yapı ya da il yerinden oynamış olabilir · gördüğün an dokun</p>', 70), f'<div class="mapb">{m}</div>')
DET[20] = ['Neden yeni: “farkı bul” oyunu, ama bilgiyle; haritayı ezberleyen değil gerçekten tanıyan kazanır.',
           'Hata türleri: yeri değişmiş göl/yapı, ters akan nehir, yer değiştirmiş iki il adı, yanlış denize kıyı.',
           'Adalet: herkese aynı kadraj ve aynı hata; dokunma bölgesi cömert.',
           'Çevrimiçi: hatanın yeri sunucuda; istemci yalnız bozulmuş haritayı çizer.',
           'İçerik: haritadaki göl, nehir, yapı ve il verisinden üretilir (sınırsız). Emek: M.']

# 21 Tufan
COAST = [39, 34, 41, 54, 81, 67, 74, 37, 57, 55, 52, 28, 61, 53, 8, 59, 77, 16, 10, 17, 22, 35, 9, 48, 7, 33, 1, 31]
m, w = mapsvg(list(C.keys()), hl=[(i, 'flood') for i in COAST], pad=0.5, aspect=300 / 320)
MK['tufan'] = phone(hud() + card('Coğrafya', 'TUFAN', 20, 'Deniz yükseliyor! Hangisi en son batar?',
    opts(['Erzurum', 'Ankara', 'Konya', 'İzmir']), 66), f'<div class="mapb">{m}<span class="gauge"><b>+850 m</b><i style="height:38%"></i></span></div>')
DET[21] = ['Neden yeni: oyunun 3B kabartmalı haritası sorunun kendisi olur; cevap anında deniz gerçekten yükselir ve iller tek tek sular altında kalır.',
           'Soru biçimleri: “hangisi en son batar”, “hangisi önce batar”, “şu yükseklikte kaç il kalır” (tahmin).',
           'Adalet: il merkezi rakımları resmî kaynaktan; seçenekler arasında en az 150 m fark.',
           'İçerik: 81 il merkezi rakımıyla yüzlerce karşılaştırma üretilir. Emek: M (su yüzeyi zaten var, seviyesi oynatılır).']

# 22 Artırma
MK['artirma'] = phone(hud() + '<div class="low">' + vs() + card('Coğrafya', 'ARTIRMA', 10, 'Ege Bölgesi’nin illerinden kaçını haritada bulursun?',
    '<div class="bid"><span class="by">Arda: <b>6</b> der</span><div class="bn2"><span class="m">−</span><b>7</b><span class="m">+</span></div><div class="row two"><span class="send gold">7 DE</span><span class="send green">GÖSTER!</span></div></div><p class="hint">“Göster!” dersen Arda 20 sn’de 6 ili haritada bulmak zorunda</p>', 50) + '</div>', DUEL, 'duelm')
DET[22] = ['Neden yeni: TV’deki “Bid-a-Note / Tenable” gerilimi; bilgi + blöf. Kendine güvenen artırır, şüphelenen “Göster!” der.',
           'Akış: sırayla artır ya da “Göster!”; son artıran söylediği kadarını süre içinde haritada bulur (Fetih Koşusu altyapısı).',
           'Adalet: artırma süresi kısa (10 sn), bulma süresi sayıya göre ölçeklenir.',
           'İçerik: Fetih Koşusu kurallarının hepsi kullanılır. Emek: M.']

# 23 Akıl Okuma
MK['akil'] = phone(hud() + '<div class="low">' + vs() + card('Coğrafya', 'AKIL OKUMA', 18, 'Tamamı Türkiye’de olan en uzun nehir hangisi?',
    '<p class="hint left"><b>1.</b> Senin cevabın · <b>2.</b> Arda ne dedi sence?</p>' + opts(['Kızılırmak', 'Sakarya', 'Yeşilırmak', 'Büyük Menderes'], pick=0).replace('Kızılırmak</span>', 'Kızılırmak<u class="me">Sen</u></span>').replace('Sakarya</span>', 'Sakarya<u class="gh">Arda?</u></span>'), 64) + '</div>', DUEL, 'duelm')
DET[23] = ['Neden yeni: bilgi yarışmasına zihin okuma katmanı; rakibini tanıdıkça daha iyi tahmin edersin. Arkadaşla oynarken çok güldürür.',
           'Puan: doğru cevap + rakibin cevabını doğru tahmin; iki puan ayrı sayılır.',
           'Adalet: iki seçim aynı süre içinde; rakibin cevabı ikisi de seçince açılır.',
           'Çevrimiçi: tahmin sunucuda saklanır, rakibin cevabı ancak süre bitince gelir. Emek: S.']

# 24 Kayıp İl
m, w = mapsvg([26, 11, 14, 6, 42, 3, 43], hl=[(26, 'void')], pad=1.8, aspect=300 / 320)
MK['kayip'] = phone(hud() + card('Coğrafya', 'KAYIP İL', 20, 'Haritadan bir il kayboldu! Hangisi?', opts(['Eskişehir', 'Kütahya', 'Afyonkarahisar', 'Bilecik']), 70), f'<div class="mapb">{m}</div>')
DET[24] = ['Neden yeni: haritada simsiyah bir boşluk; kamera boşluğun etrafında döner. İllerin şeklini ve komşuluğunu tanımayı ödüllendirir.',
           'Cevapta kayıp il gökten iner ve yerine oturur (oyunun il kaldırma efekti).',
           'Zorluk: kolayda kıyı ve göl ipucu görünür, zorda yalnız komşular.',
           'İçerik: 81 il, sınırsız. Emek: S.']

# 25 Harita Yapbozu
holes = [40, 50, 68]
pieces = ''
for k, (i, rot) in enumerate([(40, 35), (50, -60), (68, 110)]):
    cx, cy = C[i]
    tx, ty = -6 + k * 6 - cx + C[50][0], 6.5 - cy + C[50][1]
    pieces += f'<g transform="translate({tx:.1f} {ty:.1f}) rotate({rot} {cx:.1f} {cy:.1f})"><use href="#p{i}" class="piece"/></g>'
m, w = mapsvg([40, 50, 68, 6, 42, 38, 66, 51], hl=[(i, 'void') for i in holes], extra=pieces, pad=3.5, aspect=300 / 320)
MK['yapboz'] = phone(hud() + card('Coğrafya', 'HARİTA YAPBOZU', 24, 'Parçaları yerine oturt!', '<p class="hint">Sürükle, iki parmakla çevir, bırak · doğru yere “tık” diye oturur</p>', 72), f'<div class="mapb">{m}</div>')
DET[25] = ['Neden yeni: elle tutulur bir bulmaca; parça yerine oturunca 3B haritaya düşer ve sallanır. Telefonda çok tatmin edici.',
           'Akış: 3 boşluk, 3 parça; hepsini en hızlı yerleştiren kazanır. Zorda parçalar ters de gelir.',
           'Adalet: yakına bırakınca yapışır (5 mm hoşgörü).',
           'İçerik: 81 ilden sınırsız. Emek: M.']

# 26 Sisi Dağıt
tower = '<svg class="fogart" viewBox="0 0 300 260" aria-hidden="true"><path d="M150 40 L132 92 h36 Z" class="tw"/><rect x="128" y="92" width="44" height="12" class="tw"/><rect x="134" y="104" width="32" height="96" class="tw"/><rect x="116" y="200" width="68" height="16" class="tw"/><rect x="0" y="216" width="300" height="44" class="gd"/></svg>'
MK['sis'] = phone(hud() + card('Tarih', 'SİSİ DAĞIT', 30, 'Sisin arkasında ne var?',
    '<div class="tf small"><span class="yes">DOĞRU</span><span class="no">YANLIŞ</span></div><p class="hint">“Kanuni, Mohaç’ı kazandı.” · her doğru cevap bir sis bulutunu dağıtır</p><span class="send">TAHMİN ET</span>', 62),
    f'<div class="mapb fog">{tower}<i class="mist"></i></div>')
DET[26] = ['Neden yeni: iki oyun bir arada; hızlı doğru/yanlış soruları sisi açar, asıl ödül arkadaki büyük yapıyı ilk tanımak. Bu gece eklenen hava sistemini kullanır.',
           'Akış: sis içinde 3B maket; her doğru cevap bir delik açar; istediğin an “Tahmin et”.',
           'Adalet: delikler herkes için aynı sırayla açılır; yalnız hızın ve bilgin farklıdır.',
           'İçerik: 23 maket + doğru/yanlış bankası. Emek: M.']

# 27 Şifreli Harita
code = [57, 6, 53, 9, 66]
ext = ''.join(f'<g transform="translate({C[i][0]:.1f} {C[i][1]:.1f})"><circle r="1.9" class="num"/><text y=".75" font-size="2.2">{k + 1}</text></g>' for k, i in enumerate(code))
m, w = mapsvg(list(C.keys()), hl=[(i, 'glow') for i in code], extra=ext, pad=0.5, aspect=300 / 320)
MK['sifre'] = phone(hud() + card('Coğrafya', 'ŞİFRELİ HARİTA', 22, 'Parlayan illerin baş harfleri hangi kelimeyi yazar?',
    '<div class="boxes five"><i class="on">S</i><i class="on">A</i><i></i><i></i><i></i></div><p class="hint">İller sırayla yanar, adları yazmaz</p>', 60), f'<div class="mapb">{m}</div>')
DET[27] = ['Neden yeni: harita bir şifre çözücü olur; illeri tanıyan kelimeyi okur. Örnek: Sinop, Ankara, Rize, Aydın, Yozgat → SARAY.',
           'Puan: kelimeyi ne kadar erken yazarsan o kadar çok.',
           'Adalet: iller adsız ama sınırları ve komşuları görünür.',
           'İçerik: il baş harfleriyle yazılabilen kelimeler kendiliğinden bulunur (Ğ, J, L, P, V… ile başlayan il yok, onları içermeyen kelimeler). Emek: S.']

# 28 Fitil
cannon = '''<svg class="rope" viewBox="0 0 280 70" aria-hidden="true"><circle cx="18" cy="40" r="13" class="av r"/><circle cx="262" cy="40" r="13" class="av b"/>
<g transform="translate(150 46) scale(-1 1)"><rect x="-28" y="-9" width="50" height="18" rx="8" class="cn"/><circle cx="-6" cy="12" r="9" class="whl"/><circle cx="16" cy="12" r="9" class="whl"/></g>
<path d="M174 40 q14 -18 30 -10" class="fuse"/><circle cx="204" cy="30" r="4" class="spark"/><text x="140" y="16" class="lbl">TOP SANA DÖNÜK</text></svg>'''
MK['fitil'] = phone(hud() + f'<div class="duel">{cannon}</div>' + '<div class="low">' + card('Tarih', 'FİTİL', 7,
    'Mimar Sinan, Selimiye Camii’ni “ustalık eserim” diye anlatır.', '<div class="tf"><span class="yes">DOĞRU</span><span class="no">YANLIŞ</span></div><p class="hint">Doğru cevap topu rakibe çevirir · fitilin ne zaman biteceği belli değil</p>', 35) + '</div>', DUEL, 'duelm')
DET[28] = ['Neden yeni: “sıcak patates”in fetih hâli; fitil gizli sürede yanar, top patladığında kime dönükse o kule kaybeder.',
           'Akış: art arda kısa sorular; her doğru cevap topu rakibe çevirir, yanlış sana.',
           'Adalet: fitil süresi sunucuda rastgele (12–25 sn); iki oyuncu aynı soruları görür.',
           'İçerik: doğru/yanlış ve karşılaştır bankası hazır. Emek: M.']

# 29 Şive Haritası
REG = {'marmara': 'r1', 'ege': 'r2', 'akdeniz': 'r3', 'icanadolu': 'r4', 'karadeniz': 'r5', 'dogu': 'r6', 'guneydogu': 'r7'}
_prov = json.load(open('/home/user/GAME-/game/fetih/src/data/turkiye.json'))['provinces']
m, w = mapsvg(list(C.keys()), hl=[(p['id'], REG.get(p['region'], 'r4')) for p in _prov], pad=0.5, aspect=300 / 300)
MK['sive'] = phone(hud() + card('Kültür', 'ŞİVE HARİTASI', 18, '“Ula, n’apıyon?” Bu söz hangi yörenin ağzı?',
    '<p class="hint">Bölgeye dokun · cevapta herkesin dokunuşu ısı haritası olarak yanar</p>', 74), f'<div class="mapb">{m}</div>')
DET[29] = ['Neden yeni: Türkiye’nin ağızları ilk kez bir oyunda; herkesin bir yöresi var, her soru bir “bizim oralarda böyle denir!” anı.',
           'Akış: söz gelir, bölgeye dokunursun; doğru bölge ve doğru il ayrı puan.',
           'Adalet: bölge düzeyinde cevap (il değil); sözler iki kaynaktan doğrulanır.',
           'İçerik: her bölgeden 15–20 bilinen söz (uşağum, ula, gakkoş, hemşo…). Emek: S.']

# 30 Gölge Oyunu
shadow = '<svg class="fogart" viewBox="0 0 300 260" aria-hidden="true"><defs><radialGradient id="lamp" cx="18%" cy="20%" r="70%"><stop offset="0" stop-color="#ffe9b0" stop-opacity=".55"/><stop offset="1" stop-color="#0b1838" stop-opacity="0"/></radialGradient></defs><rect width="300" height="260" fill="url(#lamp)"/>' + \
    '<g class="sh"><rect x="62" y="186" width="176" height="14"/><rect x="74" y="174" width="152" height="12"/><rect x="84" y="102" width="132" height="10"/>' + \
    ''.join(f'<rect x="{88 + k * 15.5:.1f}" y="112" width="7" height="62"/>' for k in range(9)) + '<rect x="80" y="92" width="140" height="10"/></g>' + \
    '<circle cx="40" cy="44" r="9" class="lampc"/><rect x="0" y="200" width="300" height="60" class="gd"/></svg>'
MK['golge'] = phone(hud() + card('Tarih', 'GÖLGE OYUNU', 20, 'Bu gölge hangi yapının?', opts(['Anıtkabir', 'Selimiye Camii', 'Galata Kulesi', 'Celsus Kütüphanesi']), 68),
    f'<div class="mapb fog">{shadow}</div>')
DET[30] = ['Neden yeni: 3B maketler ışığın önünde döner ve duvara yalnız gölgesi düşer; ışık döndükçe gölge değişir. Shadowmatic hissi, ama bilgi yarışmasında.',
           'Puan: erken bilen kazanır; ışık her saniye biraz döner ve şekli ele verir.',
           'Adalet: gölge herkes için aynı açıdan başlar ve aynı hızla döner.',
           'İçerik: haritadaki 23 maket hazır; yeni maketler eklendikçe büyür. Emek: S (maketler ve ışık var).']

DET[19] = ['Neden yeni: plaka kodları Türkiye’de herkesin bildiği gizli bir sayı sistemi; “İzmir + Ankara = Kocaeli” cümlesi bile güldürür.',
           'Biçimler: toplama, çıkarma (“Konya − Bursa = ?” → 26 Eskişehir), “iki katı” ve zincir işlemler.',
           'Adalet: cevap her zaman 1–81 arası; dört şık ya da haritada il.',
           'İçerik: sınırsız üretilir. Emek: S.']

T += [
    ('plaka', 19, 'Plaka Hesabı', '9', 'S', 'yeni', ['sayı', 'Türkiye'],
     'İllerin plaka kodlarıyla hesap yap. İzmir (35) + Ankara (06) = 41, yani Kocaeli.',
     ['İki ilin adı ve arada bir işlem gelir', 'Plaka kodlarını aklından topla ya da çıkar', 'Sonucun hangi il olduğunu seç'],
     'Türkiye’ye özgü, kimsenin yapmadığı bir fikir; “Konya eksi Bursa eşittir Eskişehir” cümlesi bile eğlenceli.'),
    ('hata', 20, 'Haritadaki Hata', '9,5', 'M', 'yeni', ['harita', 'gözlem'],
     'Haritada bilerek bir hata yapılmış: bir göl, nehir ya da yapı yanlış yerde. İlk fark eden kazanır.',
     ['Harita açılır, bir şey yanlış', 'Hatayı gördüğün an oraya dokun', 'Cevapta doğrusu yerine kayarak oturur'],
     '“Farkı bul” oyunu, ama bilgiyle. Örnekte Van Gölü Sivas’a taşınmış.'),
    ('tufan', 21, 'Tufan', '9,5', 'M', 'yeni', ['harita', '3B', 'sinematik'],
     'Deniz seviyesi yükselir. Hangi ilin en son ya da ilk batacağını bil.',
     ['Soru gelir: “Hangisi en son batar?”', 'Dört ilden birini seç', 'Cevapta deniz gerçekten yükselir, iller tek tek sular altında kalır'],
     'Oyunun 3B haritası sorunun kendisi olur; cevap anı bir felaket filmi gibi.'),
    ('artirma', 22, 'Artırma', '9,5', 'M', 'yeni', ['blöf', 'harita', 'düello'],
     '“Ege’nin illerinden 6’sını bulurum!” “Ben 7!” Sayıyı artır ya da rakibine “Göster!” de.',
     ['Sırayla kaç tane bulacağını söylersin', 'Rakip ya artırır ya “Göster!” der', 'Son söyleyen, söylediği kadarını süre içinde haritada bulur'],
     'Bilgi artı blöf. Kendine güvenen artırır, şüphelenen meydan okur.'),
    ('akil', 23, 'Akıl Okuma', '9', 'S', 'yeni', ['düello', 'sosyal'],
     'Soruyu cevaplarsın, sonra rakibinin ne cevap verdiğini tahmin edersin.',
     ['Önce kendi cevabını seç', 'Sonra “Arda ne dedi?” diye tahmin et', 'Doğru cevap ve doğru tahmin ayrı puan'],
     'Bilgi yarışmasına zihin okuma katar; arkadaşla oynarken çok güldürür.'),
    ('kayip', 24, 'Kayıp İl', '9', 'S', 'yeni', ['harita', 'şekil'],
     'Haritadan bir il silinmiş, yerinde simsiyah bir boşluk var. Hangi il?',
     ['Kamera boşluğun etrafında döner', 'Dört şıktan kayıp ili seç', 'Cevapta il gökten iner ve yerine oturur'],
     'İlleri adıyla değil şekli ve komşularıyla tanımayı ödüllendirir.'),
    ('yapboz', 25, 'Harita Yapbozu', '9', 'M', 'yeni', ['harita', 'el becerisi'],
     'Haritada üç boşluk, altta üç il parçası. Parçaları çevirip yerine oturt.',
     ['Parçayı sürükle', 'İki parmakla çevir', 'Doğru yere bırakınca “tık” diye oturur; en hızlı bitiren kazanır'],
     'Elle tutulur bir bulmaca; telefonda en tatmin edici dokunuş.'),
    ('sis', 26, 'Sisi Dağıt', '9', 'M', 'yeni', ['tahmin', 'hız'],
     'Büyük bir yapı sisin arkasında saklı. Hızlı sorulara doğru cevap verdikçe sis açılır; arkadakini ilk tanıyan kazanır.',
     ['Hızlı doğru/yanlış soruları gelir', 'Her doğru cevap bir sis bulutunu dağıtır', 'İstediğin an “Tahmin et” deyip yapıyı söyle'],
     'İki oyun bir arada: hızlı soru yarışı ve büyük bir “o ne?” bilmecesi.'),
    ('sifre', 27, 'Şifreli Harita', '9', 'S', 'yeni', ['harita', 'kelime'],
     'İller sırayla yanar, adları yazmaz. Baş harfleri bir kelime yazar: Sinop, Ankara, Rize, Aydın, Yozgat → SARAY.',
     ['İller teker teker parlar', 'Her ilin baş harfini aklında tut', 'Kelimeyi ilk yazan kazanır'],
     'Harita bir şifre çözücüye dönüşür; illeri tanıyan şifreyi okur.'),
    ('fitil', 28, 'Fitil', '9', 'M', 'yeni', ['düello', 'hız'],
     'Aranızda fitili yanan bir top var. Doğru cevap topu rakibe çevirir. Patladığında kime dönükse o kaybeder.',
     ['Art arda kısa sorular gelir', 'Doğru cevap topu rakibe, yanlış sana çevirir', 'Fitilin ne zaman biteceğini kimse bilmez'],
     'Sıcak patates, fetih hâli. Son saniyelerde nefes kesen bir düello.'),
    ('sive', 29, 'Şive Haritası', '9', 'S', 'yeni', ['kültür', 'harita'],
     'Yöresel bir söz gelir: “Ula, n’apıyon?” Hangi yörenin ağzı olduğunu haritada bulursun.',
     ['Söz kartta yazar', 'Haritada bölgeye dokun', 'Cevapta herkesin dokunuşu ısı haritası olarak yanar'],
     'Herkesin bir yöresi var; her soru “bizim oralarda böyle denir!” anı.'),
    ('golge', 30, 'Gölge Oyunu', '9,5', 'S', 'yeni', ['3B', 'tanıma'],
     'Bir yapının yalnız gölgesi duvara düşer. Işık döndükçe gölge değişir. Yapıyı tanı.',
     ['Duvarda bir gölge belirir', 'Işık yavaşça döner, şekil netleşir', 'Erken tanıyan çok puan alır'],
     'Oyunun 3B maketleriyle gölge bilmecesi; kimsenin yapmadığı bir şey.'),
]
