import { NextResponse } from "next/server";
import { z } from "zod";
import { getMe } from "@/lib/auth";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { modelById } from "@/lib/labels/models";

const Input = z.object({
  name: z.string().min(1).max(60),
  provider: z.enum(["browser", "printnode"]).default("browser"),
  provider_id: z.string().optional(),
  centre_id: z.string().uuid().optional(),
  label_width_mm: z.number().int().default(62),
  label_height_mm: z.number().int().default(29),
  model: z.string().optional(),
});

export async function POST(req: Request) {
  const me = await getMe();
  if (!me) return NextResponse.json({ error: "sign in" }, { status: 401 });
  const p = Input.safeParse(await req.json());
  if (!p.success) return NextResponse.json({ error: "bad input" }, { status: 400 });
  const db = supabaseAdmin();
  let owner_type: "dealer" | "centre" = "dealer";
  let owner_id = me.dealer_id;
  if (p.data.centre_id) {
    const sb = await supabaseServer();
    const { data } = await sb.from("centre_owners").select("centre_id").eq("centre_id", p.data.centre_id).maybeSingle();
    if (!data && !me.is_platform_admin) return NextResponse.json({ error: "not your centre" }, { status: 403 });
    owner_type = "centre";
    owner_id = p.data.centre_id;
  }
  if (!owner_id) return NextResponse.json({ error: "no owner" }, { status: 400 });
  const m = p.data.model ? modelById(p.data.model) : null;
  const { model: _m, centre_id: _c, ...rest } = p.data;
  void _m; void _c;
  const { data } = await db.from("printers").insert({ ...rest, ...(m ? { label_width_mm: m.w, label_height_mm: m.h } : {}), owner_type, owner_id }).select("id").single();
  return NextResponse.json({ id: data?.id });
}
