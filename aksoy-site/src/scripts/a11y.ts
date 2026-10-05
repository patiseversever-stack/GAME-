// Açık pencerelerde (menü, arama, teklif sepeti) klavye odağını pencerenin içinde tutar.
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Tab / Shift+Tab ile odak pencerenin son öğesinden ilkine (ve tersi) döner */
export function trapTab(e: KeyboardEvent, box: HTMLElement) {
  if (e.key !== 'Tab') return;
  const els = Array.from(box.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.getClientRects().length > 0 && !el.closest('[hidden], [inert]'));
  if (!els.length) return;
  const first = els[0], last = els[els.length - 1];
  const a = document.activeElement as HTMLElement | null;
  const inside = !!a && box.contains(a);
  if (e.shiftKey && (a === first || !inside)) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && (a === last || !inside)) { e.preventDefault(); first.focus(); }
}

/** Arama penceresi açıkken alttaki pencereler klavye olaylarına karışmasın */
export const searchOpen = () => !!document.querySelector('[data-search].is-open');
