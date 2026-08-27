export const PUBLICATION_IMAGE_MAX_SOURCE_BYTES = 10 * 1024 * 1024;
export const PUBLICATION_IMAGE_TARGET_BYTES = 400 * 1024;
export const PUBLICATION_IMAGE_MAX_BYTES = 512 * 1024;
export const PUBLICATION_IMAGE_MAX_EDGE_PX = 1600;

const SUPPORTED_SOURCE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const DIMENSION_FACTORS = [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4];
const WEBP_QUALITIES = [0.86, 0.78, 0.7, 0.62, 0.54, 0.46];

export type OptimizedPublicationImage = {
  blob: Blob;
  width: number;
  height: number;
  byteSize: number;
};

function loadBrowserImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    const cleanup = () => URL.revokeObjectURL(objectUrl);

    image.onload = () => {
      cleanup();
      resolve(image);
    };
    image.onerror = () => {
      cleanup();
      reject(new Error("PUBLICATION_IMAGE_DECODE_FAILED"));
    };
    image.src = objectUrl;
  });
}

function encodeCanvasWebP(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob || blob.type !== "image/webp") {
          reject(new Error("PUBLICATION_IMAGE_WEBP_ENCODE_FAILED"));
          return;
        }
        resolve(blob);
      },
      "image/webp",
      quality,
    );
  });
}

export async function optimizePublicationImage(
  file: File,
): Promise<OptimizedPublicationImage> {
  if (!SUPPORTED_SOURCE_TYPES.has(file.type)) {
    throw new Error("PUBLICATION_IMAGE_TYPE_UNSUPPORTED");
  }
  if (file.size <= 0) {
    throw new Error("PUBLICATION_IMAGE_EMPTY");
  }
  if (file.size > PUBLICATION_IMAGE_MAX_SOURCE_BYTES) {
    throw new Error("PUBLICATION_IMAGE_SOURCE_TOO_LARGE");
  }

  const image = await loadBrowserImage(file);
  const sourceWidth = image.naturalWidth;
  const sourceHeight = image.naturalHeight;

  if (sourceWidth <= 0 || sourceHeight <= 0) {
    throw new Error("PUBLICATION_IMAGE_DIMENSIONS_INVALID");
  }

  const maxSourceEdge = Math.max(sourceWidth, sourceHeight);
  const initialScale =
    maxSourceEdge > PUBLICATION_IMAGE_MAX_EDGE_PX
      ? PUBLICATION_IMAGE_MAX_EDGE_PX / maxSourceEdge
      : 1;

  let smallest:
    | { blob: Blob; width: number; height: number }
    | null = null;

  for (const dimensionFactor of DIMENSION_FACTORS) {
    const scale = initialScale * dimensionFactor;
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("PUBLICATION_IMAGE_CANVAS_UNAVAILABLE");
    }

    context.drawImage(image, 0, 0, width, height);

    for (const quality of WEBP_QUALITIES) {
      const blob = await encodeCanvasWebP(canvas, quality);

      if (!smallest || blob.size < smallest.blob.size) {
        smallest = { blob, width, height };
      }

      if (blob.size <= PUBLICATION_IMAGE_TARGET_BYTES) {
        return { blob, width, height, byteSize: blob.size };
      }
    }
  }

  if (smallest && smallest.blob.size <= PUBLICATION_IMAGE_MAX_BYTES) {
    return {
      blob: smallest.blob,
      width: smallest.width,
      height: smallest.height,
      byteSize: smallest.blob.size,
    };
  }

  throw new Error("PUBLICATION_IMAGE_TOO_LARGE_AFTER_OPTIMIZATION");
}
