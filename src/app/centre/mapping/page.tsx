import { redirect } from "next/navigation";
import { currentCentre } from "@/lib/centre";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { squareClient } from "@/lib/channels/square";
import { MappingTable } from "./table";


export default async function Mapping({ searchParams }: { searchParams: Promise<{ centre?: string }> }) {
  const { centre: cp } = await searchParams;
  const centre = await currentCentre(cp);
  if (!centre) redirect("/signup/centre");
  const sb = await supabaseServer();

  const { data: links } = await sb
    .from("dealer_centres")
    .select("id, dealer_id, status, square_category_id, square_catchall_variation_id, pitch_numbers, rent_pence, dealers(name, code)")
    .eq("centre_id", centre.id)
    .is("left_at", null)
    .order("status");

  // Square categories, read with the service role so the token never reaches the browser
  let categories: { id: string; name: string }[] = [];
  const { data: ch } = await supabaseAdmin().from("channels").select("access_token").eq("owner_type", "centre").eq("owner_id", centre.id).eq("type", "square").eq("status", "active").maybeSingle();
  if (ch?.access_token) {
    try {
      const c = squareClient(ch.access_token);
      const page = await c.catalog.list({ types: "CATEGORY" });
      for await (const o of page) {
        const cat = o as { id: string; categoryData?: { name?: string } };
        categories.push({ id: cat.id, name: cat.categoryData?.name ?? cat.id });
      }
      categories.sort((a, b) => a.name.localeCompare(b.name));
    } catch {
      categories = [];
    }
  }

  return (
    <>
      <h1 className="mb-1 text-xl font-medium">Dealers and Square categories</h1>
      <p className="mb-6 text-sm text-ink-2">Each dealer needs one Square category. Till sales under that category go to that dealer even without a barcode.</p>
      {!ch && <p className="mb-4 text-sm text-brass">Connect Square first to see categories. <a className="underline" href={`/api/oauth/square?owner=centre&id=${centre.id}`}>Connect</a></p>}
      <MappingTable
        centreId={centre.id}
        categories={categories}
        rows={(links ?? []).map((l) => ({
          id: l.id,
          dealer_id: l.dealer_id,
          name: (l.dealers as unknown as { name: string }).name,
          code: (l.dealers as unknown as { code: string }).code,
          status: l.status,
          square_category_id: l.square_category_id,
          pitch_numbers: l.pitch_numbers.join(", "),
          rent_pence: l.rent_pence,
        }))}
      />
    </>
  );
}
