// Shared terrain contract (owner: terrain agent). Pure data types, no DOM/three.js.
// Units: 1u = 1 m, +y up, +x east, -z north. World origin = world center (geo.lat/lon).

/** Regular height grid, row-major. Sample (r, c) sits at x = originX + c*spacing, z = originZ + r*spacing. */
export interface HeightGrid {
  originX: number;
  originZ: number;
  spacing: number;
  res: number; // samples per side (square grid)
  /** Heights in meters (already multiplied by verticalScale), length res*res. */
  data: Float32Array;
}

export interface WorldTerrain {
  core: HeightGrid; // ~8192 m @ 8 m
  far: HeightGrid; // ~49 km @ 96 m (core is blended inside it)
  /** Optional hi-res patch (Pamukkale travertine, 1 m). */
  patch?: HeightGrid;
  /** Rock mask grid (0..1) aligned with core grid; scales the procedural detail D(x,z). */
  rockMask?: Float32Array;
  /** Sea level is y=0 when hasSea. */
  hasSea: boolean;
}

/** Deterministic gameplay surface H(x,z) = base_bilinear(x,z) + D(x,z). Used by sim, bots and render-side CPU queries. */
export interface TerrainSampler {
  /** Gameplay surface height incl. 2-octave detail D (what collision uses). */
  height(x: number, z: number): number;
  /** Base bilinear height without detail (for far LOD / quick estimates). */
  baseHeight(x: number, z: number): number;
  /** Surface normal (unit) at (x,z) written into out[0..2]. */
  normal(x: number, z: number, out: Float64Array | number[]): void;
  /** Slope in degrees at (x,z). */
  slopeDeg(x: number, z: number): number;
  /** Playable bounds (core area minus margin). */
  readonly bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
}
