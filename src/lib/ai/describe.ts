/** Photo listing calls. Gemini 3 wants thinkingLevel. Gemini 2.5 wants thinkingBudget. Sending the wrong one is a 400. */

export const DESCRIBE_MODEL = "gemini-3.5-flash-lite";
export const DESCRIBE_FALLBACK = "gemini-2.5-flash-lite";
export const DESCRIBE_TIMEOUT_MS = 12_000;
export const DESCRIBE_MAX_TOKENS = 250;

export const DESCRIBE_BUSY = "AI is busy, please type the description or try again shortly";
export const DESCRIBE_FAIL = "Couldn't write a description just now";

const PROMPT = `You write listings for an antiques and collectables centre in the UK.
Look at the photo and reply with JSON only: {"title": string, "description": string}.
- title: short and honest, at most 70 characters, the way a dealer would label it (e.g. "Victorian brass carriage clock").
- description: 2 to 4 sentences in British English, describing what can actually be seen: object, material, style, colour, condition.
- Never invent provenance, makers, dates, marks, measurements or values. If unsure of age or maker, say "appears to be" or leave it out.
- Mention visible wear or damage plainly. No hype, no emojis.`;

export function describeThinking(model: string): { thinkingBudget: 0 } | { thinkingLevel: "minimal" } | undefined {
  if (/gemini-2\.5-pro/.test(model)) return undefined;
  if (/gemini-2\./.test(model)) return { thinkingBudget: 0 };
  return { thinkingLevel: "minimal" };
}

export function describeFallback(model: string): string | null {
  return model === DESCRIBE_FALLBACK ? null : DESCRIBE_FALLBACK;
}

export function shouldRetryDescribe(status: number): boolean {
  return status === 429 || status >= 500;
}

type Part = { text?: string; thought?: boolean };

export function candidateText(payload: { candidates?: { content?: { parts?: Part[] }; finishReason?: string }[] } | null): string {
  const parts = payload?.candidates?.[0]?.content?.parts ?? [];
  return parts.filter((p) => !p.thought && p.text).map((p) => p.text).join("");
}

export function listingFromText(text: string): { title: string; description: string } | null {
  try {
    const out = JSON.parse(text || "{}") as { title?: unknown; description?: unknown };
    const title = String(out.title ?? "").trim().slice(0, 120);
    const description = String(out.description ?? "").trim().slice(0, 2000);
    if (!title && !description) return null;
    return { title, description };
  } catch {
    return null;
  }
}

export function describeRequest(model: string, mime: string, data: string) {
  const thinking = describeThinking(model);
  return {
    systemInstruction: { parts: [{ text: PROMPT }] },
    contents: [{ role: "user", parts: [
      { text: "Write the title and description for this item." },
      { inline_data: { mime_type: mime || "image/jpeg", data } },
    ] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: DESCRIBE_MAX_TOKENS,
      responseMimeType: "application/json",
      responseSchema: { type: "OBJECT", properties: { title: { type: "STRING" }, description: { type: "STRING" } }, required: ["title", "description"] },
      ...(thinking ? { thinkingConfig: thinking } : {}),
    },
  };
}

export type DescribeResult =
  | { ok: true; title: string; description: string }
  | { ok: false; status: number; error: string };

type Attempt = { status: number; retry: boolean; listing: { title: string; description: string } | null };

async function once(model: string, mime: string, data: string, key: string, fetchImpl: typeof fetch, timeoutMs: number): Promise<Attempt> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  const started = Date.now();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  try {
    const r = await fetchImpl(url, {
      method: "POST",
      headers: { "x-goog-api-key": key, "content-type": "application/json" },
      body: JSON.stringify(describeRequest(model, mime, data)),
      signal: ac.signal,
    });
    const duration_ms = Date.now() - started;
    if (!r.ok) {
      const error = (await r.text().catch(() => "")).slice(0, 500);
      console.log(`[ai describe] model=${model} duration_ms=${duration_ms} status=${r.status} error=${error}`);
      return { status: r.status, retry: shouldRetryDescribe(r.status), listing: null };
    }
    const j = await r.json().catch(() => null);
    const finish = j?.candidates?.[0]?.finishReason ?? "";
    console.log(`[ai describe] model=${model} duration_ms=${duration_ms} status=${r.status} finish=${finish}`);
    return { status: r.status, retry: false, listing: listingFromText(candidateText(j)) };
  } catch (e) {
    const duration_ms = Date.now() - started;
    const aborted = (e as { name?: string })?.name === "AbortError";
    console.log(`[ai describe] model=${model} duration_ms=${duration_ms} status=timeout error=${aborted ? "aborted" : (e as Error).message}`);
    return { status: 0, retry: true, listing: null };
  } finally {
    clearTimeout(timer);
  }
}

/** One Gemini call, then a single try on the fast fallback after a timeout, 429 or 5xx. */
export async function runDescribe(opts: { key: string; model?: string; mime: string; data: string; fetchImpl?: typeof fetch; timeoutMs?: number }): Promise<DescribeResult> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const timeoutMs = opts.timeoutMs ?? DESCRIBE_TIMEOUT_MS;
  const primary = opts.model || DESCRIBE_MODEL;
  const first = await once(primary, opts.mime, opts.data, opts.key, fetchImpl, timeoutMs);
  if (first.listing) return { ok: true, ...first.listing };
  const next = first.retry ? describeFallback(primary) : null;
  if (next) {
    const second = await once(next, opts.mime, opts.data, opts.key, fetchImpl, timeoutMs);
    if (second.listing) return { ok: true, ...second.listing };
    if (second.status === 429 || first.status === 429) return { ok: false, status: 429, error: DESCRIBE_BUSY };
  }
  if (first.status === 429) return { ok: false, status: 429, error: DESCRIBE_BUSY };
  return { ok: false, status: 502, error: DESCRIBE_FAIL };
}
