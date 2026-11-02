import { NextResponse } from "next/server";
import { z } from "zod";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";

const Input = z.object({
  kind: z.enum(["web", "ios", "android"]),
  endpoint: z.string().min(10),
  keys: z.object({ p256dh: z.string(), auth: z.string() }).optional(),
});

/** Register this device or browser for sale notifications. Idempotent per endpoint. */
export async function POST(req: Request) {
  const me = await getMe();
  if (!me) return NextResponse.json({ error: "sign in" }, { status: 401 });
  const p = Input.safeParse(await req.json());
  if (!p.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const { error } = await supabaseAdmin().from("push_subscriptions").upsert(
    { user_id: me.id, dealer_id: me.dealer_id ?? null, kind: p.data.kind, endpoint: p.data.endpoint, keys: p.data.keys ?? null, user_agent: req.headers.get("user-agent")?.slice(0, 200) ?? null, failed_at: null },
    { onConflict: "endpoint" },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const me = await getMe();
  if (!me) return NextResponse.json({ error: "sign in" }, { status: 401 });
  const { endpoint } = (await req.json()) as { endpoint?: string };
  if (endpoint) await supabaseAdmin().from("push_subscriptions").delete().eq("user_id", me.id).eq("endpoint", endpoint);
  return NextResponse.json({ ok: true });
}

/** Test: sends "It works" to the caller's dealer devices. */
export async function PUT() {
  const me = await getMe();
  if (!me?.dealer_id) return NextResponse.json({ error: "sign in" }, { status: 401 });
  const { pushToDealer } = await import("@/lib/push/send");
  const r = await pushToDealer(supabaseAdmin(), me.dealer_id, { title: "Dealer Centre", body: "Notifications are on. You will hear the moment something sells.", url: "/app", tag: "test" });
  return NextResponse.json(r);
}
