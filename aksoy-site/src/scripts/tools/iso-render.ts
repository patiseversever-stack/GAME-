// ISO uç kodu çözücüsünün HTML/SVG çıktıları. Sunucu ilk örneği bu fonksiyonlarla basar,
// tarayıcı aynı fonksiyonlarla günceller.
import { drawingSvg } from '../../lib/drawings';
import type { Decoded, Row } from './iso-decoder';
import { fmtFixed } from './format';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

const SHORT: Record<number, string> = { 1: 'Şekil', 2: 'Açı', 3: 'Tol.', 4: 'Tip', 5: 'Boyut', 6: 'Kal.', 7: 'Köşe', 8: 'Kenar', 9: 'Yön', 10: 'Ek' };
const WIDTH: Record<number, number> = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 2, 6: 2, 7: 2, 8: 1, 9: 1, 10: 2 };

function codeText(r: Row): string {
  if (r.code) return r.code;
  if (r.status === 'none') return '—';
  return '·'.repeat(WIDTH[r.pos] ?? 1);
}

/** Kod parçaları: her konum bir karo. 8–10 yalnızca varsa gösterilir. */
export function tilesHtml(d: Decoded): string {
  if (d.empty) return '';
  return d.rows
    .filter((r) => r.pos <= 7 || r.code)
    .map((r) => {
      const sep = r.pos === 5 || r.pos === 10 || (r.pos === 8 && r.code) ? ' dec-tile--sep' : '';
      return `<span class="dec-tile${sep}" data-pos="${r.pos}" data-status="${r.status}"><b>${esc(r.pos === 10 ? `-${codeText(r)}` : codeText(r))}</b><small>${r.pos}<span class="dec-tile__n"> · ${SHORT[r.pos]}</span></small></span>`;
    })
    .join('');
}

export function rowsHtml(d: Decoded): string {
  return d.rows
    .map(
      (r) => `<li class="drow" data-pos="${r.pos}" data-status="${r.status}" tabindex="-1">
<span class="drow__pos">${r.pos === 10 ? '–' : r.pos}</span>
<span class="drow__code">${esc(codeText(r))}</span>
<div class="drow__body"><span class="drow__title">${esc(r.title)}</span><span class="drow__meaning">${esc(r.meaning)}</span>${
        r.value ? `<span class="drow__value">${esc(r.value)}</span>` : ''
      }${r.hint && r.status !== 'pending' ? `<span class="drow__hint">${esc(r.hint)}</span>` : ''}</div>
</li>`,
    )
    .join('');
}

export function messagesHtml(d: Decoded): string {
  const cls = { error: 'tl-note--error', warn: 'tl-note--warn', info: 'tl-note--info' } as const;
  // Uyarılar satırlarda da görünür; üstte yalnızca ilk hata/bilgi ve en fazla iki uyarı.
  const seen = new Set<string>();
  return d.messages
    .filter((m) => (seen.has(m.text) ? false : (seen.add(m.text), true)))
    .slice(0, 4)
    .map((m) => `<p class="tl-note ${cls[m.type]}">${esc(m.text)}</p>`)
    .join('');
}

export function factsHtml(d: Decoded): string {
  const f: { t: string; tin?: boolean }[] = [];
  if (d.clearance === 0) f.push({ t: 'Negatif uç', tin: true });
  else if (typeof d.clearance === 'number') f.push({ t: `Pozitif uç · αn ${d.clearance}°`, tin: true });
  if (d.doubleSided === true) f.push({ t: 'Çift taraflı' });
  else if (d.doubleSided === false) f.push({ t: 'Tek taraflı' });
  if (d.edges) f.push({ t: `${d.edges} kesme köşesi (tipik)` });
  if (d.hole) {
    const k = d.hole.hole;
    f.push({ t: k === 'cyl' ? 'Manivelalı / üstten bağlamalı kater' : k === 'cs1' || k === 'cs2' ? 'Vidalı kater' : k === 'none' ? 'Üst pabuçlu kater' : 'Özel bağlama' });
  }
  if (d.ansi) f.push({ t: `ANSI ${d.ansi.input}` });
  return f.map((x) => `<li${x.tin ? ' class="is-tin"' : ''}>${esc(x.t)}</li>`).join('');
}

/** Üstten görünüş: ortak teknik çizim fonksiyonu + koda göre küçük düzeltmeler. */
export function topSvg(d: Decoded): string {
  if (d.empty || !d.shape) {
    return `<div class="dec-empty"><svg viewBox="0 0 120 90" width="120" aria-hidden="true"><rect x="20" y="15" width="80" height="60" rx="6" fill="none" stroke="#343a42" stroke-dasharray="4 4"/><text x="60" y="50" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="9" fill="#59616b">?</text></svg><span>Uç şekli harfini yazın (ör. C, D, T, W)</span></div>`;
  }
  if (!d.draw) {
    return `<div class="dec-empty"><span>Özel şekilli uç — çizim üretici kataloğunda</span></div>`;
  }
  let svg = drawingSvg('insert', d.draw, { grid: true, label: `ISO ${d.shape}`, title: `${d.shape} tipi kesici uç, üstten görünüş` });
  // Çizim kütüphanesindeki en yakın şekil kullanıldıysa açı etiketini düzelt.
  if (d.drawAngle && d.angle) svg = svg.replace(`>${d.drawAngle}°</text>`, `>${d.angle}°</text>`);
  // Deliksiz uçta orta deliği kaldır.
  if (d.hole?.hole === 'none') svg = svg.replace(/<circle[^>]*\br="(?:9|12\.5|13)"[^>]*\/>/g, '');
  return svg;
}

/** Yandan görünüş: kalınlık, boşluk açısı, delik ve talaş kırıcı (temsilî, oranlar yaklaşık). */
export function sideSvg(d: Decoded): string {
  if (d.empty || !d.shape) return '';
  const W = 112, x0 = 30, x1 = x0 + W, y0 = 18, cx = (x0 + x1) / 2;
  const ratio = d.thickness && d.ic ? d.thickness / d.ic : 0.33;
  const h = Math.max(12, Math.min(36, ratio * W));
  const y1 = y0 + h;
  const a = typeof d.clearance === 'number' ? d.clearance : 0;
  // Küçük açılar görünür olsun diye çizimde 1,5 kat abartılır; etiket gerçek değeri yazar.
  const dx = h * Math.tan((Math.min(a * 1.5, 40) * Math.PI) / 180);
  const n = (v: number) => Math.round(v * 10) / 10;
  const body = `<polygon class="s-body" fill="url(#side-gold)" points="${n(x0)},${y0} ${n(x1)},${y0} ${n(x1 - dx)},${n(y1)} ${n(x0 + dx)},${n(y1)}"/>`;

  let hole = '';
  const k = d.hole?.hole;
  if (k && k !== 'none' && k !== 'special') {
    const hw = W * 0.2;
    const steep = d.hole?.cs === '40–60°';
    const top = k === 'cyl' ? hw : hw * (steep ? 1.55 : 1.75);
    const dc = k === 'cyl' ? 0 : h * (steep ? 0.5 : 0.32);
    const bottom = k === 'cs2' ? top : hw;
    const dcb = k === 'cs2' ? dc : 0;
    const pts = [
      [cx - top / 2, y0], [cx + top / 2, y0], [cx + hw / 2, y0 + dc], [cx + hw / 2, y1 - dcb], [cx + bottom / 2, y1],
      [cx - bottom / 2, y1], [cx - hw / 2, y1 - dcb], [cx - hw / 2, y0 + dc],
    ];
    hole = `<polygon class="s-hole" points="${pts.map((p) => `${n(p[0])},${n(p[1])}`).join(' ')}"/>`;
  }

  let cb = '';
  const groove = (xa: number, xb: number, y: number, dir: 1 | -1) => `<path class="s-cb" d="M${n(xa)} ${n(y)} Q${n((xa + xb) / 2)} ${n(y + dir * Math.min(5, h * 0.25))} ${n(xb)} ${n(y)}"/>`;
  const cbn = d.hole?.cb ?? 0;
  if (cbn >= 1) cb += groove(x0 + 4, x0 + 24, y0, 1) + groove(x1 - 24, x1 - 4, y0, 1);
  if (cbn === 2) cb += groove(x0 + dx + 4, x0 + dx + 24, y1, -1) + groove(x1 - dx - 24, x1 - dx - 4, y1, -1);

  // Boşluk açısı yayı (sol yan)
  const ref = `<line class="s-dim" x1="${x0}" y1="${y0}" x2="${x0}" y2="${n(y1 + 8)}" stroke-dasharray="2 2"/>`;
  const r = h * 0.75;
  const ang = (Math.min(a * 1.5, 40) * Math.PI) / 180;
  const arc = a > 0 ? `<path class="s-arc" d="M${x0} ${n(y0 + r)} A${n(r)} ${n(r)} 0 0 0 ${n(x0 + r * Math.sin(ang))} ${n(y0 + r * Math.cos(ang))}"/>` : '';
  const aLabel = `<text x="${x0 - 4}" y="${n(y1 + 18)}" text-anchor="start">αn ${typeof d.clearance === 'number' ? `${d.clearance}°` : '?'}</text>`;
  // Kalınlık ölçüsü (sağ)
  const sx = x1 + 12;
  const sDim = `<line class="s-dim" x1="${x1 + 3}" y1="${y0}" x2="${sx + 4}" y2="${y0}"/><line class="s-dim" x1="${n(x1 - dx + 3)}" y1="${n(y1)}" x2="${sx + 4}" y2="${n(y1)}"/><line class="s-dim" x1="${sx}" y1="${y0}" x2="${sx}" y2="${n(y1)}"/><path d="M${sx - 2.5} ${y0 + 4} L${sx} ${y0} L${sx + 2.5} ${y0 + 4}M${sx - 2.5} ${n(y1 - 4)} L${sx} ${n(y1)} L${sx + 2.5} ${n(y1 - 4)}" fill="none" stroke="#59616b" stroke-width=".7"/>`;
  const sLabel = `<text x="${sx + 6}" y="${n((y0 + y1) / 2 + 3)}" class="s-tin">s ${d.thickness ? fmtFixed(d.thickness, 2) : '?'}</text>`;
  const cl = `<line class="s-cl" x1="${cx}" y1="${y0 - 8}" x2="${cx}" y2="${n(y1 + 8)}"/>`;
  const H = Math.ceil(y1 + 26);
  return `<svg class="side-svg" viewBox="0 0 200 ${H}" role="img" aria-label="Yandan görünüş: kalınlık ve boşluk açısı" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="side-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6d27e"/><stop offset=".55" stop-color="#d9a441"/><stop offset="1" stop-color="#8f6418"/></linearGradient></defs>${body}${hole}${cb}${cl}${ref}${arc}${aLabel}${sDim}${sLabel}</svg>`;
}

/** Positions 1–7 birleşik (katalog eşleşmesi için): "CNMG120408" */
export function coreCode(d: Decoded): string {
  return d.rows.filter((r) => r.pos <= 7).map((r) => r.code).join('');
}
