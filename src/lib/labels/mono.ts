import sharp from "sharp";

/** High contrast black and white PNG for a thermal label. White background, ink only where the mark is dark. */
export async function toMonoPng(input: Buffer): Promise<Buffer> {
  return sharp(input, { density: 300, limitInputPixels: 20_000_000 })
    .flatten({ background: "#ffffff" })
    .resize(480, 240, { fit: "inside", withoutEnlargement: false })
    .grayscale()
    .threshold(160)
    .png()
    .toBuffer();
}

export function pngSize(buf: Uint8Array): { width: number; height: number } {
  if (buf.length < 24 || buf[0] !== 0x89) return { width: 1, height: 1 };
  return { width: (buf[16] << 24) | (buf[17] << 16) | (buf[18] << 8) | buf[19], height: (buf[20] << 24) | (buf[21] << 16) | (buf[22] << 8) | buf[23] };
}
