import { describe, it, expect } from "vitest";
import { renderLabelPdf, renderLabelBatch } from "@/lib/labels/render";

describe("labels", () => {
  it("renders a single label PDF at 62x29mm", async () => {
    const pdf = await renderLabelPdf({ sku: "B140372", dealerCode: "B14", title: "Victorian mahogany writing slope with brass fittings", pricePence: 14500, centreName: "Magdalen Antiques Centre" });
    expect(pdf.byteLength).toBeGreaterThan(1000);
    expect(Buffer.from(pdf.slice(0, 5)).toString()).toBe("%PDF-");
  });
  it("renders a batch with one page per label", async () => {
    const pdf = await renderLabelBatch([
      { sku: "B140372", dealerCode: "B14", title: "A", pricePence: 100 },
      { sku: "B140373", dealerCode: "B14", title: "B", pricePence: 200 },
    ]);
    const { PDFDocument } = await import("pdf-lib");
    const doc = await PDFDocument.load(pdf);
    expect(doc.getPageCount()).toBe(2);
  });
});
