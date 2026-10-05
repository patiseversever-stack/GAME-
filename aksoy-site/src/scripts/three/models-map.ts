// Çizim türü → 3D model eşlemesi (three.js içermez; sayfa kodunda güvenle kullanılır).
export type ModelKind = 'cnmg' | 'groove' | 'thread' | 'endmill' | 'drill' | 'tap' | 'bt40';
export const DRAWING_TO_MODEL: Record<string, ModelKind> = {
  insert: 'cnmg', 'holder-groove': 'groove', 'thread-insert': 'thread', endmill: 'endmill', 'drill-u': 'drill', tap: 'tap', 'chuck-bt': 'bt40',
};
