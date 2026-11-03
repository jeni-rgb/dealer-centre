import { NextResponse } from "next/server";
import { z } from "zod";
import { getMe } from "@/lib/auth";

const Input = z.object({ image: z.string().startsWith("data:image/").max(4_000_000) });

// Best effort per dealer limit. Serverless instances each keep their own count, which is fine as a brake on runaway use.
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 40;
const hits = new Map<string, number[]>();
function allow(key: string) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) { hits.set(key, recent); return false; }
  recent.push(now); hits.set(key, recent);
  return true;
}

const PROMPT = `You write listings for an antiques and collectables centre in the UK.
Look at the photo and reply with JSON only: {"title": string, "description": string}.
- title: short and honest, at most 70 characters, the way a dealer would label it (e.g. "Victorian brass carriage clock").
- description: 2 to 4 sentences in British English, describing what can actually be seen: object, material, style, colour, condition.
- Never invent provenance, makers, dates, marks, measurements or values. If unsure of age or maker, say "appears to be" or leave it out.
- Mention visible wear or damage plainly. No hype, no emojis.`;

/** Suggests a title and description from a photo using Google Gemini. 503 when no AI key is set so the app hides the button. */
export async function GET() {
  return NextResponse.json({ enabled: !!process.env.GEMINI_API_KEY });
}

const BUSY = "AI is busy, please type the description or try again shortly";
const FAIL = "Couldn't write a description just now";

export async function POST(req: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: "AI descriptions are not switched on" }, { status: 503 });
  const me = await getMe();
  if (!me?.dealer_id) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const p = Input.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Send a photo" }, { status: 400 });
  if (!allow(me.dealer_id)) return NextResponse.json({ error: "That's a lot of descriptions this hour, try again shortly" }, { status: 429 });

  const m = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(p.data.image);
  if (!m) return NextResponse.json({ error: "Send a photo" }, { status: 400 });
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": key, "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: PROMPT }] },
      contents: [{ role: "user", parts: [
        { text: "Write the title and description for this item." },
        { inline_data: { mime_type: m[1] || "image/jpeg", data: m[2] } },
      ] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 400,
        responseMimeType: "application/json",
        responseSchema: { type: "OBJECT", properties: { title: { type: "STRING" }, description: { type: "STRING" } }, required: ["title", "description"] },
      },
    }),
  }).catch(() => null);
  if (r?.status === 429) return NextResponse.json({ error: BUSY }, { status: 429 });
  if (!r?.ok) return NextResponse.json({ error: FAIL }, { status: 502 });
  const j = await r.json().catch(() => null);
  try {
    const text = (j?.candidates?.[0]?.content?.parts ?? []).map((x: { text?: string }) => x.text ?? "").join("");
    const out = JSON.parse(text || "{}");
    const title = String(out.title ?? "").trim().slice(0, 120);
    const description = String(out.description ?? "").trim().slice(0, 2000);
    if (!title && !description) throw new Error("empty");
    return NextResponse.json({ title, description });
  } catch {
    return NextResponse.json({ error: FAIL }, { status: 502 });
  }
}
