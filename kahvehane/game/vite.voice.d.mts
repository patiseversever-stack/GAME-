import type {Plugin} from 'vite';
/** Seslendirme klasörü: derlemede assets/voice → <outDir>/voice/, geliştirmede /voice/… sunar (vite.voice.mjs). */
export declare function khVoice(o?: {packed?: boolean}): Plugin;
