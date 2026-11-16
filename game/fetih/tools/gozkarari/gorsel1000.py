# 1000 yeni görselin teslim dosyaları: python3 -I tools/gozkarari/gorsel1000.py
#   Kaynak (soru, şık, bilgi, komut): tools/gozkarari/P9–P12.md (Göz Kararı GK-511–1310) ve tools/yapi/Y1–Y2.md (yapı YP-101–300)
#   Çıktı (depo kökü):
#     GORSEL-1000.md          kullanıcının okuduğu özet: her görselin numarası, hangi soru tipine gittiği, sorusu ve cevabı
#     GORSEL-1000-K1..K5.md   ChatGPT'ye verilecek parçalar (200'er görsel): yalnız talimat + komutlar (soru/cevap yok:
#                             görsele yazı sızmasın), her parça kendi ZIP adıyla
# Biçim denetimi de yapar: ayrıştırılamayan madde, eksik/çift numara varsa durur.
import os, re, sys, glob

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
GK = re.compile(r'^### (GK-\d{3,4}) · ([^·]+) · ([^·]+) · Zorluk (\d) · Gösterim: ([^\n]+)\n```\n(.*?)\n```\n- \*\*Soru:\*\* (.*?)\n- \*\*Şıklar:\*\* (.*?)\n- \*\*Bilgi:\*\* (.*?)$', re.M | re.S)
YP = re.compile(r'^### (YP-\d{3}) · ([^·]+) · Zorluk (\d) · Tipler: ([^\n]+)\n```\n(.*?)\n```\n((?:- \*\*[^\n]+\n?)+)', re.M | re.S)
ALAN = re.compile(r'^- \*\*([^:*]+):\*\* (.*)$', re.M)


def oku_gk():
    out = []
    for f in sorted(glob.glob(os.path.join(ROOT, 'tools', 'gozkarari', 'P*.md')), key=lambda p: int(re.findall(r'P(\d+)', p)[-1])):
        if int(re.findall(r'P(\d+)', f)[-1]) < 9:
            continue
        for m in GK.finditer(open(f).read()):
            gid, konu, us, z, g, cmd, q, s, b = m.groups()
            dogru = [o.replace('✅', '').strip() for o in s.split('·') if '✅' in o][0]
            out.append(dict(id=gid, konu=konu.strip(), us=us.strip(), z=int(z), g=g.strip(), cmd=cmd.strip(), q=q.strip(), dogru=dogru, b=b.strip()))
    return out


def oku_yp():
    out = []
    for f in sorted(glob.glob(os.path.join(ROOT, 'tools', 'yapi', 'Y*.md'))):
        for m in YP.finditer(open(f).read()):
            yid, bolge, z, tip, cmd, alanlar = m.groups()
            a = dict(ALAN.findall(alanlar))
            kazi = [o.replace('✅', '').strip() for o in a['Kazı şıkları'].split('·') if '✅' in o][0]
            out.append(dict(id=yid, bolge=bolge.strip(), z=int(z), tip=tip.strip(), cmd=cmd.strip(), ad=a['Yapı'], yer=a['Yer'], kq=a['Kazı sorusu'], kdogru=kazi, golge='Gölge' in tip))
    return out


gk, yp = oku_gk(), oku_yp()
no = lambda s: int(s.split('-')[1])
hata = []
if len({x['id'] for x in gk}) != len(gk): hata.append('GK numarası iki kez')
if [no(x['id']) for x in yp] != list(range(101, 101 + len(yp))): hata.append('YP numaraları sıralı/eksiksiz değil')
for x in gk + yp:
    if not x['cmd'].endswith('no logo'): hata.append(x['id'] + ': komut "no logo" ile bitmiyor')
if hata:
    sys.exit('\n'.join(hata))
print('Göz Kararı', len(gk), '· yapı', len(yp))

ORTAK = '''2. Bana hiçbir soru sorma, onay bekleme, ara özet yazma. Bir görsel bitince hemen sıradakine geç. Sınıra takılıp durursan, ben "devam" yazınca kaldığın numaradan sürdür.
3. Her görselin altına yalnızca numarasını yaz ve görseli o adla sakla ({ornek}.png).
4. Hepsi bitince bütün görselleri TEK bir ZIP dosyasında ver: adı **{zip}**, içinde **{ilk}.png … {son}.png** ve **bu dosyanın kendisi ({md})**. Üretemediğin numara olursa ZIP'ten sonra listesini yaz.'''

KURAL_GK = '''**Her görselde geçerli kurallar:**
- Yatay 4:3 oran.
- Görselde hiçbir yazı, harf, rakam, imza, filigran ya da logo olmayacak.
- Gerçek bir kişinin yüzü ya da benzeri olmayacak; insanlar genel ve isimsiz figürler olacak (tablolar hariç, aşağıya bak).
- Konu tek, net ve ortada olacak; kenarlardan taşmayacak, arka plan sade olacak.
- Komutta yazan üsluba tam sadık kal; üslupları birbirine karıştırma.'''

KURAL_TABLO = '''**Tablolar ({ilk} – {son}):** Bunlar telifi dolmuş, kamu malı ünlü tabloların yeniden üretimi. Tabloyu aslına olabildiğince sadık çiz: kompozisyon, renkler, figürlerin yeri ve duruşu orijinaldeki gibi olsun. Tablodaki figürler için "gerçek kişi yüzü yok" kuralı geçerli değil, orijinalde nasılsa öyle. Yazı, imza, çerçeve ve filigran yine olmayacak. Dikey tabloları yatay 4:3 tuvalin ortasına sığdır, yanları sade koyu müze duvarı olsun.'''

KURAL_PORTRE = '''**Ünlü kişi portreleri ({ilk} – {son}):** Bu maddelerde gerçek kişinin YÜZÜ İSTENİYOR; "gerçek kişi yüzü yok" kuralı bu maddelerde geçerli değil. Hepsi en geç 1955'te ölmüş tarihî kişiler; her komut telifi dolmuş ünlü bir tablonun ya da fotoğrafın aslına sadık yeniden üretimini istiyor. Kişi kendisine olabildiğince benzesin; kaynak tabloysa kompozisyon ve renkler aslındaki gibi, fotoğrafsa siyah-beyaz arşiv fotoğrafı görünümünde olsun. Yazı, imza, çerçeve ve filigran yine olmayacak.'''

KURAL_YP = '''**Her görselde geçerli kurallar:**
- Kare 1:1 (1024×1024).
- Dış zemin SAF BEYAZ (#FFFFFF), düz; zemin, gökyüzü, manzara, insan, araç, gölge YOK. Yapı tek başına, bütünüyle ve ortada; dört kenarda boşluk kalsın.
- Beyaz ya da açık renkli yapılar (mermer, badana) fildişi/açık taş tonunda ve gölgeli çizilsin ki beyaz zeminden ayrılsın.
- Görselde hiçbir yazı, harf, rakam, tabela, yazıt, imza, filigran ya da logo olmayacak.
- Yapı gerçeğine sadık olsun: kule, kubbe, minare, kemer sayısı ve biçimi komutta nasılsa öyle.
- Bütün görseller aynı üslupta: komutun sonundaki 3D mimari maket üslubu.'''


PORTRE = {'Bilim insanları', 'Tarihî kişiler', 'Yazarlar ve şairler', 'Ressamlar ve besteciler'}


def parca(k, ad, liste, tur):
    ilk, son = liste[0]['id'], liste[-1]['id']
    md = f'GORSEL-1000-K{k}.md'
    zipad = f'Gorsel-1000-K{k}.zip'
    s = [f'# {ad} ({ilk} – {son}) · {len(liste)} GÖRSEL', '', '## ChatGPT için talimat (önce bunu oku, sonra hemen başla)', '',
         f'Bu dosyada bir bilgi yarışması oyunu için {len(liste)} görsel komutu var. Görevin:', '',
         f'1. Aşağıdaki {len(liste)} komutun HEPSİNİ, {ilk} numarasından {son} numarasına kadar SIRAYLA, her komut için ayrı bir görsel olarak üret.',
         ORTAK.format(ornek=ilk, zip=zipad, ilk=ilk, son=son, md=md), '']
    if tur == 'gk':
        s.append(KURAL_GK)
        tab = [x for x in liste if x['us'].startswith('Tablo') and x['konu'].startswith('Tablolar')]
        if tab:
            s += ['', KURAL_TABLO.format(ilk=tab[0]['id'], son=tab[-1]['id'])]
        por = [x for x in liste if x['konu'] in PORTRE]
        if por:
            s += ['', KURAL_PORTRE.format(ilk=por[0]['id'], son=por[-1]['id'])]
    else:
        s.append(KURAL_YP)
    s += ['', '## Komutlar', '']
    for x in liste:
        us = x['us'] if tur == 'gk' else '3D yapı · kare · beyaz zemin'
        s += [f"**{x['id']}** · {us}  ", x['cmd'], '']
    open(os.path.join(ROOT, md), 'w').write('\n'.join(s).rstrip() + '\n')
    return md, zipad, ilk, son


# Parça numarası sabit: Göz Kararı K1 = GK-511–710, K2 = 711–910, K3 = 911–1110, K4 = 1111–1310; yapı K5. Hazır olan
# parça (200 maddesi tam) yazılır; gelmeyen parça özette "hazırlanıyor" görünür (parçalar ayrı ayrı teslim edilebilsin).
parcalar = []
for k in range(4):
    bas = 511 + 200 * k
    dilim = [x for x in gk if bas <= no(x['id']) < bas + 200]
    if len(dilim) == 200:
        parcalar.append(parca(k + 1, 'GÖZ KARARI', dilim, 'gk'))
if len(yp) == 200:
    parcalar.append(parca(5, 'YAPI GÖRSELLERİ (Kazı Kazan + Gölge Oyunu)', yp, 'yp'))
# K6: ünlü kişi portreleri (kullanıcı, 16 Kasım: "herhangi bir kişinin resim tahmini de olsun"), GK-1311–1410
portre = [x for x in gk if 1311 <= no(x['id']) <= 1410]
if len(portre) == 100:
    parcalar.append(parca(6, 'GÖZ KARARI · ÜNLÜ KİŞİ PORTRELERİ', portre, 'gk'))

# TEK DOSYA (kullanıcı isteği: "tek md"): 1000 komutun hepsi, tek talimatla. Yalnız 1000'in hepsi hazırsa yazılır.
# ChatGPT'ye tek dosya verilir; görseller 200'lük gruplar hâlinde üretilip her grup kendi ZIP'inde verilir (bir sohbette
# 1000 görsel sınıra takılır: "devam" ile sürer, yeni sohbette dosya yeniden verilip kalınan numaradan başlanır).
if len(gk) == 900 and len(yp) == 200:
    t = ['# 1100 GÖRSEL · TEK DOSYA (GK-511 – GK-1410 ve YP-101 – YP-300)', '', '## ChatGPT için talimat (önce bunu oku, sonra hemen başla)', '',
         'Bu dosyada bir bilgi yarışması oyunu için 1100 görsel komutu var: 900 tanesi yatay 4:3 görsel (GK-…; bunların 100\'ü ünlü kişi '
         'portresi), 200 tanesi beyaz zeminde kare yapı görseli (YP-…). Görevin:', '',
         '1. Komutların HEPSİNİ, dosyadaki sırayla, her komut için ayrı bir görsel olarak üret.',
         '2. Bana hiçbir soru sorma, onay bekleme, ara özet yazma. Bir görsel bitince hemen sıradakine geç. Sınıra takılıp durursan, '
         'ben "devam" yazınca kaldığın numaradan sürdür. Ben "GK-731\'den başla" gibi bir numara yazarsam o numaradan devam et.',
         '3. Her görselin altına yalnızca numarasını yaz ve görseli o adla sakla (GK-511.png, YP-101.png).',
         '4. Her 200 görsel bitince o grubu TEK bir ZIP dosyasında ver (aşağıdaki tabloda grubun ZIP adı yazıyor). Üretemediğin numara '
         'olursa ZIP\'ten sonra listesini yaz, sonra sıradaki gruba geç.', '',
         '| Grup | Numaralar | ZIP adı |', '|---|---|---|']
    gruplar = [(f'GK-{511 + 200 * k}', f'GK-{710 + 200 * k}', f'Gorsel-1000-K{k + 1}.zip') for k in range(4)] + [('YP-101', 'YP-300', 'Gorsel-1000-K5.zip'), ('GK-1311', 'GK-1410', 'Gorsel-1000-K6.zip')]
    for i, (a, b, z) in enumerate(gruplar):
        t.append(f'| {i + 1} | {a} – {b} | **{z}** |')
    t += ['', '### GK görsellerinde (GK-511 – GK-1310) geçerli kurallar', '', KURAL_GK.split('\n', 1)[1]]
    tab = [x for x in gk if x['konu'].startswith('Tablolar')]
    if tab:
        t += ['', KURAL_TABLO.format(ilk=tab[0]['id'], son=tab[-1]['id'])]
    t += ['', KURAL_PORTRE.format(ilk='GK-1311', son='GK-1410')]
    t += ['', '### YP görsellerinde (YP-101 – YP-300) geçerli kurallar', '', KURAL_YP.split('\n', 1)[1], '', '## Komutlar', '']
    for k, (a, b, z) in enumerate(gruplar):
        liste = gk[200 * k:200 * (k + 1)] if k < 4 else yp if k == 4 else portre
        t += [f'### Grup {k + 1}: {a} – {b} (bitince {z})', '']
        for x in liste:
            us = '3D yapı · kare · beyaz zemin' if k == 4 else x['us']
            t += [f"**{x['id']}** · {us}  ", x['cmd'], '']
    open(os.path.join(ROOT, 'GORSEL-1000-TEK.md'), 'w').write('\n'.join(t).rstrip() + '\n')
    print('yazıldı: GORSEL-1000-TEK.md (1100 komut)')
else:
    print(f'tek dosya bekliyor: Göz Kararı {len(gk)}/900, yapı {len(yp)}/200')

# özet (kullanıcı için)
o = ['# 1100 YENİ GÖRSEL · özet (1000 + 100 ünlü kişi portresi)', '',
     'Bu dosya senin için: her görselin numarası, oyunda hangi soru tipine gideceği, sorusu ve doğru cevabı.',
     'ChatGPT\'ye bu dosyayı DEĞİL, aşağıdaki parça dosyalarını ver (her biri kendi içinde talimatlı; soru ve cevap yazmaz ki görsele yazı sızmasın).', '',
     '## Parçalar', '', '| Parça | Numaralar | Görsel | Soru tipi | ZIP adı |', '|---|---|---|---|---|']
satir = {}
for md, zipad, ilk, son in parcalar:
    k = int(md.split('-K')[1][0])
    satir[k] = f"| `{md}` | {ilk} – {son} | {no(son) - no(ilk) + 1} | {'Göz Kararı' if k < 5 else 'Kazı Kazan + Gölge Oyunu' if k == 5 else 'Göz Kararı (ünlü kişi portreleri)'} | `{zipad}` |"
for k in range(1, 7):
    ara = f'GK-{511 + 200 * (k - 1)} – GK-{710 + 200 * (k - 1)}' if k < 5 else 'YP-101 – YP-300' if k == 5 else 'GK-1311 – GK-1410'
    tip = 'Göz Kararı' if k < 5 else 'Kazı Kazan + Gölge Oyunu' if k == 5 else 'Göz Kararı (ünlü kişi portreleri)'
    o.append(satir.get(k, f"| `GORSEL-1000-K{k}.md` | {ara} | {100 if k == 6 else 200} | {tip} | hazırlanıyor |"))
o += ['', '**Kullanım:** her parça için ChatGPT\'de yeni bir sohbet aç, parça dosyasını ekle ve "Talimatı uygula, başla" yaz. Durursa "devam" yaz. '
      'Bitince verdiği ZIP\'i bana gönder.', '',
      'Hepsi bir gecede yetişmezse sorun değil: gelen parça oyuna bağlanır, görseli gelmeyen numara maçta çıkmaz.', '',
      '## Görsel nereye gidiyor', '',
      '- **Göz Kararı:** görsel bulanıktan netleşir, yakından uzaklaşır, siluetten renge geçer ya da bir tablonun parçasından bütününe açılır; 4 şıktan biri seçilir.',
      '- **Kazı Kazan:** yapı folyonun altındadır; kazıdıkça görünür, 4 şıktan biri seçilir.',
      '- **Gölge Oyunu:** yapının yalnız gölgesi Karagöz perdesine düşer; üç ipucu sırayla açılır. Gölgesi ayırt edilemeyen yapı yalnız Kazı Kazan\'a gider.', '']
konu = None
if gk:
    o += ['## Göz Kararı', '']
for x in gk:
    if x['konu'] != konu:
        konu = x['konu']
        o += ['', f'### {konu}', '', '| No | Zorluk · gösterim | Soru | Cevap |', '|---|---|---|---|']
    o.append(f"| {x['id']} | {x['z']} · {x['g']} | {x['q']} | **{x['dogru']}** |")
if yp:
    o += ['', '## Yapı görselleri', '', '| No | Tip | Yapı · yer | Kazı sorusu | Cevap |', '|---|---|---|---|---|']
    for x in yp:
        tip = 'Kazı + Gölge' if x['golge'] else 'Kazı'
        o.append(f"| {x['id']} | {tip} | {x['ad']} · {x['yer']} | {x['kq']} | **{x['kdogru']}** |")
open(os.path.join(ROOT, 'GORSEL-1000.md'), 'w').write('\n'.join(o).rstrip() + '\n')
print('yazıldı: GORSEL-1000.md +', ', '.join(p[0] for p in parcalar))
