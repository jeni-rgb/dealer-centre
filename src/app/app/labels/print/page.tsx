import { requireDealer } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { renderLabelSvg } from "@/lib/labels/render";
import { logoForDealer } from "@/lib/labels/load";
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
    ? await sb.from("items").select("id, sku, title, price_pence, dealer_id, centres(name), dealers(code, name)").in("id", ids)
    : { data: [] };
  const jobs = ids.length ? await sb.from("print_jobs").select("item_id, centre_id, place_label").in("item_id", ids) : { data: [] };
  const centreIds = [...new Set((jobs.data ?? []).map((j) => j.centre_id).filter(Boolean))] as string[];
  const { data: centreRows } = centreIds.length ? await sb.from("centres").select("id, name").in("id", centreIds) : { data: [] };
  const centreName = new Map((centreRows ?? []).map((c) => [c.id as string, c.name as string]));
  const logos = new Map<string, Awaited<ReturnType<typeof logoForDealer>>>();
  const labels = (await Promise.all(
    (items ?? []).map(async (i) => {
      const dealerId = i.dealer_id as string;
      if (!logos.has(dealerId)) logos.set(dealerId, await logoForDealer(sb, dealerId));
      const mine = (jobs.data ?? []).filter((j) => j.item_id === i.id);
      const groups = mine.some((j) => j.centre_id || j.place_label) ? mine : [{ centre_id: null, place_label: null }];
      return Promise.all(groups.map(async (job) => ({
        sku: i.sku as string,
        svg: await renderLabelSvg({
          sku: i.sku,
          title: i.title,
          pricePence: i.price_pence,
          dealerCode: (i.dealers as unknown as { code: string }).code,
          dealerName: (i.dealers as unknown as { name?: string | null }).name ?? null,
          centreName: job.place_label || (job.centre_id ? centreName.get(job.centre_id) : null) || (i.centres as unknown as { name: string } | null)?.name || null,
          widthMm,
          heightMm,
          logo: logos.get(dealerId),
        }),
      })));
    }),
  )).flat();
  const pdfUrl = `/api/labels/batch?ids=${ids.join(",")}&w=${widthMm}&h=${heightMm}`;
  return <PrintView labels={labels} w={widthMm} h={heightMm} pdfUrl={pdfUrl} itemIds={ids} listed={!!(sp as Record<string, string | undefined>).listed} />;
}
