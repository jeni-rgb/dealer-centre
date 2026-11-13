import { NextResponse } from "next/server";
import { z } from "zod";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { isDemo } from "@/lib/supabase/demo";
import { createItem, PlanLimitError } from "@/lib/items/create";

const Variant = z.object({
  title: z.string().min(2).max(120),
  qty: z.number().int().min(1).max(200),
  sellPence: z.number().int().min(1).max(100000000),
  costPence: z.number().int().min(0).max(100000000),
});
const Input = z.object({
  invoiceId: z.string().min(2).max(80).nullable().optional(),
  supplier: z.string().max(80).optional(),
  labels: z.enum(["box", "kind"]).optional(),
  variants: z.array(Variant).min(1).max(40),
});

/** Turn confirmed invoice lines into stock. One item per kind, with a quantity. */
export async function POST(req: Request) {
  const me = await getMe();
  if (!me?.dealer_id) return NextResponse.json({ error: "Sign in" }, { status: 401 });
  const p = Input.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Check each colour, the number and the sell price" }, { status: 400 });
  const db = supabaseAdmin();
  const labels = p.data.labels ?? "box";
  if (p.data.invoiceId) {
    const { data: invoice } = await db.from("invoices").select("id, dealer_id").eq("id", p.data.invoiceId).maybeSingle();
    if (!isDemo() && (!invoice || invoice.dealer_id !== me.dealer_id)) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    if (p.data.supplier) await db.from("invoices").update({ supplier: p.data.supplier }).eq("id", p.data.invoiceId);
  }
  const { data: link } = await db.from("dealer_centres").select("centre_id").eq("dealer_id", me.dealer_id).eq("status", "active").is("left_at", null).limit(1).maybeSingle();
  if (isDemo()) {
    return NextResponse.json({
      items: p.data.variants.map((v, i) => ({ id: `inv-item-${i}`, sku: `B1403${80 + i}`, title: v.title, qty: v.qty })),
    });
  }
  const made: { id: string; sku: string; title: string; qty: number }[] = [];
  try {
    for (const v of p.data.variants) {
      const item = await createItem(db, me.dealer_id, {
        title: v.title,
        delivery: "small",
        photos: [],
        price_pence: v.sellPence,
        cost_pence: v.costPence,
        centre_id: link?.centre_id ?? null,
        on_own_shopify: false,
        on_centre_shopify: false,
        print_now: false,
        source: "invoice",
        qty: v.qty,
        invoice_id: p.data.invoiceId ?? null,
      });
      const copies = labels === "box" ? v.qty : 1;
      await db.from("print_jobs").update({ copies }).eq("item_id", item.id);
      made.push({ id: item.id, sku: item.sku, title: item.title, qty: v.qty });
    }
  } catch (e) {
    const msg = e instanceof PlanLimitError ? e.message : "Could not add the stock";
    return NextResponse.json({ error: msg, items: made }, { status: 400 });
  }
  return NextResponse.json({ items: made });
}
