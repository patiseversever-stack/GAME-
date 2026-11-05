// YENİ · Göz Kararı (KARARLAR.md v1.6): görselli soru, emojinin yerine. Veri: src/data/gozkarari.js (tools/gozkarari/kur.py
// üretir), görseller dist/gk/. Sözleşme: TYPES, ORDER, SAMPLES (bkz. deneme.js).

import { PROFILE } from './timing.js';
import { gozkarari } from './d_gozkarari.js';
import GK from '../data/gozkarari.js';

// süre: 20 sn (karar), bütün kiplerde aynı
Object.assign(PROFILE, {
	gozkarari: { min: 20, max: 20, think: [3, 1.25], round: true }, // sabit 20 sn (cömertlik çarpanı yok)
});

export const TYPES = { gozkarari };

export const ORDER = [['gozkarari', 'Göz Kararı', 'Bulanık, yakın, siluet: görseli erken tanı']];

// galeride önce vitrin: her kipten ikişer örnek (uzaklaşma, ayrıntıdan bütüne, siluet, netleşme); sonra konular sırayla döner
const VITRIN = ['GK-013', 'GK-043', 'GK-263', 'GK-265', 'GK-021', 'GK-050', 'GK-001', 'GK-011'];
const byKonu = new Map();
for (const q of GK) {
	if (VITRIN.includes(q.img)) continue;
	if (!byKonu.has(q.konu)) byKonu.set(q.konu, []);
	byKonu.get(q.konu).push({ ...q, type: 'gozkarari' });
}
const rr = VITRIN.map((id) => ({ ...GK.find((q) => q.img === id), type: 'gozkarari' }));
for (let i = 0; rr.length < GK.length; i++) for (const l of byKonu.values()) if (l[i]) rr.push(l[i]);

export const SAMPLES = { gozkarari: rr };
