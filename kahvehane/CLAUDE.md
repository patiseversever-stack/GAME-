# Kahvehane (Pişti + Blöf) — Claude Code için

Önce `docs/DEVIR.md`, sonra `docs/KARARLAR.md` ve `docs/PHASES.md` oku. Oyun `game/` altında (Vite + TypeScript). Kullanıcıyla Türkçe ve kısa konuş.

- Commit/push öncesi temiz kopyadan `tsc --noEmit`, `vitest run`, `vite build` geçmeli.
- Büyük gradyan/blur/mask katmanı ekleme; GPU bellek kuralı `docs/PHASES.md`'de.
- Konuşmalar tek kanaldan geçer (`src/audio/speech.ts`); hiçbir ses üst üste binmemeli. İnsan oyuncuya avatar adıyla seslenme (`lineAllowed`).
- Yeni replik = `src/ai/dialogue.ts` (+ `node tools/voice/generate.mjs --dry` ile kredi hesabı). ElevenLabs kredisini boş harcama.
- Anahtarları depoya, sohbete ya da dosyaya yazma.
