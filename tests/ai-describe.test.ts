import { describe, expect, it, vi } from "vitest";
import { candidateText, describeFallback, describeRequest, describeThinking, listingFromText, runDescribe, shouldRetryDescribe } from "@/lib/ai/describe";

const okBody = { candidates: [{ finishReason: "STOP", content: { parts: [{ thought: true, text: "thinking" }, { text: '{"title":"Blue jug","description":"A small blue jug."}' }] } }] };

function jsonResponse(status: number, body: unknown) {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("photo describe", () => {
  it("turns thinking off the way each model allows", () => {
    expect(describeThinking("gemini-3.5-flash-lite")).toEqual({ thinkingLevel: "minimal" });
    expect(describeThinking("gemini-3-flash")).toEqual({ thinkingLevel: "minimal" });
    expect(describeThinking("gemini-2.5-flash-lite")).toEqual({ thinkingBudget: 0 });
    expect(describeThinking("gemini-2.5-flash")).toEqual({ thinkingBudget: 0 });
    expect(describeThinking("gemini-2.5-pro")).toBeUndefined();
    const body = describeRequest("gemini-3.5-flash-lite", "image/jpeg", "abc");
    expect(body.generationConfig.maxOutputTokens).toBe(250);
    expect(body.generationConfig.thinkingConfig).toEqual({ thinkingLevel: "minimal" });
  });

  it("reads the listing and ignores thought text", () => {
    expect(listingFromText(candidateText(okBody))).toEqual({ title: "Blue jug", description: "A small blue jug." });
    expect(listingFromText("")).toBeNull();
    expect(shouldRetryDescribe(429)).toBe(true);
    expect(shouldRetryDescribe(503)).toBe(true);
    expect(shouldRetryDescribe(400)).toBe(false);
    expect(describeFallback("gemini-3.5-flash-lite")).toBe("gemini-2.5-flash-lite");
    expect(describeFallback("gemini-2.5-flash-lite")).toBeNull();
  });

  it("retries a timeout once on the fast model", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const seen: string[] = [];
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      seen.push(String(url));
      const model = decodeURIComponent(String(url));
      const sent = JSON.parse(String(init?.body));
      if (model.includes("gemini-3.5-flash-lite")) {
        expect(sent.generationConfig.thinkingConfig).toEqual({ thinkingLevel: "minimal" });
        expect(sent.generationConfig.maxOutputTokens).toBe(250);
        await new Promise((_, reject) => {
          init?.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
        });
      }
      expect(sent.generationConfig.thinkingConfig).toEqual({ thinkingBudget: 0 });
      return jsonResponse(200, okBody);
    });
    const result = await runDescribe({ key: "k", mime: "image/jpeg", data: "abc", fetchImpl: fetchImpl as unknown as typeof fetch, timeoutMs: 30 });
    expect(result).toEqual({ ok: true, title: "Blue jug", description: "A small blue jug." });
    expect(seen.some((u) => u.includes("gemini-2.5-flash-lite"))).toBe(true);
    expect(console.log).toHaveBeenCalled();
    const lines = vi.mocked(console.log).mock.calls.map((c) => String(c[0]));
    expect(lines.some((l) => l.includes("duration_ms=") && l.includes("model=gemini-3.5-flash-lite") && l.includes("status=timeout"))).toBe(true);
    expect(lines.some((l) => l.includes("model=gemini-2.5-flash-lite") && l.includes("duration_ms=") && l.includes("status=200"))).toBe(true);
    vi.restoreAllMocks();
  });

  it("does not retry a 400", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const fetchImpl = vi.fn(async () => jsonResponse(400, { error: { message: "bad model" } }));
    const result = await runDescribe({ key: "k", mime: "image/jpeg", data: "abc", fetchImpl: fetchImpl as unknown as typeof fetch, timeoutMs: 1000 });
    expect(result.ok).toBe(false);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const line = String(vi.mocked(console.log).mock.calls[0][0]);
    expect(line).toContain("status=400");
    expect(line).toContain("bad model");
    vi.restoreAllMocks();
  });
});
