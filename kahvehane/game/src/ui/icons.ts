// Satır içi SVG simgeler (24×24, currentColor). Resimli simgeler (jeton, sandık…) assets.ts'te.
const s = (body: string, fill = false) =>
  `<svg class="kh-i" viewBox="0 0 24 24" aria-hidden="true" ${fill ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"'}>${body}</svg>`;

export const I = {
  gear: s('<circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  pause: s('<rect x="6.5" y="5" width="3.6" height="14" rx="1.2"/><rect x="13.9" y="5" width="3.6" height="14" rx="1.2"/>', true),
  close: s('<path d="M6 6l12 12M18 6L6 18"/>'),
  chevL: s('<path d="M14.5 5.5L8 12l6.5 6.5"/>'),
  chevR: s('<path d="M9.5 5.5L16 12l-6.5 6.5"/>'),
  lock: s('<path d="M7.5 10.5V8a4.5 4.5 0 0 1 9 0v2.5"/><rect x="5" y="10.5" width="14" height="10" rx="2.4" fill="currentColor" stroke="none"/>'),
  plus: s('<path d="M12 5.5v13M5.5 12h13"/>'),
  check: s('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  cards: s('<rect x="3.5" y="5.5" width="10.5" height="14.5" rx="2"/><path d="M8.5 4.6l1.2-.6a2 2 0 0 1 2.6.9l5.6 11.4a2 2 0 0 1-.9 2.6l-2.3 1.2" opacity=".7"/>'),
  star: s('<path d="M12 2.8l2.75 5.75 6.3.8-4.62 4.38 1.17 6.27L12 16.95 6.4 20l1.17-6.27L2.95 9.35l6.3-.8z"/>', true),
  sfx: s('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18.2 6.5a8 8 0 0 1 0 11"/>'),
  voice: s('<path d="M20 11.5a7.5 7 0 0 1-10.8 6.3L4.5 19.5l1.4-3.9A7 7 0 0 1 4.5 11.5 7.5 7 0 0 1 20 11.5z"/><path d="M8.8 11.5h.01M12.2 11.5h.01M15.6 11.5h.01" stroke-width="2.8"/>'),
  music: s('<path d="M9 17.5V5.5l10-2v12"/><circle cx="6.5" cy="17.5" r="2.5" fill="currentColor"/><circle cx="16.5" cy="15.5" r="2.5" fill="currentColor"/>'),
  vibrate: s('<rect x="7.5" y="3.5" width="9" height="17" rx="2"/><path d="M3.5 9v6M20.5 9v6"/>'),
  quality: s('<path d="M12 3l2.2 5.6L20 10l-5.8 1.6L12 17l-2.2-5.4L4 10l5.8-1.4z"/><path d="M18.5 16.5l.8 2 2 .7-2 .8-.8 2-.8-2-2-.8 2-.7z" fill="currentColor" stroke="none"/>'),
  play: s('<path d="M8 5.2v13.6a1 1 0 0 0 1.5.86l10.6-6.8a1 1 0 0 0 0-1.72L9.5 4.34A1 1 0 0 0 8 5.2z"/>', true),
  home: s('<path d="M4 11l8-6.5 8 6.5"/><path d="M6.5 9.5V19h11V9.5"/>'),
  book: s('<path d="M4 5.5A2 2 0 0 1 6 4h5v15.5H6a2 2 0 0 0-2 1.5z"/><path d="M20 5.5A2 2 0 0 0 18 4h-5v15.5h5a2 2 0 0 1 2 1.5z"/>'),
  exit: s('<path d="M14 4.5h3.5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H14"/><path d="M10 8l-4 4 4 4M6 12h9"/>'),
  hand: s('<path d="M9 11.5V5.2a1.6 1.6 0 0 1 3.2 0v5.3M12.2 10V8.6a1.6 1.6 0 0 1 3.2 0V11M15.4 10.2a1.6 1.6 0 0 1 3.2 0v3.6a6.3 6.3 0 0 1-6.3 6.3h-.6a6 6 0 0 1-4.6-2.2L4.3 14.2a1.6 1.6 0 0 1 2.4-2.1L9 14"/>'),
  user: s('<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>'),
  tulip: s('<path d="M4.5 6.5C4.5 11.5 7.5 15 12 15 10 12 8 9 4.5 6.5zM19.5 6.5C19.5 11.5 16.5 15 12 15c2-3 4-6 7.5-8.5zM12 3.2c2.3 2.6 3.2 6.2 0 11.8-3.2-5.6-2.3-9.2 0-11.8zM11.3 15h1.4v6.2h-1.4zM12 20c-2.2 0-4-1.3-4.7-3.3 2.2.1 3.8 1.2 4.7 3.3zM12 20c2.2 0 4-1.3 4.7-3.3-2.2.1-3.8 1.2-4.7 3.3z"/>', true),
} as const;
