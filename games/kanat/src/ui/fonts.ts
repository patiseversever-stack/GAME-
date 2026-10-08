// Runtime font loading through src/core/assets.ts (works in dist/web and the single-file build).
// Files + ranges mirror public/fonts/fonts.json (written by tools/fonts-fetch.ts). SIL OFL 1.1.
import { fetchAsset } from '../core/assets.ts';

const LATIN =
  'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';
const LATIN_EXT =
  'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF';

interface FontSpec { family: string; base: string; style: 'normal' | 'italic'; weight: string }

/** Inter and Playfair are variable fonts (one file covers the weight range). */
export const FONT_SPECS: readonly FontSpec[] = [
  { family: 'Barlow Condensed', base: 'barlow-condensed-600', style: 'normal', weight: '600' },
  { family: 'Barlow Condensed', base: 'barlow-condensed-700', style: 'normal', weight: '700' },
  { family: 'Barlow Condensed', base: 'barlow-condensed-italic-600', style: 'italic', weight: '600' },
  { family: 'Inter', base: 'inter-var', style: 'normal', weight: '400 600' },
  { family: 'Playfair Display', base: 'playfair-display-italic-var', style: 'italic', weight: '400 600' },
];

export const FONT_FILES: readonly string[] = FONT_SPECS.flatMap((s) => [`fonts/${s.base}-latin.woff2`, `fonts/${s.base}-latin-ext.woff2`]);

let loading: Promise<void> | null = null;

/**
 * Registers all UI faces with document.fonts (FontFace from ArrayBuffer — no URL needed, so the
 * single-file pack works). Resolves when every face is decoded. Safe to call many times.
 */
export function loadFonts(): Promise<void> {
  if (loading) return loading;
  loading = (async () => {
    if (typeof document === 'undefined' || typeof FontFace === 'undefined') return;
    const jobs: Promise<void>[] = [];
    for (const spec of FONT_SPECS) {
      for (const [suffix, range] of [['latin', LATIN], ['latin-ext', LATIN_EXT]] as const) {
        jobs.push(
          (async () => {
            const buf = await fetchAsset(`fonts/${spec.base}-${suffix}.woff2`);
            const face = new FontFace(spec.family, buf, { style: spec.style, weight: spec.weight, unicodeRange: range, display: 'block' });
            await face.load();
            document.fonts.add(face);
          })(),
        );
      }
    }
    const results = await Promise.allSettled(jobs);
    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length) console.warn(`[ui] ${failed.length} font face(s) failed to load`, (failed[0] as PromiseRejectedResult).reason);
  })();
  return loading;
}
