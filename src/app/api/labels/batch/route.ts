import { NextResponse } from "next/server";
import { getMe } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { renderLabelBatch } from "@/lib/labels/render";

/** GET /api/labels/batch?ids=a,b,c  returns a multi page PDF for browser printing. */
export async function GET(req: Request) {
  const me = await getMe();
  if (!me?.dealer_id) return new NextResponse("sign in", { status: 401 });
  const ids = (new URL(req.url).searchParams.get("ids") ?? "").split(",").filter(Boolean).slice(0, 200);
  if (!ids.length) return new NextResponse("no ids", { status: 400 });

  const sb = await supabaseServer();
  const { data: items } = await sb.from("items").select("sku, title, price_pence, centres(name), dealers(code)").in("id", ids);
  if (!items?.length) return new NextResponse("not found", { status: 404 });

  const pdf = await renderLabelBatch(
    items.map((i) => ({
      sku: i.sku,
      title: i.title,
      pricePence: i.price_pence,
      dealerCode: (i.dealers as unknown as { code: string }).code,
      centreName: (i.centres as unknown as { name: string } | null)?.name ?? null,
    })),
  );
  return new NextResponse(Buffer.from(pdf), {
    headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="labels.pdf"` },
  });
}
