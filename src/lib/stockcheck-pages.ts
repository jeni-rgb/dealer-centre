import type { Admin } from "@/lib/supabase/server";

/** How many live items the check should find (listed before it started). */
export async function expectedCount(db: Admin, centreId: string, dealerId: string | null, startedAt: string) {
  let q = db.from("items").select("id").eq("centre_id", centreId).eq("status", "live").lte("listed_at", startedAt);
  if (dealerId) q = q.eq("dealer_id", dealerId);
  const { data } = await q;
  const ids = new Set((data ?? []).map((i) => i.id as string));
  const placed = await db.from("item_places").select("item_id, items!inner(status, dealer_id, listed_at)").eq("centre_id", centreId).gt("qty", 0);
  if (!placed.error) {
    for (const row of placed.data ?? []) {
      const item = row.items as { status?: string; dealer_id?: string; listed_at?: string } | null;
      if (!item || item.status !== "live" || (item.listed_at ?? "") > startedAt) continue;
      if (dealerId && item.dealer_id !== dealerId) continue;
      ids.add(row.item_id as string);
    }
  }
  return ids.size;
}

/** Past checks with their headline numbers, newest first. */
export async function pastChecks(db: Admin, filter: { centreId?: string; dealerId?: string }) {
  let q = db.from("stock_checks").select("id, centre_id, dealer_id, started_at, finished_at, status, centres(name), dealers(name, code)").order("started_at", { ascending: false }).limit(30);
  if (filter.centreId) q = q.eq("centre_id", filter.centreId);
  if (filter.dealerId) q = q.eq("dealer_id", filter.dealerId);
  const { data: checks } = await q;
  const ids = (checks ?? []).map((c) => c.id);
  const { data: lines } = ids.length ? await db.from("stock_check_lines").select("check_id, outcome, resolution, price_pence").in("check_id", ids) : { data: [] };
  return (checks ?? []).map((c) => {
    const ls = (lines ?? []).filter((l) => l.check_id === c.id);
    return {
      id: c.id, status: c.status as string, started_at: c.started_at as string, finished_at: c.finished_at as string | null,
      centre: (c.centres as unknown as { name: string } | null)?.name ?? "", dealer: (c.dealers as unknown as { name: string; code: string } | null)?.name ?? null,
      found: ls.filter((l) => l.outcome === "found").length,
      missing: ls.filter((l) => l.outcome === "missing").length,
      other: ls.filter((l) => !["found", "missing"].includes(l.outcome)).length,
      open: ls.filter((l) => l.outcome !== "found" && !l.resolution).length,
      stolen: ls.filter((l) => l.resolution === "stolen").reduce((a, l) => a + (l.price_pence ?? 0), 0),
    };
  });
}
