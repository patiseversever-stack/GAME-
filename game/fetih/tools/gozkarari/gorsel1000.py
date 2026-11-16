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
- Beyaz ya da çok açık renkli yüzeyler (mermer, badana) hafif gölgeli çizilsin ki beyaz zeminden ayrılsın; yapının öteki renkleri (bakır yeşili kubbe, kırmızı tuğla, yaldız, renkli çini) gerçekteki gibi kalsın.
- Görselde hiçbir yazı, harf, rakam, tabela, yazıt, imza, filigran ya da logo olmayacak.
- Yapı gerçeğine sadık olsun: kule, kubbe, minare, kemer sayısı ve biçimi komutta nasılsa öyle.
- Bütün görseller aynı üslupta: komutun sonundaki 3D mimari maket üslubu.'''


PORTRE = {'Bilim insanları', 'Tarihî kişiler', 'Yazarlar ve şairler', 'Ressamlar ve besteciler', 'Devlet adamları',
          'Komutanlar ve kâşifler', 'Bilim insanları II', 'Mucitler ve öncüler', 'Yazarlar ve şairler II', 'Sanatçılar ve besteciler II'}
# Gruplar (parça no, tür, ilk, son, başlık): her grup kendi ZIP'i. K6–K7 ünlü kişi portreleri (kullanıcı, 16 Kasım:
# önce 100, sonra "150 tane daha ... toplam 1250 olsun").
GRUPLAR = [(1, 'gk', 511, 710, 'GÖZ KARARI'), (2, 'gk', 711, 910, 'GÖZ KARARI'), (3, 'gk', 911, 1110, 'GÖZ KARARI'),
           (4, 'gk', 1111, 1310, 'GÖZ KARARI'), (5, 'yp', 101, 300, 'YAPI GÖRSELLERİ (Kazı Kazan + Gölge Oyunu)'),
           (6, 'gk', 1311, 1410, 'GÖZ KARARI · ÜNLÜ KİŞİ PORTRELERİ'), (7, 'gk', 1411, 1560, 'GÖZ KARARI · ÜNLÜ KİŞİ PORTRELERİ II')]
TIP = {1: 'Göz Kararı', 2: 'Göz Kararı', 3: 'Göz Kararı', 4: 'Göz Kararı', 5: 'Kazı Kazan + Gölge Oyunu', 6: 'Göz Kararı (ünlü kişi portreleri)', 7: 'Göz Kararı (ünlü kişi portreleri)'}
GK_TOPLAM = sum(son - ilk + 1 for _, t, ilk, son, _ in GRUPLAR if t == 'gk')


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


# Parça numarası sabit (GRUPLAR); grubun bütün maddeleri hazırsa parça yazılır, değilse özette "hazırlanıyor" görünür.
parcalar = []
dilimler = {}
for k, tur, ilk, son, baslik in GRUPLAR:
    kaynak = gk if tur == 'gk' else yp
    dilim = [x for x in kaynak if ilk <= no(x['id']) <= son]
    dilimler[k] = dilim
    if len(dilim) == son - ilk + 1:
        parcalar.append(parca(k, baslik, dilim, tur))

# TEK DOSYA (kullanıcı isteği: "tek md"): 1000 komutun hepsi, tek talimatla. Yalnız 1000'in hepsi hazırsa yazılır.
# ChatGPT'ye tek dosya verilir; görseller 200'lük gruplar hâlinde üretilip her grup kendi ZIP'inde verilir (bir sohbette
# 1000 görsel sınıra takılır: "devam" ile sürer, yeni sohbette dosya yeniden verilip kalınan numaradan başlanır).
if len(gk) == GK_TOPLAM and len(yp) == 200:
    top = GK_TOPLAM + 200
    t = [f'# {top} GÖRSEL · TEK DOSYA (GK-511 – GK-{510 + GK_TOPLAM} ve YP-101 – YP-300)', '', '## ChatGPT için talimat (önce bunu oku, sonra hemen başla)', '',
         f'Bu dosyada bir bilgi yarışması oyunu için {top} görsel komutu var: {GK_TOPLAM} tanesi yatay 4:3 görsel (GK-…; bunların '
         f'{GK_TOPLAM - 800}\'ü ünlü kişi portresi), 200 tanesi beyaz zeminde kare yapı görseli (YP-…). Görevin:', '',
         '1. Komutların HEPSİNİ, dosyadaki sırayla, her komut için ayrı bir görsel olarak üret.',
         '2. Bana hiçbir soru sorma, onay bekleme, ara özet yazma. Bir görsel bitince hemen sıradakine geç. Sınıra takılıp durursan, '
         'ben "devam" yazınca kaldığın numaradan sürdür. Ben "GK-731\'den başla" gibi bir numara yazarsam o numaradan devam et.',
         '3. Her görselin altına yalnızca numarasını yaz ve görseli o adla sakla (GK-511.png, YP-101.png).',
         '4. Her 200 görsel bitince o grubu TEK bir ZIP dosyasında ver (aşağıdaki tabloda grubun ZIP adı yazıyor). Üretemediğin numara '
         'olursa ZIP\'ten sonra listesini yaz, sonra sıradaki gruba geç.', '',
         '| Grup | Numaralar | ZIP adı |', '|---|---|---|']
    gruplar = [(f"{'GK' if tur == 'gk' else 'YP'}-{ilk}", f"{'GK' if tur == 'gk' else 'YP'}-{son}", f'Gorsel-1000-K{k}.zip') for k, tur, ilk, son, _ in GRUPLAR]
    for i, (a, b, z) in enumerate(gruplar):
        t.append(f'| {i + 1} | {a} – {b} | **{z}** |')
    t += ['', '### GK görsellerinde (GK-511 – GK-1310) geçerli kurallar', '', KURAL_GK.split('\n', 1)[1]]
    tab = [x for x in gk if x['konu'].startswith('Tablolar')]
    if tab:
        t += ['', KURAL_TABLO.format(ilk=tab[0]['id'], son=tab[-1]['id'])]
    t += ['', KURAL_PORTRE.format(ilk='GK-1311', son=f'GK-{510 + GK_TOPLAM}')]
    t += ['', '### YP görsellerinde (YP-101 – YP-300) geçerli kurallar', '', KURAL_YP.split('\n', 1)[1], '', '## Komutlar', '']
    for k, (a, b, z) in enumerate(gruplar):
        liste = dilimler[k + 1]
        t += [f'### Grup {k + 1}: {a} – {b} (bitince {z})', '']
        for x in liste:
            us = '3D yapı · kare · beyaz zemin' if k == 4 else x['us']
            t += [f"**{x['id']}** · {us}  ", x['cmd'], '']
    open(os.path.join(ROOT, 'GORSEL-1000-TEK.md'), 'w').write('\n'.join(t).rstrip() + '\n')
    print(f'yazıldı: GORSEL-1000-TEK.md ({top} komut)')
else:
    print(f'tek dosya bekliyor: Göz Kararı {len(gk)}/{GK_TOPLAM}, yapı {len(yp)}/200')

# özet (kullanıcı için)
o = [f'# {GK_TOPLAM + 200} YENİ GÖRSEL · özet (1000 + {GK_TOPLAM - 800} ünlü kişi portresi)', '',
     'Bu dosya senin için: her görselin numarası, oyunda hangi soru tipine gideceği, sorusu ve doğru cevabı.',
     f'**ChatGPT\'ye bu dosyayı DEĞİL, `GORSEL-1000-TEK.md` dosyasını ver**: {GK_TOPLAM + 200} komutun hepsi tek dosyada, en başta tek talimat; '
     f'ChatGPT görselleri sırayla üretir ve her grup bitince o grubun ZIP\'ini verir ({len(GRUPLAR)} ZIP). Talimatlı dosyada soru ve cevap yoktur '
     '(görsele yazı sızmasın). Aşağıdaki parça dosyaları aynı komutların gruplara bölünmüş hâlidir; istersen onları da kullanabilirsin.', '',
     '## Parçalar', '', '| Parça | Numaralar | Görsel | Soru tipi | ZIP adı |', '|---|---|---|---|---|']
satir = {}
for md, zipad, ilk, son in parcalar:
    k = int(md.split('-K')[1][0])
    satir[k] = f"| `{md}` | {ilk} – {son} | {no(son) - no(ilk) + 1} | {TIP[k]} | `{zipad}` |"
for k, tur, ilk, son, _ in GRUPLAR:
    on = 'GK' if tur == 'gk' else 'YP'
    o.append(satir.get(k, f"| `GORSEL-1000-K{k}.md` | {on}-{ilk} – {on}-{son} | {son - ilk + 1} | {TIP[k]} | hazırlanıyor |"))
o += ['', '**Kullanım:** ChatGPT\'de yeni bir sohbet aç, `GORSEL-1000-TEK.md` dosyasını ekle ve "Talimatı uygula, başla" yaz. Durursa '
      '"devam" yaz. Sohbet dolarsa yeni sohbet aç, aynı dosyayı ver ve kaldığın numarayı yaz ("GK-731\'den başla"). Gelen her ZIP\'i bana gönder.', '',
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
