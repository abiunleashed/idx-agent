import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/** Long side of an uploaded photo. Enough to see a scratch or a panel gap on any phone screen. */
const MAX_SIDE = 1600;
const JPEG_QUALITY = 0.75;

/**
 * Shrinks a picked photo before upload: an iPhone photo (3–5 MB, 4000+ px) becomes a
 * ~200–500 KB JPEG. Faster uploads on mobile data and far less storage used.
 * If anything goes wrong the original is used, so a photo is never lost.
 */
export async function compressPhoto(uri: string, width?: number, height?: number): Promise<string> {
  try {
    const context = ImageManipulator.manipulate(uri);
    const w = width ?? 0;
    const h = height ?? 0;
    if (w > MAX_SIDE || h > MAX_SIDE || !w || !h) {
      // Resize by the longer side; unknown size → assume landscape-ish and cap the width.
      context.resize(h > w ? { height: MAX_SIDE } : { width: Math.min(w || MAX_SIDE, MAX_SIDE) });
    }
    const image = await context.renderAsync();
    const result = await image.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });
    return result.uri;
  } catch {
    return uri;
  }
}
