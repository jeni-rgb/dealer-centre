import sharp from "sharp";

/** Drop the blank margin around a black and white mark. White and transparent edges go. */
export async function trimMark(input: Buffer): Promise<Buffer> {
  try {
    const trimmed = await sharp(input)
      .flatten({ background: "#ffffff" })
      .trim({ background: "#ffffff", threshold: 30, lineArt: true })
      .png()
      .toBuffer();
    const size = pngSize(new Uint8Array(trimmed));
    if (size.width < 2 || size.height < 2) return input;
    return trimmed;
  } catch {
    return input;
  }
}

/** High contrast black and white PNG for a thermal label. White background, ink only where the mark is dark. */
export async function toMonoPng(input: Buffer): Promise<Buffer> {
  const mono = await sharp(input, { density: 300, limitInputPixels: 20_000_000 })
    .flatten({ background: "#ffffff" })
    .resize(480, 240, { fit: "inside", withoutEnlargement: false })
    .grayscale()
    .threshold(160)
    .png()
    .toBuffer();
  return trimMark(mono);
}

export function pngSize(buf: Uint8Array): { width: number; height: number } {
  if (buf.length < 24 || buf[0] !== 0x89) return { width: 1, height: 1 };
  return { width: (buf[16] << 24) | (buf[17] << 16) | (buf[18] << 8) | buf[19], height: (buf[20] << 24) | (buf[21] << 16) | (buf[22] << 8) | buf[23] };
}
