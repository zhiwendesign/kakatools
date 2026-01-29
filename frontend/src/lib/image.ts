export async function compressImage(
  file: File,
  opts?: { targetMB?: number; maxDimension?: number; format?: 'image/webp' | 'image/jpeg' }
): Promise<File> {
  const targetBytes = (opts?.targetMB ?? 10) * 1024 * 1024;
  const maxDim = opts?.maxDimension ?? 4096;
  let format: 'image/webp' | 'image/jpeg' = opts?.format ?? 'image/webp';
  const img = await loadImage(file);
  let width = img.width;
  let height = img.height;
  const maxSide = Math.max(width, height);
  if (maxSide > maxDim) {
    const scale = maxDim / maxSide;
    width = Math.floor(width * scale);
    height = Math.floor(height * scale);
  }
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(img, 0, 0, width, height);
  let quality = 0.92;
  let blob = await toBlob(canvas, format, quality);
  if (!blob) {
    format = 'image/jpeg';
    blob = await toBlob(canvas, format, quality);
  }
  let iterations = 0;
  while (blob && blob.size > targetBytes && iterations < 20) {
    iterations++;
    if (quality > 0.4) {
      quality = Math.max(0.4, quality - 0.08);
    } else {
      width = Math.floor(width * 0.9);
      height = Math.floor(height * 0.9);
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
    }
    const next = await toBlob(canvas, format, quality);
    if (next) blob = next; else break;
  }
  return new File([blob ?? file], `${Date.now()}-compressed.${format === 'image/webp' ? 'webp' : 'jpg'}`, { type: format });
}

async function loadImage(file: File): Promise<HTMLImageElement | ImageBitmap> {
  if ('createImageBitmap' in window && typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0);
    const img = new Image();
    img.src = canvas.toDataURL();
    await waitImage(img);
    return img;
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  await waitImage(img);
  URL.revokeObjectURL(url);
  return img;
}

function waitImage(img: HTMLImageElement) {
  return new Promise<void>((resolve, reject) => {
    if (img.complete) return resolve();
    img.onload = () => resolve();
    img.onerror = reject;
  });
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}
