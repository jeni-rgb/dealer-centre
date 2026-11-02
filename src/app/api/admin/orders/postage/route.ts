import { NextResponse } from "next/server";
import { z } from "zod";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { listOnlineOrders } from "@/lib/fulfilment/orders";
import type { PackageFormat } from "@/lib/fulfilment/clickdrop";
import { buy, provider } from "@/lib/fulfilment/postage";
import { renderDespatchNotes, mergeLabelsAndNotes } from "@/lib/fulfilment/slips";
import { shopifyFulfil } from "@/lib/channels/shopify";
import type { ChannelRow } from "@/lib/channels/types";

const Input = z.object({ parcels: z.array(z.object({ sale_id: z.string().uuid(), format: z.enum(["largeLetter", "smallParcel", "mediumParcel"]), weight_grams: z.number().int().min(1).max(30000), service_code: z.string().min(1).max(20) })).min(1).max(100) });

/**
 * Buy postage for the selected parcels through Click & Drop, keep each label, mark the orders despatched, tell Shopify
 * (buyer gets the tracking email), and return one PDF: labels then despatch notes. Safe to retry: an order that already
 * has a label is not bought again, its stored label is reused.
 */
export async function POST(req: Request) {
  const me = await getMe();
  if (!me?.is_platform_admin) return NextResponse.json({ error: "admin only" }, { status: 403 });
  const p = Input.safeParse(await req.json());
  if (!p.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const db = supabaseAdmin();
  const ids = p.data.parcels.map((x) => x.sale_id);
  const orders = (await listOnlineOrders(db, {})).filter((o) => ids.includes(o.sale_id));
  const labels: Uint8Array[] = [];
  const errors: string[] = [];
  const now = new Date().toISOString();

  // already bought: reuse
  const fresh = p.data.parcels.filter((x) => { const o = orders.find((q) => q.sale_id === x.sale_id); return o && !o.label_path; });
  for (const o of orders.filter((q) => q.label_path)) {
    const { data } = await db.storage.from("files").download(o.label_path!);
    if (data) labels.push(new Uint8Array(await data.arrayBuffer()));
  }
  const results = fresh.length ? await buy(fresh.map((x) => ({ order: orders.find((q) => q.sale_id === x.sale_id)!, format: x.format as PackageFormat, weightGrams: x.weight_grams, serviceCode: x.service_code }))) : [];
  for (const r of results) {
    const o = orders.find((q) => q.sale_id === r.sale_id)!;
    const parcel = fresh.find((x) => x.sale_id === r.sale_id)!;
    if (!r.ok) {
      errors.push(`${o.order_name ?? o.ticket ?? o.sale_id.slice(0, 8)}: ${r.error}`);
      // booked but label not back yet: keep the parcel details so Reprint can finish it
      if (r.pending) await db.from("fulfilments").upsert({ sale_id: o.sale_id, centre_id: o.centre_id, status: "at_unit", postage_provider: provider(), package_format: parcel.format, weight_grams: parcel.weight_grams, service_code: parcel.service_code, note: "Label pending from carrier", updated_by: me.id, updated_at: now }, { onConflict: "sale_id" });
      continue;
    }
    const path = `labels/orders/${o.sale_id}.pdf`;
    await db.storage.from("files").upload(path, Buffer.from(r.labelPdf), { contentType: "application/pdf", upsert: true });
    const { data: seq } = await db.rpc("next_despatch_note_no");
    await db.from("fulfilments").upsert({
      sale_id: o.sale_id, centre_id: o.centre_id, status: "despatched", despatched_at: now, carrier: r.carrier ?? (provider() === "clickdrop" ? "Royal Mail" : null), tracking: r.tracking, carrier_reference: r.orderIdentifier, postage_provider: provider(), note: null,
      label_path: path, package_format: parcel.format, weight_grams: parcel.weight_grams, service_code: parcel.service_code, despatch_note_no: o.despatch_note_no ?? (seq as number | null) ?? null, slip_printed_at: now, updated_by: me.id, updated_at: now,
    }, { onConflict: "sale_id" });
    labels.push(r.labelPdf);
    if (o.sale_id && !o.shopify_fulfilled) {
      const { data: sale } = await db.from("sales").select("external_order_id, channel_id").eq("id", o.sale_id).single();
      if (sale?.external_order_id.startsWith("gid://shopify/Order/")) {
        const { data: channel } = await db.from("channels").select("*").eq("id", sale.channel_id).single();
        try { if (channel && await shopifyFulfil(channel as ChannelRow, sale.external_order_id, r.tracking, r.carrier ?? "Royal Mail")) await db.from("fulfilments").update({ shopify_fulfilled: true }).eq("sale_id", o.sale_id); } catch (e) { console.error("[postage] shopify", e); }
      }
    }
  }
  // Labels go to the thermal printer, notes to the A4 printer: two print jobs, both reachable from Reprint.
  const done = (await listOnlineOrders(db, {})).filter((o) => ids.includes(o.sale_id) && o.label_path).map((o) => o.sale_id);
  void labels; void renderDespatchNotes; void mergeLabelsAndNotes;
  return NextResponse.json({ ok: true, bought: results.filter((r) => r.ok).length, errors, labels_url: done.length ? `/api/admin/orders/labels?ids=${done.join(",")}&only=labels` : null, notes_url: done.length ? `/api/admin/orders/labels?ids=${done.join(",")}&only=notes` : null });
}
