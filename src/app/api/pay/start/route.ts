import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { getMe } from "@/lib/auth";
import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/server";
import { displaySku } from "@/lib/sku";
import { squareReaderUrl, sumupReaderUrl, zettleReaderUrl } from "@/lib/pay/links";

const Input = z.object({
  item_id: z.string().min(1),
  amount_pence: z.number().int().positive(),
  reader: z.enum(["sumup", "square", "zettle"]),
});

/** Open the SumUp or Square app with the amount and ticket filled in. The sale is recorded when the reader returns. */
export async function POST(req: Request) {
  const me = await getMe();
  if (!me?.dealer_id) return NextResponse.json({ error: "sign in" }, { status: 401 });
  const p = Input.safeParse(await req.json());
  if (!p.success) return NextResponse.json({ error: "Check the amount" }, { status: 400 });
  if (p.data.reader === "sumup" && !env.sumup.payReady()) {
    return NextResponse.json({ url: "sumupmerchant://", confirm: true });
  }
  if (p.data.reader === "square" && !env.square.appId()) {
    return NextResponse.json({ url: "square-commerce-v1://", confirm: true });
  }
  const db = supabaseAdmin();
  const { data: item } = await db.from("items").select("id, sku, status").eq("id", p.data.item_id).eq("dealer_id", me.dealer_id).maybeSingle();
  if (!item || item.status !== "live") return NextResponse.json({ error: "not found" }, { status: 404 });
  const token = randomBytes(18).toString("hex");
  const { error } = await db.from("reader_payments").insert({ token, dealer_id: me.dealer_id, item_id: item.id, amount_pence: p.data.amount_pence, reader: p.data.reader });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const origin = new URL(req.url).origin;
  const ticket = displaySku(item.sku);
  const callback = `${origin}/api/pay/${p.data.reader}?t=${token}`;
  if (p.data.reader === "zettle" && !env.zettleKey()) {
    return NextResponse.json({ url: "izettle://", confirm: true });
  }
  const url = p.data.reader === "sumup"
    ? sumupReaderUrl({ amountPence: p.data.amount_pence, ticket, affiliateKey: env.sumup.affiliateKey(), callback, foreignId: token })
    : p.data.reader === "square"
      ? squareReaderUrl({ amountPence: p.data.amount_pence, ticket, clientId: env.square.appId(), callback: `${origin}/api/pay/square`, state: token })
      : zettleReaderUrl({ amountPence: p.data.amount_pence, ticket, apiKey: env.zettleKey(), success: callback, failure: `${origin}/app/items/${item.id}`, reference: token });
  return NextResponse.json({ url, confirm: p.data.reader === "zettle" });
}
