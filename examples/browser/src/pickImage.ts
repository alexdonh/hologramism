/**
 * Turn a user-supplied File (drag & drop or file input) into a HologramShape.
 *
 * SVG is passed through as source text — the Rust side rasterizes it at engine
 * resolution, so it stays crisp at any layout size. Raster images are downscaled
 * to MAX_EDGE first: in `single` layout the engine builds four full-resolution
 * RGBA maps from the source, so an untouched 12 MP photo would cost ~190 MB of
 * texture plus a per-pixel Sobel pass.
 */

import type { HologramShape } from '@hologramism/browser';

const MAX_EDGE = 1024;

export const ACCEPTED = 'image/png,image/jpeg,image/svg+xml,image/webp,image/gif';

/** What the demo keeps in state for a picked image. */
export interface PickedImage {
  /** Ready to spread into a shape, minus `mode`. */
  shape: { type: 'png'; uri: string } | { type: 'svg'; svg: string };
  /** Object URL to revoke when this image is replaced or cleared; null for SVG. */
  objectUrl: string | null;
  name: string;
}

export function pickedShape(picked: PickedImage, mode: 'image' | 'mask'): HologramShape {
  return { ...picked.shape, mode };
}

export async function fileToPicked(file: File): Promise<PickedImage> {
  if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
    return { shape: { type: 'svg', svg: await file.text() }, objectUrl: null, name: file.name };
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d canvas context unavailable');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  // Always re-encode as PNG so alpha survives (JPEG input simply has none).
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('failed to encode image');

  const objectUrl = URL.createObjectURL(blob);
  return { shape: { type: 'png', uri: objectUrl }, objectUrl, name: file.name };
}

/** First image file in a drop / file-input event, or null. */
export function firstImage(files: FileList | null): File | null {
  if (!files) return null;
  for (const f of Array.from(files)) {
    if (f.type.startsWith('image/') || f.name.toLowerCase().endsWith('.svg')) return f;
  }
  return null;
}
