import { requireDealer } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { renderLabelSvg } from "@/lib/labels/render";
import { PrintView } from "./view";

export const dynamic = "force-dynamic";

export default async function PrintLabels({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireDealer();
  const sp = await searchParams;
  const num = (v?: string) => { const n = Number(v); return n >= 20 && n <= 200 ? n : undefined; };
  const widthMm = num(sp.w) ?? 62, heightMm = num(sp.h) ?? 29;
  const ids = (sp.ids ?? "").split(",").filter(Boolean).slice(0, 200);
  const sb = await supabaseServer();
  const { data: items } = ids.length
    ? await sb.from("items").select("sku, title, price_pence, centres(name), dealers(code, name)").in("id", ids)
    : { data: [] };
  const labels = await Promise.all(
    (items ?? []).map(async (i) => ({
      sku: i.sku as string,
      svg: await renderLabelSvg({
        sku: i.sku,
        title: i.title,
        pricePence: i.price_pence,
        dealerCode: (i.dealers as unknown as { code: string }).code,
        dealerName: (i.dealers as unknown as { name?: string | null }).name ?? null,
        centreName: (i.centres as unknown as { name: string } | null)?.name ?? null,
        widthMm,
        heightMm,
      }),
    })),
  );
  const pdfUrl = `/api/labels/batch?ids=${ids.join(",")}&w=${widthMm}&h=${heightMm}`;
  return <PrintView labels={labels} w={widthMm} h={heightMm} pdfUrl={pdfUrl} itemIds={ids} listed={!!(sp as Record<string, string | undefined>).listed} />;
}
