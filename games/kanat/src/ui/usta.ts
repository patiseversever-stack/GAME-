// Usta (Master) task labels. Source of truth: src/content/meta (ustaI18n) — the label shows the exact threshold
// the checker uses (timeUnder → m:ss.d, scoreOver → points); without Kılavuz benchmarks the relative wording
// ("Kılavuz süresinin %105 kadarında bitir (yardımsız)") is used, never "1 puanı geç".
import { ustaI18n, ustaTask } from '../content/meta/routes.meta.ts';
import { getLang, t, tk, type Lang } from './i18n.ts';
import type { UstaTaskVM } from './types.ts';

const RELATIVE_KEYS = new Set(['usta.scoreOverRel', 'usta.timeUnderRel']);

export function taskText(task: UstaTaskVM, lang: Lang = getLang()): string {
  let key: string;
  let params: Record<string, number>;
  let unassisted = task.unassisted ?? false;
  if (task.key) {
    key = task.key;
    params = { count: task.count ?? task.value ?? 0, value: task.value ?? task.count ?? 0, ...(task.params ?? {}) };
  } else {
    const meta = ustaTask(task.id);
    if (meta) {
      const r = ustaI18n(meta, task.bench);
      key = r.key;
      params = r.params;
      unassisted = r.unassisted;
    } else {
      const v = task.value ?? task.count ?? 0;
      const ratio = (task.type === 'timeUnder' || task.type === 'scoreOver') && v > 0 && v < 5;
      key = ratio ? `usta.${task.type}Rel` : `usta.${task.type}`;
      params = { count: task.count ?? v, value: v, pct: Math.round(v * 100) };
    }
  }
  const label = tk(key, params, t('usta.generic', undefined, lang), lang);
  if (unassisted && !RELATIVE_KEYS.has(key)) return t('usta.withUnassisted', { label, suffix: t('usta.unassistedSuffix', undefined, lang) }, lang);
  return label;
}
