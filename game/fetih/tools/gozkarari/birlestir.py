import re,glob,collections
RX=re.compile(r'^### (GK-\d{3}) · ([^·]+) · ([^·]+) · Zorluk (\d) · Gösterim: ([^\n]+)\n```\n(.*?)\n```\n- \*\*Soru:\*\* (.*?)\n- \*\*Şıklar:\*\* (.*?)\n- \*\*Bilgi:\*\* (.*?)$', re.M|re.S)
items=[]
for f in sorted(glob.glob('P[1-6].md')):
    for m in RX.finditer(open(f).read()):
        gid,konu,us,z,g,cmd,q,s,b=[x.strip() for x in m.groups()]
        items.append(dict(id=gid,konu=konu,us=us,z=int(z),g=g,cmd=' '.join(cmd.split()),q=q,s=s,b=b))
items.sort(key=lambda i:i['id'])
assert len(items)==310 and [i['id'] for i in items]==[f'GK-{n:03d}' for n in range(1,311)]
konular=list(dict.fromkeys(i['konu'] for i in items))
O=[]
w=O.append
w('# Göz Kararı · ChatGPT görsel komutları\n')
w('Fetih Ligi\'nin görselli soru tipi **Göz Kararı** için 310 görselin tam listesi. Her maddede ChatGPT\'ye verilecek İngilizce komut, oyunda çıkacak soru, 4 şık (✅ doğru olan) ve cevaptan sonra görünen bilgi var. Görseller gelince oyuna ben bağlarım.\n')
w('## Özet\n')
w('| Konu | Numara | Madde | Zorluk 1 / 2 / 3 |\n|---|---|---|---|')
for k in konular:
    L=[i for i in items if i['konu']==k]; zc=collections.Counter(i['z'] for i in L)
    w(f"| {k} | {L[0]['id']}–{L[-1]['id']} | {len(L)} | {zc[1]} / {zc[2]} / {zc[3]} |")
zc=collections.Counter(i['z'] for i in items)
w(f"| **Toplam** | GK-001–GK-310 | **{len(items)}** | {zc[1]} / {zc[2]} / {zc[3]} |\n")
uc=collections.Counter(i['us'] for i in items); gc=collections.Counter(i['g'] for i in items)
w('**Üslup:** '+' · '.join(f'{k} {v}' for k,v in uc.most_common())+'  ')
w('**Gösterim:** '+' · '.join(f'{k} {v}' for k,v in gc.most_common())+'\n')
w('Bayraklar bu listede yok, onları kodla çiziyorum (yapay zekâ bayrak ayrıntısını bozuyor).\n')
w('''## Nasıl kullanılır

1. **Yeni bir ChatGPT sohbeti aç**, en başta aşağıdaki **başlangıç mesajını** bir kez yapıştır.
2. **Paketleri sırayla yapıştır.** Aşağıdaki "Paketler" bölümünde 31 paket var, her biri 10 komut. Her paket tek kutu, tek kopyala-yapıştır.
3. **Tablolar paketlerinden önce** (Paket 27, GK-261'den itibaren) **tablo ek mesajını** bir kez yapıştır.
4. **En sonda tek ZIP iste.** Bütün paketler bitince aşağıdaki **ZIP mesajını** yapıştır; ChatGPT 310 görselin hepsini `GozKarari.zip` içinde `GK-001.png … GK-310.png` adlarıyla verir. O tek ZIP'i buraya at, ben açarım.
   - **Yeni sohbete geçmek zorunda kalırsan** (kurallar kayarsa ya da sohbet kilitlenirse) geçmeden önce aynı ZIP mesajını o sohbette de yapıştır: önceki sohbetin görselleri yeni sohbete taşınmaz. Sonra elinde 2–3 ZIP olur, hepsini at, birleştirmeyi ben yaparım.
   - ChatGPT ZIP'i hazırlarken "görsellere erişemiyorum" derse (bazen ürettiği görsellere kendi dosya aracından ulaşamıyor) tek tek indirip at; hangisinin hangi maddeye ait olduğunu kendim bulurum.
5. Her görseli tek tek denetlerim: yazı çıkmış mı, nesne doğru mu, tablo aslına benziyor mu. Uymayanları sana tek satırlık düzeltilmiş komutla geri veririm.

**Bilmen gerekenler**
- ChatGPT'nin belli sürede üretebileceği görsel sayısı sınırlı; 310 görsel birkaç güne yayılabilir. Hangi paketin geldiğini ben takip ederim.
- Aynı sohbette uzadıkça kuralları unutur. Görsellerde yazı çıkmaya ya da üslup kaymaya başlarsa **yeni sohbet aç**, başlangıç mesajını yeniden yapıştır, kaldığın paketten devam et.
- ChatGPT bir komutu reddederse (ör. çıplaklık olan 3 tablo: GK-265 civarı Venüs'ün Doğuşu, Âdem'in Yaratılışı, Halka Yol Gösteren Özgürlük) zorlama, geç. Görseli olmayan soru maçta hiç çıkmaz.
- Yazı çıkan görsel için aynı sohbette "aynısını hiçbir yazı, harf ve rakam olmadan yeniden üret" demen genelde yeter.

## Başlangıç mesajı (bir kez, en başta)

```
Bir bilgi yarışması oyunu için görseller üreteceğiz. Her mesajımda numaralı komutlar olacak; her komut için ayrı bir görsel üret, sırayla, bana soru sormadan.
Kurallar (her görselde geçerli):
- Yatay 4:3 oran.
- Görselde hiçbir yazı, harf, rakam, imza, filigran ya da logo olmayacak.
- Gerçek bir kişinin yüzü ya da benzeri olmayacak; insanlar genel ve isimsiz figürler olacak.
- Konu tek, net ve ortada olacak; kenarlardan taşmayacak, arka plan sade olacak.
- Komutta yazan üsluba tam sadık kal; üslupları birbirine karıştırma.
- Her görselin altına yalnızca komutun numarasını yaz (ör. GK-047).
- Ürettiğin her görseli, adı komut numarası olacak şekilde (ör. GK-047.png) sakla; en sonda hepsini tek bir ZIP dosyasında isteyeceğim.
```

## ZIP mesajı (en sonda bir kez)

```
Bu sohbette ürettiğin bütün görselleri tek bir ZIP dosyasında ver. ZIP'in adı GozKarari.zip olsun; içindeki her dosyanın adı komut numarası olsun (GK-001.png, GK-002.png …). Eksik ya da üretemediğin numara varsa ZIP'ten sonra listesini yaz.
```

## Tablo ek mesajı (Paket 27'den önce bir kez)

```
Bundan sonraki komutlar telifi dolmuş, kamu malı ünlü tabloların yeniden üretimi. Bunlarda tabloyu aslına olabildiğince sadık çiz: kompozisyon, renkler, figürlerin yeri ve duruşu orijinaldeki gibi olsun. Tablodaki figürler için "gerçek kişi yüzü yok" kuralı geçerli değil, orijinalde nasılsa öyle. Yazı, imza, çerçeve ve filigran yine olmayacak. Dikey tabloları yatay 4:3 tuvalin ortasına sığdır, yanları sade koyu müze duvarı olsun.
```
''')
w('## Paketler (kopyala-yapıştır)\n')
for p in range(31):
    L=items[p*10:(p+1)*10]
    ks=list(dict.fromkeys(i['konu'] for i in L))
    w(f"### Paket {p+1} · {L[0]['id']}–{L[-1]['id']} · {' / '.join(ks)}\n")
    w('```')
    w('\n\n'.join(f"{i['id']} · {i['us']}\n{i['cmd']}" for i in L))
    w('```\n')
w('## Sorular, şıklar ve bilgiler (oyuna girecek metin)\n')
w('Bu bölüm ChatGPT için değil; görsel geldiğinde oyunda neyin çıkacağını görmen için. Düzeltmek istediğin soru varsa numarasıyla söyle.\n')
for k in konular:
    L=[i for i in items if i['konu']==k]
    w(f"### {k} ({L[0]['id']}–{L[-1]['id']})\n")
    for i in L:
        w(f"**{i['id']}** · {i['us']} · Zorluk {i['z']} · {i['g']}  ")
        w(f"{i['q']}  ")
        w(f"{i['s']}  ")
        w(f"<sub>ℹ️ {i['b']}</sub>\n")
open(__import__('os').path.join(__import__('os').path.dirname(__file__),'..','..','GOZKARARI-KOMUTLAR.md'),'w').write('\n'.join(O)+'\n')
print(len('\n'.join(O)))
