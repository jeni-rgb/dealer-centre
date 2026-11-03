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

/** Suggests a title and description from a photo. 503 when no AI key is set so the app hides the button. */
export async function GET() {
  return NextResponse.json({ enabled: !!process.env.OPENAI_API_KEY });
}

export async function POST(req: Request) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({ error: "AI descriptions are not switched on" }, { status: 503 });
  const me = await getMe();
  if (!me?.dealer_id) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const p = Input.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Send a photo" }, { status: 400 });
  if (!allow(me.dealer_id)) return NextResponse.json({ error: "That's a lot of descriptions this hour, try again shortly" }, { status: 429 });

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: 300,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: PROMPT },
        { role: "user", content: [{ type: "text", text: "Write the title and description for this item." }, { type: "image_url", image_url: { url: p.data.image, detail: "low" } }] },
      ],
    }),
  }).catch(() => null);
  if (!r?.ok) return NextResponse.json({ error: "Couldn't write a description just now" }, { status: 502 });
  const j = await r.json();
  try {
    const out = JSON.parse(j.choices?.[0]?.message?.content ?? "{}");
    const title = String(out.title ?? "").trim().slice(0, 120);
    const description = String(out.description ?? "").trim().slice(0, 2000);
    if (!title && !description) throw new Error("empty");
    return NextResponse.json({ title, description });
  } catch {
    return NextResponse.json({ error: "Couldn't write a description just now" }, { status: 502 });
  }
}
