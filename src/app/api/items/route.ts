import { NextResponse, after } from "next/server";
import { runJobsNow } from "@/lib/jobs/queue";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { CreateItemInput, createItem, PlanLimitError } from "@/lib/items/create";

export const maxDuration = 60;

export async function POST(req: Request) {
  const me = await getMe();
  if (!me?.dealer_id) return NextResponse.json({ error: "Sign in as a dealer" }, { status: 401 });
  const parsed = CreateItemInput.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  try {
    const t0 = Date.now();
    const db = supabaseAdmin();
    const jobIds: string[] = [];
    const item = await createItem(db, me.dealer_id, parsed.data, jobIds);
    console.log(`[items] created ${item.sku} in ${Date.now() - t0}ms, ${jobIds.length} jobs to background`);
    // Shopify/Square sync and label rendering run after the response, not on the daily cron.
    after(() => runJobsNow(db, jobIds));
    return NextResponse.json({ item });
  } catch (e) {
    if (e instanceof PlanLimitError) return NextResponse.json({ error: e.message, code: "plan_limit" }, { status: 402 });
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
