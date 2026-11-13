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
  const jobs = await sb.from("print_jobs").select("item_id, copies, created_at").in("item_id", ids).order("created_at", { ascending: false });
  const copies = new Map<string, number>();
  if (!jobs.error) for (const j of jobs.data ?? []) if (!copies.has(j.item_id)) copies.set(j.item_id, Math.min(100, Math.max(1, Number(j.copies) || 1)));
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
    const input = {
      sku: i.sku,
      title: i.title,
      pricePence: i.price_pence,
      dealerCode: (i.dealers as unknown as { code: string }).code,
      dealerName: (i.dealers as unknown as { name?: string | null }).name ?? null,
      centreName: (i.centres as unknown as { name: string } | null)?.name ?? null,
      widthMm,
      heightMm,
      logo: logos.get(i.dealer_id as string),
    };
    return Array.from({ length: copies.get(id) ?? 1 }, () => input);
  });
  const pdf = await renderLabelBatch(sheets);
  return new NextResponse(Buffer.from(pdf), {
    headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="labels.pdf"` },
  });
}
