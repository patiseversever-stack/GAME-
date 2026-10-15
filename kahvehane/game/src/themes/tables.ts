// Masa temaları kaydı. Mavi Arena varsayılandır (table.css'teki değerler); diğerleri CSS değişkeni ve/veya boyalı zemin verir.
import type {TableTheme} from './contract';

export const TABLES: readonly TableTheme[] = [
  {id: 'arena', name: 'Mavi Arena', desc: 'Işık hüzmeleri altında klasik arena.', vars: {}},
];

export function tableById(id: string): TableTheme {
  return TABLES.find(t => t.id === id) ?? TABLES[0];
}
