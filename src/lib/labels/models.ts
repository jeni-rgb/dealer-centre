/** Label printers the app lays labels out for. Sizes are the roll in mm; the renderer scales to fit. */
export const PRINTER_MODELS = [
  { id: "brother-ql-62x29", name: "Brother QL (DK-11209, 62 × 29 mm)", w: 62, h: 29, note: "QL-820NWB, QL-810W, QL-1110NWB. The home printer most dealers have." },
  { id: "zebra-57x32", name: "Zebra ZD411 / ZD410 (57 × 32 mm)", w: 57, h: 32, note: "The label printer in the Square Register Retail Kit." },
  { id: "zebra-51x25", name: "Zebra ZD411 / ZD410 (51 × 25 mm)", w: 51, h: 25, note: "Smaller Zebra roll." },
  { id: "dymo-57x32", name: "Dymo LabelWriter 550 (57 × 32 mm, 11354)", w: 57, h: 32, note: "" },
  { id: "dymo-54x25", name: "Dymo LabelWriter 550 (54 × 25 mm, 11352)", w: 54, h: 25, note: "" },
  { id: "other-62x29", name: "Other, 62 × 29 mm roll", w: 62, h: 29, note: "" },
  { id: "other-80x50", name: "Other, 80 × 50 mm label", w: 80, h: 50, note: "Larger labels, e.g. thermal printers with 80 × 50 rolls." },
] as const;
export type PrinterModelId = (typeof PRINTER_MODELS)[number]["id"];
export const modelById = (id: string) => PRINTER_MODELS.find((m) => m.id === id) ?? PRINTER_MODELS[0];
