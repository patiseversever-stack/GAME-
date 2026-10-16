/** Seslendirme paketleme (scripts/voice-pack.mjs): tek dosya derlemesi / yayın önizlemesi için paketli voice/ düzeni. */
export interface PackedManifest {
  v: 2;
  packs: Record<string, {url: string; n: number; char: string; group: string}>;
  clips: Record<string, {p: string; o: number; n: number; dur?: number; h?: string; prio?: number}>;
}
export declare const PACK_GROUPS: readonly string[];
export declare function packGroup(id: string): string;
export declare function packManifest(
  man: Record<string, {url: string; dur?: number; h?: string; p?: number}>,
  read: (url: string) => Uint8Array | null,
  o?: {maxPack?: number},
): {manifest: PackedManifest; files: Map<string, Uint8Array>};
export declare function packVoice(src: string, dst: string, o?: {maxPack?: number}): {packs: number; files: number; bytes: number; clips: number; biggest: number};
export declare function isPacked(dir: string): boolean;
