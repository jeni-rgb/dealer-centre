import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { PostageRequest, PostageResult } from "./clickdrop";

/** POSTAGE_PROVIDER=sample: a dummy 6x4 label, clearly marked, so the whole bench flow can be run and trained on before the carrier account exists. */
export async function sampleBuy(reqs: PostageRequest[]): Promise<PostageResult[]> {
  const out: PostageResult[] = [];
  for (const { order: o, weightGrams, serviceCode } of reqs) {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([288, 432]); // 4 x 6 inches
    const sans = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const t = (s: string, x: number, y: number, size: number, f = sans) => page.drawText(s, { x, y, size, font: f, color: rgb(0.1, 0.1, 0.1) });
    page.drawRectangle({ x: 8, y: 8, width: 272, height: 416, borderWidth: 1.5, borderColor: rgb(0.1, 0.1, 0.1) });
    t("SAMPLE LABEL", 20, 400, 16, bold); t("NOT VALID FOR POSTING", 20, 384, 10, bold);
    t("Royal Mail Tracked 48 (sample)", 20, 360, 10);
    t("Deliver to", 20, 330, 8);
    const lines = [o.buyer ?? "", ...(o.address ?? "").split(", ")].filter(Boolean);
    lines.forEach((l, i) => t(l, 20, 314 - i * 14, 11, bold));
    page.drawRectangle({ x: 20, y: 120, width: 248, height: 70, color: rgb(0.1, 0.1, 0.1) });
    const tracking = `SAMPLE${o.sale_id.replace(/-/g, "").slice(0, 8).toUpperCase()}GB`;
    t(tracking, 20, 100, 12, bold);
    t(`${weightGrams} g · service ${serviceCode} · ref ${o.order_name ?? ""}`, 20, 80, 8);
    t("Return to: Dealer Centre Ltd, Norwich", 20, 24, 8);
    out.push({ sale_id: o.sale_id, ok: true, orderIdentifier: `sample-${o.sale_id.slice(0, 8)}`, tracking, labelPdf: await pdf.save(), carrier: "Sample" });
  }
  return out;
}
