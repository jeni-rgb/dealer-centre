import { NextResponse } from "next/server";
import { getMe } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { renderLabelBatch } from "@/lib/labels/render";
import { logoForDealer } from "@/lib/labels/load";

/** GET /api/labels/batch?ids=a,b,c  returns a multi page PDF for browser printing. */
export async function GET(req: Request) {
  const me = await getMe();
  if (!me?.dealer_id) return new NextResponse("sign in", { status: 401 });
  const url = new URL(req.url);
  const num = (k: string) => { const n = Number(url.searchParams.get(k)); return n >= 20 && n <= 200 ? n : undefined; };
  const widthMm = num("w"), heightMm = num("h");
  const ids = (new URL(req.url).searchParams.get("ids") ?? "").split(",").filter(Boolean).slice(0, 200);
  if (!ids.length) return new NextResponse("no ids", { status: 400 });

  const sb = await supabaseServer();
  const { data: items } = await sb.from("items").select("id, sku, title, price_pence, dealer_id, centres(name), dealers(code, name)").in("id", ids);
  const jobs = await sb.from("print_jobs").select("item_id, copies, centre_id, place_label, created_at").in("item_id", ids).order("created_at", { ascending: true });
  const centreIds = [...new Set((jobs.data ?? []).map((j) => j.centre_id).filter(Boolean))] as string[];
  const { data: centreRows } = centreIds.length ? await sb.from("centres").select("id, name").in("id", centreIds) : { data: [] };
  const centreName = new Map((centreRows ?? []).map((c) => [c.id as string, c.name as string]));
  if (!items?.length) return new NextResponse("not found", { status: 404 });
  const logos = new Map<string, Awaited<ReturnType<typeof logoForDealer>>>();
  for (const i of items) {
    const dealerId = i.dealer_id as string;
    if (!logos.has(dealerId)) logos.set(dealerId, await logoForDealer(sb, dealerId));
  }

  const byId = new Map(items.map((i) => [i.id as string, i]));
  const sheets = ids.flatMap((id) => {
    const i = byId.get(id);
    if (!i) return [];
    const mine = (jobs.data ?? []).filter((j) => j.item_id === id);
    const groups = mine.some((j) => j.centre_id || j.place_label) ? mine : [{ copies: mine[0]?.copies ?? 1, centre_id: null, place_label: null }];
    return groups.flatMap((job) => {
      const input = {
        sku: i.sku,
        title: i.title,
        pricePence: i.price_pence,
        dealerCode: (i.dealers as unknown as { code: string }).code,
        dealerName: (i.dealers as unknown as { name?: string | null }).name ?? null,
        centreName: job.place_label || (job.centre_id ? centreName.get(job.centre_id) : null) || (i.centres as unknown as { name: string } | null)?.name || null,
        widthMm,
        heightMm,
        logo: logos.get(i.dealer_id as string),
      };
      return Array.from({ length: Math.min(100, Math.max(1, Number(job.copies) || 1)) }, () => input);
    });
  });
  const pdf = await renderLabelBatch(sheets);
  return new NextResponse(Buffer.from(pdf), {
    headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="labels.pdf"` },
  });
}
