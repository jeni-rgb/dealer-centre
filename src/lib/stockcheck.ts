import type { Admin } from "@/lib/supabase/server";
import type { Me } from "@/lib/auth";
import { displaySku, ticketCandidates } from "@/lib/sku";

/**
 * Stock check. Someone walks the floor scanning every ticket. Each scan is checked straight away so the
 * scanner gets a sound and a colour; finishing compares the scans with what the system says should be there.
 *
 *  found               live item, right centre (and right dealer, on a pitch check)
 *  missing             live item that should be there and was not scanned: stolen, moved, or sold off the books
 *  sold_on_shelf       scanned, but the system says it sold: the sale was recorded against the wrong ticket,
 *                      or a sold item was never taken away. Online sales waiting for the runner are expected and excluded.
 *  withdrawn_on_shelf  scanned, but the dealer withdrew or deleted it
 *  not_on_system       a ticket the system has never seen: never listed, or a label from another system
 *  wrong_place         another dealer's item on this pitch, or another centre's item in this centre
 */

export type StockCheck = { id: string; centre_id: string; dealer_id: string | null; started_by: string | null; started_at: string; finished_at: string | null; status: "open" | "done"; note: string | null };
export type ScanOutcome = "found" | "sold" | "sold_online_waiting" | "withdrawn" | "other_dealer" | "other_centre" | "unknown" | "repeat";

/** Who may run or read a check: the dealer whose pitch it is, an owner of the centre, or a platform admin. */
export async function canAccessCheck(db: Admin, me: Me | null, centreId: string, dealerId: string | null): Promise<boolean> {
  if (!me) return false;
  if (me.is_platform_admin) return true;
  if (dealerId && me.dealer_id === dealerId) return true;
  const { data } = await db.from("centre_owners").select("centre_id").eq("user_id", me.id).eq("centre_id", centreId).maybeSingle();
  return !!data;
}

export async function loadCheck(db: Admin, id: string): Promise<StockCheck | null> {
  const { data } = await db.from("stock_checks").select("*").eq("id", id).maybeSingle();
  return (data as StockCheck | null) ?? null;
}

/** Classify one scan against the check, store it, and say what the scanner should hear and see. */
export async function recordScan(db: Admin, check: StockCheck, raw: string) {
  const text = raw.trim();
  const cands = ticketCandidates(text);
  const { data: hits } = cands.length
    ? await db.from("items").select("id, sku, title, price_pence, status, centre_id, dealer_id, dealers(name, code)").in("sku", cands).limit(1)
    : { data: [] };
  let item = hits?.[0] ?? null;
  if (!item && cands.length) {
    // older tickets may live in alt_skus
    const { data: alt } = await db.from("items").select("id, sku, title, price_pence, status, centre_id, dealer_id, dealers(name, code)").overlaps("alt_skus", cands).limit(1);
    item = alt?.[0] ?? null;
  }

  let outcome: ScanOutcome;
  if (!item) outcome = "unknown";
  else {
    const { data: prior } = await db.from("stock_check_scans").select("id").eq("check_id", check.id).eq("item_id", item.id).neq("outcome", "repeat").limit(1);
    if (prior?.length) outcome = "repeat";
    else if (item.centre_id !== check.centre_id) outcome = "other_centre";
    else if (check.dealer_id && item.dealer_id !== check.dealer_id) outcome = "other_dealer";
    else if (item.status === "live") outcome = "found";
    else if (item.status === "sold") outcome = (await awaitingCollection(db, item.id)) ? "sold_online_waiting" : "sold";
    else outcome = "withdrawn";
  }
  await db.from("stock_check_scans").insert({ check_id: check.id, raw: text, item_id: item?.id ?? null, outcome });
  const d = item?.dealers as unknown as { name: string; code: string } | null;
  return { outcome, ticket: item ? displaySku(item.sku) : text, title: item?.title ?? null, dealer: d?.name ?? null, price_pence: item?.price_pence ?? null };
}

async function awaitingCollection(db: Admin, itemId: string) {
  const { data: sale } = await db.from("sales").select("id").eq("item_id", itemId).is("voided_at", null).order("sold_at", { ascending: false }).limit(1).maybeSingle();
  if (!sale) return false;
  const { data: f } = await db.from("fulfilments").select("status").eq("sale_id", sale.id).maybeSingle();
  return !!f && ["new", "missing", "collected"].includes(f.status);
}

/** Close the check and write its result lines. Safe to call twice: lines are replaced. */
export async function finishCheck(db: Admin, check: StockCheck) {
  const { data: scans } = await db.from("stock_check_scans").select("raw, item_id, outcome").eq("check_id", check.id);
  const scannedIds = new Set((scans ?? []).filter((s) => s.item_id).map((s) => s.item_id as string));

  // Everything that should be on the floor: live at this centre (on this pitch), listed before the check began.
  let q = db.from("items").select("id, price_pence").eq("centre_id", check.centre_id).eq("status", "live").lte("listed_at", check.started_at);
  if (check.dealer_id) q = q.eq("dealer_id", check.dealer_id);
  const { data: expected } = await q;

  const lines: { check_id: string; item_id: string | null; raw: string | null; outcome: string; price_pence: number | null }[] = [];
  const priceOf = new Map<string, number>();
  const { data: scannedItems } = scannedIds.size ? await db.from("items").select("id, price_pence").in("id", Array.from(scannedIds)) : { data: [] };
  for (const it of scannedItems ?? []) priceOf.set(it.id, it.price_pence);

  for (const it of expected ?? []) lines.push({ check_id: check.id, item_id: it.id, raw: null, outcome: scannedIds.has(it.id) ? "found" : "missing", price_pence: it.price_pence });
  const seen = new Set<string>();
  for (const s of scans ?? []) {
    const key = `${s.item_id ?? s.raw}:${s.outcome}`;
    if (seen.has(key) || s.outcome === "repeat" || s.outcome === "found" || s.outcome === "sold_online_waiting") continue;
    seen.add(key);
    const outcome = s.outcome === "sold" ? "sold_on_shelf" : s.outcome === "withdrawn" ? "withdrawn_on_shelf" : s.outcome === "unknown" ? "not_on_system" : "wrong_place";
    lines.push({ check_id: check.id, item_id: s.item_id, raw: s.item_id ? null : s.raw, outcome, price_pence: s.item_id ? priceOf.get(s.item_id) ?? null : null });
  }

  await db.from("stock_check_lines").delete().eq("check_id", check.id).is("resolution", null);
  if (lines.length) await db.from("stock_check_lines").upsert(lines, { onConflict: "check_id,item_id,outcome", ignoreDuplicates: true });
  await db.from("stock_checks").update({ status: "done", finished_at: new Date().toISOString() }).eq("id", check.id);
}

export type ResultLine = { id: string; item_id: string | null; raw: string | null; outcome: string; resolution: string | null; price_pence: number | null; title: string | null; ticket: string | null; dealer: string | null; dealer_code: string | null; pitches: string[] };

/** The result of a finished check, with item details, for the results page. */
export async function checkResult(db: Admin, check: StockCheck) {
  const { data: lines } = await db.from("stock_check_lines").select("id, item_id, raw, outcome, resolution, price_pence, items(title, sku, dealer_id, dealers(name, code))").eq("check_id", check.id);
  const { data: pitches } = await db.from("dealer_centres").select("dealer_id, pitch_numbers").eq("centre_id", check.centre_id);
  const pitchOf = new Map((pitches ?? []).map((p) => [p.dealer_id, (p.pitch_numbers ?? []) as string[]]));
  const out: ResultLine[] = (lines ?? []).map((l) => {
    const it = l.items as unknown as { title: string; sku: string; dealer_id: string; dealers: { name: string; code: string } | null } | null;
    return { id: l.id, item_id: l.item_id, raw: l.raw, outcome: l.outcome, resolution: l.resolution, price_pence: l.price_pence, title: it?.title ?? null, ticket: it ? displaySku(it.sku) : l.raw, dealer: it?.dealers?.name ?? null, dealer_code: it?.dealers?.code ?? null, pitches: it ? pitchOf.get(it.dealer_id) ?? [] : [] };
  });
  const by = (o: string) => out.filter((l) => l.outcome === o);
  const missing = by("missing");
  return {
    lines: out,
    counts: { found: by("found").length, missing: missing.length, sold_on_shelf: by("sold_on_shelf").length, withdrawn_on_shelf: by("withdrawn_on_shelf").length, not_on_system: by("not_on_system").length, wrong_place: by("wrong_place").length },
    missingValue: missing.filter((l) => l.resolution !== "found_later").reduce((a, l) => a + (l.price_pence ?? 0), 0),
    stolenValue: missing.filter((l) => l.resolution === "stolen").reduce((a, l) => a + (l.price_pence ?? 0), 0),
  };
}
