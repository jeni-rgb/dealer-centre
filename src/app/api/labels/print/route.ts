import { NextResponse } from "next/server";
import { z } from "zod";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { enqueue } from "@/lib/jobs/queue";

const Input = z.object({ item_ids: z.array(z.string().uuid()).min(1).max(200), printer_id: z.string().uuid().optional() });

/** Queue labels for items on a chosen printer. Creates or re-queues the item's print job. */
export async function POST(req: Request) {
  const me = await getMe();
  if (!me?.dealer_id) return NextResponse.json({ error: "sign in" }, { status: 401 });
  const p = Input.safeParse(await req.json());
  if (!p.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const db = supabaseAdmin();

  let printerId = p.data.printer_id ?? null;
  if (!printerId) {
    const { data: last } = await db.from("print_jobs").select("printer_id").eq("dealer_id", me.dealer_id).not("printer_id", "is", null).order("updated_at", { ascending: false }).limit(1).maybeSingle();
    printerId = last?.printer_id ?? null;
  }
  const { data: items } = await db.from("items").select("id").eq("dealer_id", me.dealer_id).in("id", p.data.item_ids);
  let queued = 0;
  for (const it of items ?? []) {
    const { data: existing } = await db.from("print_jobs").select("id").eq("item_id", it.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const row = { item_id: it.id, dealer_id: me.dealer_id, printer_id: printerId, status: printerId ? "queued" : "ready", requested_at: new Date().toISOString(), last_error: null };
    const { data: pj } = existing
      ? await db.from("print_jobs").update(row).eq("id", existing.id).select("id").single()
      : await db.from("print_jobs").insert(row).select("id").single();
    if (pj && printerId) { await enqueue(db, "render_label", { print_job_id: pj.id }); queued++; }
  }
  return NextResponse.json({ queued, printer_id: printerId, browser: !printerId ? `/api/labels/batch?ids=${p.data.item_ids.join(",")}` : null });
}
