import { NextResponse } from "next/server";
import { z } from "zod";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";

const Patch = z.object({
  default_own_shopify: z.boolean().optional(),
  default_centre_shopify: z.boolean().optional(),
  name: z.string().min(2).max(80).optional(),
  card_machine: z.enum(["sumup", "square", "zettle"]).nullable().optional(),
});

export async function PATCH(req: Request) {
  const me = await getMe();
  if (!me?.dealer_id) return NextResponse.json({ error: "sign in" }, { status: 401 });
  const p = Patch.safeParse(await req.json());
  if (!p.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  await supabaseAdmin().from("dealers").update(p.data).eq("id", me.dealer_id);
  return NextResponse.json({ ok: true });
}
