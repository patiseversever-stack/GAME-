// Claude "Artifact" yayın aracı, sayfada `id=` + uzun boşluksuz değer görürse sayfayı "PR inceleme sayfası" sanıp ek dosyaları (voice/)
// reddedebiliyor (küçültücü bir değişkene `iD`/`ID` adını verip ona uzun bir base64 resmi atayınca olur). Yayından önce kontrol:
//   node scripts/publish-guard-check.mjs dist-tek/kahvehane-pisti.html     → "tetik: 0" olmalı
// (Yerelde çalışırken yayın aracı kullanmıyorsan bu betiğe ihtiyacın yok.)
import fs from 'node:fs';
const n = 2048;
for (const f of process.argv.slice(2)) {
  const e = fs.readFileSync(f, 'utf8');
  const r = new RegExp(`(?<!-)\\bid[\\t\\n\\f\\r ]*=[\\t\\n\\f\\r ]*(?:"([^"]{0,${n}})"|'([^']{0,${n}})'|([^\\t\\n\\f\\r >"'][^\\t\\n\\f\\r >]{0,${n}})(?=[\\t\\n\\f\\r >]|$)|([\\s\\S]))`, 'gi');
  const hits = [];
  for (let s = r.exec(e); s !== null; s = r.exec(e)) if (s[4] !== undefined && s[4] !== '>') hits.push(s.index);
  console.log(f, 'tetik:', hits.length);
  for (const i of hits.slice(0, 5)) console.log('  ...', JSON.stringify(e.slice(Math.max(0, i - 80), i + 60)));
}
