import { linesFromAi, linesFromCsv, supplierFromAi, type InvoiceLine } from "./lines";

const PROMPT = `You read a supplier invoice for a UK antiques dealer.
Reply with JSON only: {"supplier": string, "lines": [{"title": string, "qty": number, "cost": number}]}.
cost is the price paid for ONE unit, in pounds, not the line total.
qty is how many of that line were bought.
title is the product name on the invoice, short, no colour split.
Do not invent lines. If a number is missing, skip that line.`;

export async function readInvoiceFile(file: { name: string; type: string; bytes: Buffer }, apiKey: string | undefined): Promise<{ lines: InvoiceLine[]; supplier: string; read: boolean }> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || file.type.includes("csv") || file.type.startsWith("text/plain")) {
    return { lines: linesFromCsv(file.bytes.toString("utf8")), supplier: "", read: true };
  }
  if (!apiKey) return { lines: [], supplier: "", read: false };
  const mime = file.type || (name.endsWith(".pdf") ? "application/pdf" : name.endsWith(".png") ? "image/png" : "image/jpeg");
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: PROMPT }] },
      contents: [{ role: "user", parts: [
        { text: "Read this invoice." },
        { inline_data: { mime_type: mime, data: file.bytes.toString("base64") } },
      ] }],
      generationConfig: { temperature: 0, maxOutputTokens: 2000, responseMimeType: "application/json" },
    }),
  }).catch(() => null);
  if (!r?.ok) return { lines: [], supplier: "", read: false };
  const j = await r.json().catch(() => null);
  const text = (j?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
  try {
    const parsed = JSON.parse(text || "{}");
    return { lines: linesFromAi(parsed), supplier: supplierFromAi(parsed), read: true };
  } catch {
    return { lines: [], supplier: "", read: false };
  }
}
