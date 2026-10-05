// ISO uç kodu çözücü — tarayıcı tarafı.
import { decode } from './iso-decoder';
import type { Decoded } from './iso-decoder';
import { tilesHtml, rowsHtml, messagesHtml, factsHtml, topSvg, sideSvg, coreCode } from './iso-render';

const root = document.querySelector<HTMLElement>('[data-dec]');
if (root) init(root);

function init(root: HTMLElement) {
  const $ = <T extends Element = HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const input = $<HTMLInputElement>('[data-dec-input]');
  const tiles = $('[data-tiles]');
  const msg = $('[data-msg]');
  const rows = $('[data-rows]');
  const top = $('[data-top]');
  const side = $('[data-side]');
  const facts = $('[data-facts]');
  const grid = $('[data-grid]');
  const wa = $<HTMLAnchorElement>('[data-dec-wa]');
  const cat = $('[data-catalog]');
  const live = $('[data-live]');
  const catalog: { k: string; slug: string; code: string }[] = JSON.parse(root.dataset.catalog || '[]');
  const waNumber = (wa.href.match(/wa\.me\/(\d+)/) ?? [])[1] ?? '';
  const waBase = wa.dataset.base || '';

  let last: Decoded | null = null;
  let urlTimer = 0;

  function render(raw: string, writeUrl = true) {
    const d = decode(raw);
    last = d;
    root.dataset.state = d.empty ? 'empty' : d.special ? 'special' : d.complete ? 'complete' : 'partial';
    tiles.innerHTML = d.special && !d.complete ? '' : tilesHtml(d);
    msg.innerHTML = d.empty && raw.trim()
      ? '<p class="tl-note tl-note--warn">Kodda yalnızca harf ve rakam olur. Örnek: CNMG 120408 ya da APMT 1135PDER.</p>'
      : messagesHtml(d);
    grid.hidden = !!d.special && !d.complete;
    rows.innerHTML = rowsHtml(d);
    top.innerHTML = topSvg(d);
    side.innerHTML = sideSvg(d);
    facts.innerHTML = factsHtml(d);

    // Katalog eşleşmesi (1–7. konumlar)
    const core = d.complete ? coreCode(d) : '';
    const hits = core ? catalog.filter((c) => c.k === core).slice(0, 3) : [];
    cat.innerHTML = hits.map((h) => `<a class="dec-actions__link" href="/urun/${h.slug}">Katalogda: ${h.code} →</a>`).join('');

    // WhatsApp mesajı
    const text = d.complete
      ? `Merhaba Aksoy Kesici Takımlar, ${d.display} kesici uç için fiyat ve stok bilgisi rica ediyorum.`
      : d.display ? `${waBase}${d.display}` : 'Merhaba Aksoy Kesici Takımlar, kesici uç için teklif almak istiyorum.';
    if (waNumber) wa.href = `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`;

    live.textContent = d.empty
      ? ''
      : d.complete
        ? `${d.display}: ${d.rows.filter((r) => r.pos <= 7).map((r) => `${r.title} ${r.meaning}${r.value ? `, ${r.value}` : ''}`).join('; ')}`
        : d.messages[0]?.text ?? '';

    if (writeUrl) {
      clearTimeout(urlTimer);
      urlTimer = window.setTimeout(() => {
        const u = new URL(location.href);
        if (d.empty) u.searchParams.delete('kod');
        else u.searchParams.set('kod', d.display || raw.trim());
        history.replaceState(null, '', u);
      }, 500);
    }
  }

  input.addEventListener('input', () => render(input.value));
  $('[data-dec-clear]').addEventListener('click', () => {
    input.value = '';
    render('');
    input.focus();
  });
  root.querySelectorAll<HTMLButtonElement>('[data-example]').forEach((b) =>
    b.addEventListener('click', () => {
      input.value = b.dataset.example!;
      render(input.value);
      if (matchMedia('(pointer: fine)').matches) input.focus();
    }),
  );
  $('[data-dec-copy]').addEventListener('click', async () => {
    const toast = (window as any).__toast as ((m: string) => void) | undefined;
    const u = new URL(location.href);
    if (last && !last.empty) u.searchParams.set('kod', last.display);
    try {
      await navigator.clipboard.writeText(u.href);
      toast?.('Bağlantı panoya kopyalandı');
    } catch {
      toast?.('Kopyalanamadı — adres çubuğundan kopyalayın');
    }
  });

  // Satır ↔ karo vurgusu
  const hot = (pos: string | null) => {
    root.querySelectorAll('.is-hot').forEach((el) => el.classList.remove('is-hot'));
    if (pos) root.querySelectorAll(`[data-pos="${pos}"]`).forEach((el) => el.classList.add('is-hot'));
  };
  for (const host of [rows, tiles]) {
    host.addEventListener('pointerover', (e) => hot((e.target as HTMLElement).closest<HTMLElement>('[data-pos]')?.dataset.pos ?? null));
    host.addEventListener('pointerleave', () => hot(null));
  }
  tiles.addEventListener('click', (e) => {
    const pos = (e.target as HTMLElement).closest<HTMLElement>('[data-pos]')?.dataset.pos;
    if (!pos) return;
    const row = rows.querySelector<HTMLElement>(`[data-pos="${pos}"]`);
    if (!row) return;
    hot(pos);
    row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });

  // Adresten kod: ?kod=CNMG120408-MA
  const q = new URLSearchParams(location.search).get('kod');
  if (q) {
    input.value = q.slice(0, 40);
    render(input.value, false);
  } else {
    render(input.value, false);
  }
}
