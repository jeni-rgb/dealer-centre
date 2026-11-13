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
  const { data: items } = await sb.from("items").select("sku, title, price_pence, dealer_id, centres(name), dealers(code, name)").in("id", ids);
  if (!items?.length) return new NextResponse("not found", { status: 404 });
  const logos = new Map<string, Awaited<ReturnType<typeof logoForDealer>>>();
  for (const i of items) {
    const dealerId = i.dealer_id as string;
    if (!logos.has(dealerId)) logos.set(dealerId, await logoForDealer(sb, dealerId));
  }

  const pdf = await renderLabelBatch(
    items.map((i) => ({
      sku: i.sku,
      title: i.title,
      pricePence: i.price_pence,
      dealerCode: (i.dealers as unknown as { code: string }).code,
      dealerName: (i.dealers as unknown as { name?: string | null }).name ?? null,
      centreName: (i.centres as unknown as { name: string } | null)?.name ?? null,
      widthMm,
      heightMm,
      logo: logos.get(i.dealer_id as string),
    })),
  );
  return new NextResponse(Buffer.from(pdf), {
    headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="labels.pdf"` },
  });
}
