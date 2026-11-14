import { NextResponse } from "next/server";
import { z } from "zod";
import { getMe } from "@/lib/auth";
import { DESCRIBE_FAIL, runDescribe } from "@/lib/ai/describe";

export const maxDuration = 30;

const Input = z.object({ image: z.string().startsWith("data:image/").max(4_000_000) });

// Runaway-use brake only, not a working cap. A normal listing session (about 40 an hour, including retries) should never hit this. Serverless instances each keep their own count.
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 200;
const hits = new Map<string, number[]>();
function allow(key: string) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) { hits.set(key, recent); return false; }
  recent.push(now); hits.set(key, recent);
  return true;
}

/** Suggests a title and description from a photo using Google Gemini. 503 when no AI key is set so the app hides the button. */
export async function GET() {
  return NextResponse.json({ enabled: !!process.env.GEMINI_API_KEY });
}

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

  try {
    const result = await runDescribe({ key, model: process.env.GEMINI_MODEL, mime: m[1] || "image/jpeg", data: m[2] });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ title: result.title, description: result.description });
  } catch {
    return NextResponse.json({ error: DESCRIBE_FAIL }, { status: 502 });
  }
}
