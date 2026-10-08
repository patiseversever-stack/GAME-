// Image writers for the bake (sharp for PNG/WebP, ktx2-encoder for KTX2/ETC1S).

import { writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { encodeToKTX2 } from 'ktx2-encoder';

type Channels = 1 | 2 | 3 | 4;

export async function encodePng(data: Uint8Array, w: number, h: number, channels: Channels): Promise<Buffer> {
  return sharp(Buffer.from(data.buffer, data.byteOffset, data.byteLength), { raw: { width: w, height: h, channels } })
    .png({ compressionLevel: 9, adaptiveFiltering: true, palette: false })
    .toBuffer();
}

export async function writePng(path: string, data: Uint8Array, w: number, h: number, channels: Channels): Promise<number> {
  const buf = await encodePng(data, w, h, channels);
  writeFileSync(path, buf);
  return buf.length;
}

export async function encodeWebp(data: Uint8Array, w: number, h: number, channels: 3 | 4, quality: number): Promise<Buffer> {
  return sharp(Buffer.from(data.buffer, data.byteOffset, data.byteLength), { raw: { width: w, height: h, channels } })
    .webp({ quality, effort: 6, smartSubsample: true })
    .toBuffer();
}

export async function writeWebp(path: string, data: Uint8Array, w: number, h: number, channels: 3 | 4, quality: number): Promise<number> {
  const buf = await encodeWebp(data, w, h, channels, quality);
  writeFileSync(path, buf);
  return buf.length;
}

/** Downsized preview (WebP) for docs/shots. */
export async function writePreview(path: string, data: Uint8Array, w: number, h: number, channels: 3 | 4, size: number, quality = 80): Promise<void> {
  const buf = await sharp(Buffer.from(data.buffer, data.byteOffset, data.byteLength), { raw: { width: w, height: h, channels } })
    .resize(size, size, { kernel: 'lanczos3' })
    .webp({ quality })
    .toBuffer();
  writeFileSync(path, buf);
}

/** ETC1S + mipmaps, sRGB. Returns bytes written or 0 on failure. */
export async function writeKtx2(path: string, rgb: Uint8Array, w: number, h: number): Promise<number> {
  try {
    const png = await encodePng(rgb, w, h, 3);
    const imageDecoder = async (buffer: Uint8Array) => {
      const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      return { data: new Uint8Array(data), width: info.width, height: info.height };
    };
    const out = await encodeToKTX2(new Uint8Array(png), {
      isUASTC: false,
      qualityLevel: 200,
      compressionLevel: 2,
      generateMipmap: true,
      isKTX2File: true,
      isPerceptual: true,
      isSetKTX2SRGBTransferFunc: true,
      imageDecoder,
    } as Parameters<typeof encodeToKTX2>[1]);
    writeFileSync(path, out);
    return out.length;
  } catch (e) {
    console.warn(`  ktx2 encode failed: ${String(e)}`);
    return 0;
  }
}

export function toU8(v: number): number {
  const x = Math.round(v * 255);
  return x < 0 ? 0 : x > 255 ? 255 : x;
}
