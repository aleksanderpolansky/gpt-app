export const PUBLICATION_IMAGE_MAX_SOURCE_BYTES = 10 * 1024 * 1024;
export const PUBLICATION_IMAGE_TARGET_BYTES = 400 * 1024;
export const PUBLICATION_IMAGE_MAX_BYTES = 512 * 1024;
export const PUBLICATION_IMAGE_MAX_EDGE_PX = 1600;

const PUBLICATION_IMAGE_SAFE_FALLBACK_PIXELS = 16_000_000;

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

type SourceDimensions = {
  width: number;
  height: number;
};

type DecodedPublicationImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
};

function readUint16BE(bytes: Uint8Array, offset: number) {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function readUint24LE(bytes: Uint8Array, offset: number) {
  return (
    bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16)
  );
}

function readUint32LE(bytes: Uint8Array, offset: number) {
  return (
    bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) |
    (bytes[offset + 3] << 24)
  ) >>> 0;
}

function readUint32BE(bytes: Uint8Array, offset: number) {
  return (
    (bytes[offset] * 0x1000000) +
    (bytes[offset + 1] << 16) +
    (bytes[offset + 2] << 8) +
    bytes[offset + 3]
  ) >>> 0;
}

function readAscii(bytes: Uint8Array, offset: number, length: number) {
  let value = "";

  for (let index = 0; index < length; index += 1) {
    value += String.fromCharCode(bytes[offset + index]);
  }

  return value;
}

function assertDimensions(dimensions: SourceDimensions) {
  if (
    dimensions.width <= 0 ||
    dimensions.height <= 0 ||
    !Number.isFinite(dimensions.width) ||
    !Number.isFinite(dimensions.height)
  ) {
    throw new Error("PUBLICATION_IMAGE_DIMENSIONS_INVALID");
  }

  return dimensions;
}

function readPngDimensions(bytes: Uint8Array) {
  if (
    bytes.length < 24 ||
    bytes[0] !== 0x89 ||
    readAscii(bytes, 1, 3) !== "PNG" ||
    bytes[4] !== 0x0d ||
    bytes[5] !== 0x0a ||
    bytes[6] !== 0x1a ||
    bytes[7] !== 0x0a
  ) {
    throw new Error("PUBLICATION_IMAGE_DECODE_FAILED");
  }

  return assertDimensions({
    width: readUint32BE(bytes, 16),
    height: readUint32BE(bytes, 20),
  });
}

function isJpegStartOfFrame(marker: number) {
  return (
    marker === 0xc0 ||
    marker === 0xc1 ||
    marker === 0xc2 ||
    marker === 0xc3 ||
    marker === 0xc5 ||
    marker === 0xc6 ||
    marker === 0xc7 ||
    marker === 0xc9 ||
    marker === 0xca ||
    marker === 0xcb ||
    marker === 0xcd ||
    marker === 0xce ||
    marker === 0xcf
  );
}

function readJpegDimensions(bytes: Uint8Array) {
  if (
    bytes.length < 4 ||
    bytes[0] !== 0xff ||
    bytes[1] !== 0xd8
  ) {
    throw new Error("PUBLICATION_IMAGE_DECODE_FAILED");
  }

  let offset = 2;

  while (offset + 4 <= bytes.length) {
    while (offset < bytes.length && bytes[offset] !== 0xff) {
      offset += 1;
    }

    while (offset < bytes.length && bytes[offset] === 0xff) {
      offset += 1;
    }

    if (offset >= bytes.length) {
      break;
    }

    const marker = bytes[offset];
    offset += 1;

    if (marker === 0xd8 || marker === 0xd9) {
      continue;
    }

    if (marker === 0xda) {
      break;
    }

    if (offset + 2 > bytes.length) {
      break;
    }

    const segmentLength = readUint16BE(bytes, offset);

    if (
      segmentLength < 2 ||
      offset + segmentLength > bytes.length
    ) {
      throw new Error("PUBLICATION_IMAGE_DECODE_FAILED");
    }

    if (isJpegStartOfFrame(marker)) {
      if (segmentLength < 7) {
        throw new Error("PUBLICATION_IMAGE_DECODE_FAILED");
      }

      return assertDimensions({
        height: readUint16BE(bytes, offset + 3),
        width: readUint16BE(bytes, offset + 5),
      });
    }

    offset += segmentLength;
  }

  throw new Error("PUBLICATION_IMAGE_DIMENSIONS_INVALID");
}

function readWebPDimensions(bytes: Uint8Array) {
  if (
    bytes.length < 20 ||
    readAscii(bytes, 0, 4) !== "RIFF" ||
    readAscii(bytes, 8, 4) !== "WEBP"
  ) {
    throw new Error("PUBLICATION_IMAGE_DECODE_FAILED");
  }

  let offset = 12;

  while (offset + 8 <= bytes.length) {
    const fourCc = readAscii(bytes, offset, 4);
    const chunkSize = readUint32LE(bytes, offset + 4);
    const dataOffset = offset + 8;
    const dataEnd = dataOffset + chunkSize;

    if (dataEnd > bytes.length) {
      throw new Error("PUBLICATION_IMAGE_DECODE_FAILED");
    }

    if (fourCc === "VP8X" && chunkSize >= 10) {
      return assertDimensions({
        width: 1 + readUint24LE(bytes, dataOffset + 4),
        height: 1 + readUint24LE(bytes, dataOffset + 7),
      });
    }

    if (
      fourCc === "VP8 " &&
      chunkSize >= 10 &&
      bytes[dataOffset + 3] === 0x9d &&
      bytes[dataOffset + 4] === 0x01 &&
      bytes[dataOffset + 5] === 0x2a
    ) {
      return assertDimensions({
        width:
          (bytes[dataOffset + 6] |
            (bytes[dataOffset + 7] << 8)) & 0x3fff,
        height:
          (bytes[dataOffset + 8] |
            (bytes[dataOffset + 9] << 8)) & 0x3fff,
      });
    }

    if (
      fourCc === "VP8L" &&
      chunkSize >= 5 &&
      bytes[dataOffset] === 0x2f
    ) {
      const bits = readUint32LE(bytes, dataOffset + 1);

      return assertDimensions({
        width: (bits & 0x3fff) + 1,
        height: ((bits >>> 14) & 0x3fff) + 1,
      });
    }

    offset = dataEnd + (chunkSize % 2);
  }

  throw new Error("PUBLICATION_IMAGE_DIMENSIONS_INVALID");
}

async function readSourceDimensions(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());

  if (file.type === "image/jpeg") {
    return readJpegDimensions(bytes);
  }

  if (file.type === "image/png") {
    return readPngDimensions(bytes);
  }

  if (file.type === "image/webp") {
    return readWebPDimensions(bytes);
  }

  throw new Error("PUBLICATION_IMAGE_TYPE_UNSUPPORTED");
}

function fitInsideMaxEdge(dimensions: SourceDimensions) {
  const maxEdge = Math.max(dimensions.width, dimensions.height);

  if (maxEdge <= PUBLICATION_IMAGE_MAX_EDGE_PX) {
    return dimensions;
  }

  const scale = PUBLICATION_IMAGE_MAX_EDGE_PX / maxEdge;

  return {
    width: Math.max(1, Math.round(dimensions.width * scale)),
    height: Math.max(1, Math.round(dimensions.height * scale)),
  };
}

function yieldToBrowser() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

async function decodeWithCreateImageBitmap(
  file: File,
  target: SourceDimensions,
): Promise<DecodedPublicationImage | null> {
  if (typeof createImageBitmap !== "function") {
    return null;
  }

  try {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
      resizeWidth: target.width,
      resizeHeight: target.height,
      resizeQuality: "high",
    });

    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      close: () => bitmap.close(),
    };
  } catch {
    return null;
  }
}

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

async function decodePublicationImage(
  file: File,
  sourceDimensions: SourceDimensions,
): Promise<DecodedPublicationImage> {
  const target = fitInsideMaxEdge(sourceDimensions);
  const bitmap = await decodeWithCreateImageBitmap(file, target);

  if (bitmap) {
    return bitmap;
  }

  const sourcePixels =
    sourceDimensions.width * sourceDimensions.height;

  if (sourcePixels > PUBLICATION_IMAGE_SAFE_FALLBACK_PIXELS) {
    throw new Error("PUBLICATION_IMAGE_DECODE_FAILED");
  }

  const image = await loadBrowserImage(file);

  return {
    source: image,
    width: target.width,
    height: target.height,
    close: () => undefined,
  };
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

  await yieldToBrowser();

  const sourceDimensions = await readSourceDimensions(file);
  const decoded = await decodePublicationImage(
    file,
    sourceDimensions,
  );

  let smallest:
    | { blob: Blob; width: number; height: number }
    | null = null;

  try {
    for (const dimensionFactor of DIMENSION_FACTORS) {
      const width = Math.max(
        1,
        Math.round(decoded.width * dimensionFactor),
      );
      const height = Math.max(
        1,
        Math.round(decoded.height * dimensionFactor),
      );
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("PUBLICATION_IMAGE_CANVAS_UNAVAILABLE");
      }

      context.drawImage(
        decoded.source,
        0,
        0,
        width,
        height,
      );

      for (const quality of WEBP_QUALITIES) {
        const blob = await encodeCanvasWebP(canvas, quality);

        if (!smallest || blob.size < smallest.blob.size) {
          smallest = { blob, width, height };
        }

        if (blob.size <= PUBLICATION_IMAGE_TARGET_BYTES) {
          return {
            blob,
            width,
            height,
            byteSize: blob.size,
          };
        }
      }
    }
  } finally {
    decoded.close();
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
