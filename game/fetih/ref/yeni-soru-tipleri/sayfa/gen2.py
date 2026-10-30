import re, json, base64, html
D = '/tmp/claude-0/-home-user/fe79b1eb-0adb-5b11-8d68-d1363e2a6c54/scratchpad/defter/'
SRC = '/home/user/GAME-/game/fetih/ref/yeni-soru-tipleri/defter.md'
OUT = D + 'defter.html'
GAL = 'https://claude.ai/artifact/M3YsYK34kRQds5QoRV6kQZ'
md = open(SRC, encoding='utf-8').read()
H = json.load(open(D + 'harita.json'))
PATHS = {int(k): v for k, v in H['paths'].items()}
C = {int(k): v for k, v in H['centers'].items()}
N = {int(k): v for k, v in H['names'].items()}
esc = lambda s: html.escape(s, quote=True)


def inline(s):
    s = html.escape(s, quote=False)
    s = re.sub(r'`([^`]+)`', r'<code>\1</code>', s)
    s = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', s)
    s = re.sub(r'(?<![\w*])\*([^*\s][^*]*)\*(?!\*)', r'<em>\1</em>', s)
    s = re.sub(r'(https?://[^\s<)·]+)', lambda m: f'<a href="{m.group(1)}" target="_blank" rel="noopener">{re.sub(r"^https?://(www[.])?", "", m.group(1))[:44]}</a>', s)
    return s


def block(text):
    lines = text.strip('\n').split('\n')
    out, i = [], 0
    while i < len(lines):
        ln = lines[i]
        if not ln.strip() or ln.strip() == '---':
            i += 1
            continue
        if ln.startswith('|'):
            rows = []
            while i < len(lines) and lines[i].startswith('|'):
                rows.append([c.strip() for c in lines[i].strip('|').split('|')])
                i += 1
            t = '<div class="tw"><table><thead><tr>' + ''.join(f'<th>{inline(c)}</th>' for c in rows[0]) + '</tr></thead><tbody>'
            t += ''.join('<tr>' + ''.join(f'<td>{inline(c)}</td>' for c in r) + '</tr>' for r in rows[2:]) + '</tbody></table></div>'
            out.append(t)
            continue
        m = re.match(r'^(- |\d+\. )', ln)
        if m:
            tag = 'ul' if m.group(1) == '- ' else 'ol'
            items = []
            while i < len(lines) and (re.match(r'^(- |\d+\. )', lines[i]) or (lines[i].startswith('  ') and items)):
                if lines[i].startswith('  ') and not re.match(r'^(- |\d+\. )', lines[i]):
                    items[-1] += ' ' + lines[i].strip()
                else:
                    items.append(re.sub(r'^(- |\d+\. )', '', lines[i]))
                i += 1
            out.append(f'<{tag}>' + ''.join(f'<li>{inline(x)}</li>' for x in items) + f'</{tag}>')
            continue
        para = []
        while i < len(lines) and lines[i].strip() and not re.match(r'^(- |\d+\. |\|)', lines[i]):
            para.append(lines[i].strip())
            i += 1
        out.append('<p>' + inline(' '.join(para)) + '</p>')
    return '\n'.join(out)


secs = {}
for part in re.split(r'\n## ', md)[1:]:
    title, _, body = part.partition('\n')
    secs[title.split('.', 1)[0].strip()] = body
concepts = {}
for c in re.split(r'\n### ', secs['4'])[1:]:
    t, _, b = c.partition('\n')
    concepts[int(t.split('.')[0])] = b

# ---------- harita çizimi ----------
DEFS = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><g id="tr">' + ''.join(
    f'<path id="p{k}" d="{v}" vector-effect="non-scaling-stroke"/>' for k, v in PATHS.items()) + '</g></defs></svg>'


def vb(ids, pad=3.0, aspect=300 / 300):
    xs = [C[i][0] for i in ids]
    ys = [C[i][1] for i in ids]
    x0, x1, y0, y1 = min(xs) - pad, max(xs) + pad, min(ys) - pad, max(ys) + pad
    w, h = x1 - x0, y1 - y0
    if w / h > aspect:
        nh = w / aspect
        y0 -= (nh - h) / 2
        h = nh
    else:
        nw = h * aspect
        x0 -= (nw - w) / 2
        w = nw
    return f'{x0:.1f} {y0:.1f} {w:.1f} {h:.1f}', w


def tag(i, text, w, cls=''):
    x, y = C[i]
    fs = w / 22
    return f'<g class="tg {cls}" transform="translate({x:.1f} {y:.1f})"><text font-size="{fs:.2f}" y="{fs * .35:.2f}">{esc(text)}</text></g>'


def mapsvg(ids, hl=(), extra='', pad=3.0, aspect=1.0):
    v, w = vb(ids, pad, aspect)
    s = f'<svg class="mp" viewBox="{v}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect x="-80" y="-60" width="160" height="120" class="sea"/><use href="#tr" class="land"/>'
    for i, cls in hl:
        s += f'<use href="#p{i}" class="{cls}"/>'
    return s + extra.replace('{W}', f'{w:.2f}') + '</svg>', w


# ---------- telefon çerçevesi ----------
def hud(players=(('Sen', '2.400', 'r'), ('Arda', '2.200', 'b'))):
    return '<div class="hud">' + ''.join(f'<span class="pl {c}"><i></i><b>{n}</b><em>{s}</em></span>' for n, s, c in players) + '</div>'


def card(cat, typ, sec, q, body, pct=72, sub=''):
    return f'''<div class="qc"><div class="qh"><span class="cat">{cat}</span><span class="tp">{typ}</span>{f'<span class="sb">{sub}</span>' if sub else ''}<span class="tm">{sec}</span></div>
<div class="tb"><i style="width:{pct}%"></i></div><div class="qt">{q}</div>{body}</div>'''


def opts(lst, dim=(), pick=None):
    L = 'ABCD'
    return '<div class="ops">' + ''.join(
        f'<span class="op o{L[k]}{" dim" if k in dim else ""}{" pk" if k == pick else ""}"><i>{L[k]}</i>{esc(t)}</span>' for k, t in enumerate(lst)) + '</div>'


def jokers(n=6):
    J = [('50/50', 'j1'), ('Seyirci', 'j2'), ('Süre', 'j3'), ('Şans', 'j4'), ('Sabotaj', 'j5'), ('Kalkan', 'j6')][:n]
    return '<div class="jk">' + ''.join(f'<span class="{c}">{t}</span>' for t, c in J) + '</div>'


def army(i, dx, cls, sc, n=12):
    x0, y0 = C[i][0] + dx * sc, C[i][1]
    out = ''
    for k in range(n):
        r, col = divmod(k, 4)
        out += f'<circle cx="{x0 + (col * .55 - .8 + (r % 2) * .25) * sc:.2f}" cy="{y0 + (r * .5 - .5) * sc:.2f}" r="{.2 * sc:.2f}" class="sold {cls}"/>'
    return out


def duelmap(ids=(16, 11, 43, 54, 41, 10, 26, 77), a=16, d=11, dname='Bilecik'):
    aspect = 300 / 340
    _, w = vb(list(ids), 2.2, aspect)
    sc = w / 14
    ext = army(a, .9, 'r', sc) + army(d, 0.3, 'b', sc) + tag(d, dname, w, 'tgt').replace('translate(' + f'{C[d][0]:.1f} {C[d][1]:.1f}', 'translate(' + f'{C[d][0]:.1f} {C[d][1] - w / 9:.1f}')
    m, w = mapsvg(list(ids), hl=[(a, 'own'), (d, 'foe')], extra=ext, pad=2.2, aspect=aspect)
    return f'<div class="mapb top">{m}</div>'


def vs(cat_il='Bilecik'):
    return f'<div class="vs"><span class="vp r"><i></i><b>Sen</b><em>SALDIRAN</em></span><span class="vv">VS<small>{cat_il}</small></span><span class="vp b"><b>Arda</b><em>SAVUNAN</em><i></i></span></div>'


DUEL = duelmap()
m_, w_ = mapsvg([16, 11, 43, 54, 41, 10, 26, 77], hl=[(16, 'own'), (11, 'foe'), (43, 'yel'), (10, 'grn')], pad=2.2, aspect=300 / 340)
DUEL_ALL = f'<div class="mapb top">{m_}</div>'


def phone(inner, map_html='', cls=''):
    return f'<div class="mk {cls}">{map_html}{inner}</div>'


img = lambda n: 'data:image/jpeg;base64,' + base64.b64encode(open(D + n, 'rb').read()).decode()

# prototiplerin gerçek ekranı: soru anı (sol yarı)
from PIL import Image
for k in ['kusbakisi', 'kosu', 'ilavi', 'baglanti']:
    im = Image.open(D + k + '.jpg').crop((0, 0, 300, 553))
    im.save(D + k + '_q.jpg', quality=82)

MK = {}
for k in ['kusbakisi', 'kosu', 'ilavi', 'baglanti']:
    MK[k] = f'<div class="mk shot"><img src="{img(k + "_q.jpg")}" alt="Oyundan gerçek ekran" width="300" height="553" loading="lazy"></div>'

# 5 Sefer Yolu: Ankara → Kırıkkale → Yozgat, sıradaki komşular parlıyor, hedef Trabzon
route = [6, 71, 66]
nxt = [5, 19, 38, 40, 50, 58, 60]
ext = ''.join(f'<line x1="{C[a][0]:.1f}" y1="{C[a][1]:.1f}" x2="{C[b][0]:.1f}" y2="{C[b][1]:.1f}" class="rt"/>' for a, b in zip(route, route[1:]))
ext += ''.join(f'<circle cx="{C[i][0]:.1f}" cy="{C[i][1]:.1f}" r="{{W}}" class="dot"/>' for i in route).replace('r="{W}"', 'r="0.9"')
ext += f'<g transform="translate({C[61][0]:.1f} {C[61][1]:.1f})"><circle r="2.4" class="goal"/><path d="M-.2 -3.6v3.4M-.2 -3.6l2.4 .8-2.4 .8" class="flag"/></g>'
ext += tag(6, 'Ankara', 30, 'own') + tag(61, 'Trabzon', 30, 'tgt').replace('translate(' + f'{C[61][0]:.1f} {C[61][1]:.1f}', 'translate(' + f'{C[61][0]:.1f} {C[61][1] + 3.6:.1f}') + tag(66, 'Yozgat', 30, 'own')
m, w = mapsvg([6, 61, 66, 58, 28, 53, 29], hl=[(i, 'own') for i in route] + [(i, 'cand') for i in nxt] + [(61, 'tgtp')], extra=ext, pad=4, aspect=300 / 330)
MK['sefer'] = phone(hud() + card('Coğrafya', 'SEFER YOLU', 26, 'Ordunu Ankara’dan Trabzon’a en kısa yoldan götür!',
    '<div class="row"><span class="stat"><b>2</b> adım</span><span class="stat">en kısa: <b>5</b></span><span class="chipb">↶ Geri al</span></div><p class="hint">Sadece parlayan komşu illere dokunabilirsin</p>', 80), f'<div class="mapb">{m}</div>')

# 6 Halat Çekme
rope = '''<svg class="rope" viewBox="0 0 280 54" aria-hidden="true"><line x1="10" y1="27" x2="270" y2="27" class="rp"/><line x1="140" y1="12" x2="140" y2="42" class="mid"/>
<g transform="translate(104 27)"><rect x="-9" y="-13" width="18" height="26" rx="5" class="knot"/></g>
<circle cx="18" cy="27" r="13" class="av r"/><circle cx="262" cy="27" r="13" class="av b"/></svg>'''
MK['halat'] = phone(hud() + f'<div class="duel">{rope}<div class="sc"><b>4</b><span>–</span><b>3</b></div></div>' + '<div class="low">' + card('Tarih', 'HALAT ÇEKME', 12,
    'Sakarya Meydan Muharebesi 1921’de yapıldı.', '<div class="tf"><span class="yes">DOĞRU</span><span class="no">YANLIŞ</span></div><p class="hint">Her doğru cevap halatı bir adım sana çeker</p>', 60) + '</div>', DUEL, 'duelm')

# 7 Mancınık
cat = '''<svg class="cata" viewBox="0 0 280 120" aria-hidden="true"><path d="M8 112h264" class="gr"/>
<path d="M40 106 C 90 10, 170 0, 214 58" class="arc"/><path d="M40 106 C 100 -10, 200 -20, 262 40" class="arc over"/>
<g transform="translate(26 100)"><rect x="-14" y="0" width="34" height="8" rx="2" class="wood"/><path d="M0 0 L22 -26" class="arm"/><circle cx="22" cy="-27" r="5" class="stone"/></g>
<g transform="translate(212 58)"><rect x="0" y="0" width="22" height="54" class="wall"/><path d="M0 0h5v-6h4v6h4v-6h4v6h5v0" class="wall"/></g>
<text x="223" y="52" class="lbl">5.137 m</text><text x="250" y="30" class="lbl warn">AŞTI!</text></svg>'''
MK['mancinik'] = phone(hud() + card('Coğrafya', 'MANCINIK', 21, 'Ağrı Dağı’nın yüksekliği kaç metre?',
    '<div class="val">4.900 <small>m</small></div><div class="sl"><i style="width:62%"></i><b style="left:62%"></b></div><div class="row"><span class="kb">−100</span><span class="kb">−10</span><span class="kb">+10</span><span class="kb">+100</span></div><div class="warnbar">AŞMA! Gerçek değeri geçen kaybeder</div><span class="send">FIRLAT</span>', 70) + f'<div class="cat-wrap">{cat}</div>', '', 'dark')

# 8 Ezgi Avı
notes = ''.join(f'<i class="{"on" if k < 4 else ""}">{"♪" if k < 4 else ""}</i>' for k in range(16))
MK['ezgi'] = phone(hud() + '<div class="low">' + vs() + card('Müzik', 'EZGİ AVI', 18, 'Bu türkü hangisi?',
    f'<div class="play"><span class="pb">▶</span><div class="nts">{notes}</div></div><p class="hint">4 nota çaldı · şimdi bilirsen 3 kat puan</p>' + opts(['Üsküdar’a Gider İken', 'Çanakkale Türküsü', 'Sarı Gelin', 'Yemen Türküsü']), 74) + '</div>', DUEL, 'duelm')

# 9 Kimim Ben?
clues = [('Ani Harabeleri bendedir.', 1), ('Kaşarım ve kazım ünlüdür.', 1), ('Doğu Ekspresi’nin son durağıyım.', 0), ('Ermenistan’a sınırım var.', 0), ('Plakam 36.', 0)]
cl = '<ol class="clues">' + ''.join(f'<li class="{"oc" if o else "lk"}"><b>{k + 1}</b>{esc(t) if o else "3 sn sonra açılır"}</li>' for k, (t, o) in enumerate(clues)) + '</ol>'
m, w = mapsvg([25, 36, 76, 4, 69, 24, 65, 61, 21, 13], hl=[], pad=3, aspect=300 / 220)
MK['kimim'] = phone(hud() + card('Coğrafya', 'KİMİM BEN?', 19, 'Ben bir ilim. Kimim?', cl + '<p class="hint">Bildiğin an ile haritada dokun</p>', 66), f'<div class="mapb low">{m}</div>')

# 10 Az Bilinen
bars = [('İzmir', 46, 54, ''), ('Muğla', 21, 79, ''), ('Aydın', 18, 82, ''), ('Uşak', 3, 97, 'me')]
bh = '<div class="bars">' + ''.join(f'<div class="br {c}"><span class="bn">{n}{" · Sen" if c else ""}</span><span class="bt"><i style="width:{p * 2}%"></i></span><span class="bp">%{p}</span><b>{s}</b></div>' for n, p, s, c in bars) + '</div>'
MK['azbilinen'] = phone(hud() + '<div class="low"><div class="rib">YAYILMA · Herkes cevaplıyor</div>' + card('Coğrafya', 'AZ BİLİNEN', 0, 'Ege Bölgesi’nden bir il seç. Az kişi seçerse çok puan!',
    bh + '<p class="hint">Cevap ekranı: oran ne kadar düşükse puan o kadar yüksek (örnek oranlar)</p>', 0) + '</div>', DUEL_ALL, 'duelm')

# 11 Asker Bahsi
MK['bahis'] = phone(hud() + '<div class="low">' + vs() + card('Tarih', 'ASKER BAHSİ', 20, 'İstanbul hangi yıl fethedildi?',
    '<div class="bet"><span class="bl">Kaç asker yatırıyorsun?</span><div class="bs"><span>1</span><span>2</span><span class="on">3</span></div><span class="bx">Bilirsen <b>+3 güç</b> · bilemezsen <b>−3 asker</b></span></div>' + opts(['1453', '1071', '1299', '1516']), 78) + '</div>', DUEL, 'duelm')

# 12 Bir İşlem
tiles = ''.join(f'<span class="nt{" used" if t in ("75", "7") else ""}">{t}</span>' for t in ['3', '7', '9', '2', '5', '75'])
MK['islem'] = phone(hud() + '<div class="low">' + vs() + card('Zekâ', 'BİR İŞLEM', 38, 'Altı sayıyla hedefe ulaş',
    f'<div class="tgt">532</div><div class="nts2">{tiles}</div><div class="ops2"><span>+</span><span>−</span><span>×</span><span>÷</span></div><div class="work">75 × 7 = <b>525</b></div><span class="send">GÖNDER</span>', 64) + '</div>', DUEL, 'duelm')

# 13 Harf Al
word = 'KAPADOKYA'
shown = {0, 6, 7}
bx = ''.join(f'<i class="{"on" if k in shown else ""}">{ch if k in shown else ""}</i>' for k, ch in enumerate(word))
MK['harfal'] = phone(hud() + '<div class="low">' + vs() + card('Coğrafya', 'HARF AL', 30, 'Peri bacalarıyla ünlü bölge',
    f'<div class="boxes">{bx}</div><div class="row"><span class="stat">Bu kelime: <b>600</b> puan</span></div><div class="row two"><span class="send gold">HARF AL</span><span class="send green">BİLDİM</span></div><p class="hint">Her harf 100 puan; aldığın her harf puanı düşürür</p>', 68) + '</div>', DUEL, 'duelm')

# 14 Harita Hafızası
seq = [35, 42, 55, 25]
ext = ''.join(f'<g transform="translate({C[i][0]:.1f} {C[i][1]:.1f})"><circle r="2.6" class="num"/><text y="1.05" font-size="3">{k + 1}</text></g>' for k, i in enumerate(seq))
m, w = mapsvg([35, 42, 55, 25, 22, 76, 9, 48], hl=[(i, 'glow') for i in seq], extra=ext, pad=4, aspect=300 / 320)
MK['hafiza'] = phone(hud() + card('Zekâ', 'HARİTA HAFIZASI', 15, 'İzle, sonra aynı sırayla dokun',
    '<div class="dots"><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i></i></div><p class="hint">Her il yanınca bir nota çalar · her turda bir il eklenir</p>', 85), f'<div class="mapb">{m}</div>')

# 15 Yanlışı Bul
words = ['İstanbul', '1435', 'yılında', 'Fatih', 'Sultan', 'Mehmet', 'tarafından', 'fethedildi.']
sent = '<div class="sent">' + ''.join(f'<span class="{"bad" if w_ == "1435" else ""}">{w_}</span>' for w_ in words) + '</div>'
MK['yanlis'] = phone(hud() + '<div class="low">' + vs() + card('Tarih', 'YANLIŞI BUL', 22, 'Cümledeki yanlış kelimeye dokun, sonra düzelt',
    sent + '<p class="hint">Doğrusu hangisi?</p><div class="ops3"><span class="pk">1453</span><span>1071</span><span>1299</span></div>', 58) + '</div>', DUEL, 'duelm')

# 16 İki Doğru Bir Yalan
st = ['Giresun’un Kuşköy’ünde ıslıkla konuşulur.', 'Türkiye’nin en yüksek dağı Erciyes’tir.', 'Van Gölü Türkiye’nin en büyük gölüdür.']
MK['ikidogru'] = phone(hud() + '<div class="low">' + vs() + card('Genel Kültür', 'İKİ DOĞRU BİR YALAN', 24, 'Hangisi yalan?',
    '<div class="stm">' + ''.join(f'<span><i>{k + 1}</i>{esc(t)}</span>' for k, t in enumerate(st)) + '</div>', 70) + '</div>', DUEL, 'duelm')

# 17 Blöf
MK['blof'] = phone(hud((('Sen', '2.400', 'r'), ('Arda', '2.200', 'b'), ('Elif', '1.900', 'y'), ('Mert', '1.700', 'g'))).replace('class="hud"', 'class="hud four"') + '<div class="low"><div class="rib">YAYILMA · Herkes cevaplıyor</div>' + card('Tarih', 'BLÖF', 20, '“Ayasofya” adı ne anlama gelir?',
    '<p class="hint left">Rakiplerini kandıracak <b>sahte</b> cevabı seç:</p><div class="ops3 col"><span>Büyük Kubbe</span><span class="pk">Altın Kapı</span><span>Işık Evi</span></div><p class="hint">Sonra herkesin sahtesi gerçek cevapla karışık gösterilir. Kandırdığın her rakip için puan.</p>', 76) + '</div>', DUEL_ALL, 'duelm')

# 18 Dürbün Avı
fx, fy = C[66][0] + 1.2, C[66][1] + 0.8
ext = f'<g transform="translate({fx:.1f} {fy:.1f})" class="hid"><path d="M0 0v-1.5M0 -1.5l1 .35-1 .35z" /><circle r=".15" /></g>'
m, w = mapsvg([6, 58, 66, 38, 19, 50], hl=[], extra=ext, pad=1.5, aspect=300 / 300)
MK['durbun'] = phone(hud() + card('Gözlem', 'DÜRBÜN AVI', 25, 'Haritada saklı sancağı ilk sen bul!',
    '<p class="hint">Kaydır, yakınlaştır, gördüğün an dokun</p>', 76), f'<div class="mapb scope">{m}<i class="ring"></i></div>')

# ---------- kartlar ----------
T = [
    ('kusbakisi', 1, 'Kuşbakışı', '9,5', 'M', 'proto', ['harita', 'tanıma'],
     'Kamera bir yapının dibinden başlar, yükseldikçe çevre görünür. Yeri erkenden tanıyan kazanır.',
     ['Kamera maketin dibinden yavaşça yükselir', 'Dört şıktan ili ya da yapıyı seç', 'Ne kadar erken doğru basarsan o kadar iyi'],
     'Her soru küçük bir film; tanıdığın yeri yukarıdan görmek “aa, burası!” dedirtir.'),
    ('kosu', 2, 'Fetih Koşusu', '9', 'M', 'proto', ['harita', 'hız'],
     'Kurala uyan illeri süre bitmeden haritada bul. Bulduğun her il senin rengine boyanır.',
     ['Kural gelir: “Ege’nin 8 ilini fethet!”', 'Haritada illere dokun, doğrular boyanır', 'Yanlış dokunursan 0,8 sn kilitlenirsin'],
     'Oyunun asıl zevki olan toprak boyamayı soru sırasında yaşatır.'),
    ('ilavi', 3, 'İl Avı · Sıcak Soğuk', '9', 'M', 'proto', ['harita', 'çıkarım'],
     'Gizli bir ilin silueti ve bir ipucu var. Her tahminde ne kadar yaklaştığını görürsün.',
     ['Haritada bir ile dokun', 'Yanlışsa il uzaklığa göre renklenir: kırmızı yakın, mavi uzak', 'Her yanlışta yeni ipucu açılır, 4 hakkın var'],
     'Bilmeyen bile iz sürerek bulur. Wordle hissi, ama düelloda.'),
    ('baglanti', 4, 'Bağlantı Duvarı', '8,5', 'M', 'proto', ['kelime', 'akıl'],
     '12 kelimeyi dörderli 3 gizli gruba ayır. Bazı kelimeler iki gruba birden uyar.',
     ['Dört kelime seç, DENE’ye bas', 'Üçü doğruysa “biri yanlış!” uyarısı gelir', '3 canın var'],
     '“Aha!” anı en güçlü tip; her kategoriye uyar.'),
    ('sefer', 5, 'Sefer Yolu', '8,5', 'M', '', ['harita', 'planlama'],
     'Ordunu bir ilden diğerine, komşu illerden geçerek en kısa yoldan götür.',
     ['Başlangıç ili parlar, hedefte sancak var', 'Sadece son ilin komşularına dokunabilirsin', 'Hedefe varınca ordun yolu yürür; az adım çok puan'],
     'Fetih temasına tam oturur; Türkiye’nin komşuluklarını oynatarak öğretir.'),
    ('halat', 6, 'Halat Çekme', '8,5', 'M', '', ['düello', 'hız'],
     '20 saniyelik canlı düello. Art arda hızlı sorular gelir, her doğru cevap halatı sana çeker.',
     ['Doğru/Yanlış soruları peş peşe gelir', 'Senin doğrun halatı sana, rakibin doğrusu ona çeker', 'Süre bitince halat kimin tarafındaysa o kazanır'],
     'İki oyuncu birbirini anlık görür; en gerilimli 20 saniye.'),
    ('mancinik', 7, 'Mancınık', '8', 'S', '', ['tahmin', 'risk'],
     'Sayıyı tahmin et ama gerçek değeri aşma. Aşarsan taşın surun üstünden uçar.',
     ['Kaydırıcı mancınığın gücü', 'Gerçek değere en yakın ama altında kalan kazanır', 'Aşan herkes en sona düşer'],
     'Temkinli mi oynayacaksın, cesur mu? Her tahmin gerçek bir karar.'),
    ('ezgi', 8, 'Ezgi Avı', '9', 'M', '', ['ses', 'hafıza'],
     'Bir türkünün ilk notaları çalar. Ne kadar az notada bilirsen o kadar çok puan alırsın.',
     ['Önce 2 nota, sonra 4, 8, 16', 'Bildiğin an dört şıktan türküyü seç', 'Erken basan çok puan alır'],
     'Rakiplerde ses sorusu yok; herkesin bildiği türküler nostalji yaratır. Notaları bir müzisyenin yazması gerekir.'),
    ('kimim', 9, 'Kimim Ben?', '8', 'M', '', ['harita', 'cesaret'],
     '“Ben bir ilim” der, ipuçları zordan kolaya açılır. İstediğin an haritada ile dokunursun.',
     ['Her 3 saniyede yeni ipucu açılır', 'Bildiğin an ile dokun; erken bilen çok puan alır', 'Yanlış dokunuş 2 sn kilitler'],
     '81 il var, şansa basmak işe yaramaz; cesaret ödüllendirilir.'),
    ('azbilinen', 10, 'Az Bilinen', '8', 'M', '', ['bilgi derinliği'],
     'Doğru cevaplar arasında en az seçilen en çok puanı alır.',
     ['Çok cevaplı soru gelir: “Ege’den bir il seç”', 'Herkes bir cevap seçer', 'İzmir diyen az, Uşak diyen çok puan alır'],
     'Herkesin bildiğini değil, az bilineni ödüllendirir.'),
    ('bahis', 11, 'Asker Bahsi', '8', 'M', '', ['strateji', 'özgüven'],
     'Cevaplamadan önce kaç asker yatıracağını seçersin. Bilirsen saldırın güçlenir, bilemezsen asker kaybedersin.',
     ['Soruyu gör, 1–3 asker yatır', 'Sonra cevapla', 'Doğruysa yatırdığın kadar güç, yanlışsa o kadar kayıp'],
     'Her soruya strateji katar. Ayrı bir tip değil, her soruya eklenebilen bir katman.'),
    ('islem', 12, 'Bir İşlem', '7,5', 'M', '', ['aritmetik', 'akıl'],
     'Altı sayı ve dört işlemle hedef sayıya ulaş. TRT’nin efsane yarışmasındaki tur.',
     ['Hedef sayı ve altı sayı gelir', 'Sayılara ve işlemlere dokunarak hesap kur', 'Tam tutturan ya da en yakın kazanır'],
     'Kuşaklar boyu bilinen bir oyun; bilgisiz de oynanır.'),
    ('harfal', 13, 'Harf Al', '7', 'S', '', ['kelime'],
     'Tanımı okuyup kelimeyi bul. Harf aldıkça kazanacağın puan düşer.',
     ['Her harf 100 puan değerinde', '“HARF AL” bir harf açar, puanı 100 düşürür', 'Bildiğin an yaz ve gönder'],
     'Kelime Oyunu’nun çekirdeği; ne zaman cesaret edeceğin sana kalmış.'),
    ('hafiza', 14, 'Harita Hafızası', '7', 'S', '', ['harita', 'hafıza'],
     'İller sırayla yanar ve birer nota çalar. Aynı sırayla dokunursun.',
     ['Sırayı izle', 'Aynı sırayla illere dokun', 'Her turda bir il eklenir'],
     'Simon oyunu, Türkiye haritasında. Bilgi gerektirmez.'),
    ('yanlis', 15, 'Yanlışı Bul', '7', 'S', '', ['okuma', 'bilgi'],
     'Cümlede bir kelime yanlış. Önce onu bul, sonra doğrusunu seç.',
     ['Yanlış kelimeye dokun', 'Üç seçenekten doğrusunu seç', 'İkisini de bilen tam puan alır'],
     'Dikkatli okumayı ödüllendirir; iki aşamalı bilgi.'),
    ('ikidogru', 16, 'İki Doğru Bir Yalan', '7', 'S', '', ['bilgi', 'sezgi'],
     'Üç şaşırtıcı bilgiden biri yalan. Hangisi?',
     ['Üç kartı oku', 'Yalan olana dokun', 'Cevapta doğru bilgilerin kısa açıklaması çıkar'],
     '“Bunu bilmiyordum!” anı; paylaşmalık şaşkınlık.'),
    ('blof', 17, 'Blöf', '8', 'L', '', ['parti', '3–4 kişi'],
     'Herkes rakiplerine göstereceği sahte bir cevap seçer. Sonra herkes gerçeği bulmaya çalışır.',
     ['Soruyu görürsün, rakipleri kandıracak bir sahte cevap seçersin', 'Bütün sahteler gerçek cevapla karışık gösterilir', 'Gerçeği bulana puan, kandırdığın her rakip için ayrıca puan'],
     'Oyuncuların birbirini kandırması en çok güldüren an. 3–4 kişilik maçlar için.'),
    ('durbun', 18, 'Dürbün Avı', '7,5', 'L', '', ['harita', 'gözlem'],
     'Haritanın bir yerine küçük bir sancak saklanmıştır. İlk bulan kazanır.',
     ['Haritayı kaydır ve yakınlaştır', 'Sancağı görünce dokun', 'İlk bulan kazanır'],
     '“Waldo nerede?” hissi; haritayı keşfettirir.'),
]

exec(open(D + 'ek.py', encoding='utf-8').read())
cards = ''
for key, n, name, wow, eff, st, tags, what, how, why in T:
    proto = st == 'proto'
    if n == 19:
        cards += '<div class="sep" id="yeni"><b>YENİ EKLENENLER</b><span>19–30 · hepsi wow 9 ve üstü · kaldığın yerden devam et</span></div>'
    chip = f'<a class="chip play" href="{GAL}#{key}" target="_blank" rel="noopener">Galeride oyna →</a>' if proto else ('<span class="chip new">Yeni öneri · çizim</span>' if st == 'yeni' else '<span class="chip draft">Taslak · çizim</span>')
    cards += f'''
<article class="tc" data-k="{key}" id="t-{key}">
  <div class="vis">{MK[key]}</div>
  <div class="tx">
    <div class="th"><span class="no">{n}</span><h3>{esc(name)}</h3><span class="wow" title="İlk görüşteki etki, 10 üzerinden">{wow}</span></div>
    <div class="tags">{chip}{''.join(f'<span class="tg2">{esc(t)}</span>' for t in tags)}</div>
    <p class="what">{esc(what)}</p>
    <ol class="how">{''.join(f'<li>{esc(h)}</li>' for h in how)}</ol>
    <p class="why">{esc(why)}</p>
    <details class="more"><summary>Ayrıntı</summary><div class="dd">{block(concepts[n]) if n in concepts and n <= 18 else '<ul>' + ''.join(f'<li>{esc(x)}</li>' for x in DET.get(n, [])) + '</ul>'}</div></details>
    <div class="dec" role="group" aria-label="{esc(name)} için karar">
      <button type="button" class="b-tut" data-v="tut" id="tut-{key}" aria-pressed="false">✓ Tut</button>
      <button type="button" class="b-ele" data-v="ele" id="ele-{key}" aria-pressed="false">✕ Ele</button>
    </div>
  </div>
</article>'''

page = open(D + 'sablon.html', encoding='utf-8').read()
page = page.replace('{{DEFS}}', DEFS).replace('{{CARDS}}', cards).replace('{{RESEARCH}}', block(secs['2'])).replace('{{GAL}}', GAL)
open(OUT, 'w', encoding='utf-8').write(page)
print(len(page))
