import { NextResponse } from "next/server";
import { z } from "zod";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";
import { pullConnection, sumupMarker } from "@/lib/sumup/sync";

const Input = z.object({
  owner: z.enum(["dealer", "centre"]),
  centreId: z.string().uuid().optional(),
});

/** While Today or SumUp is open, ask SumUp for card sales it did not push. */
export async function POST(req: Request) {
  const me = await getMe();
  if (!me) return NextResponse.json({ error: "Sign in" }, { status: 401 });
  const p = Input.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "Check the request" }, { status: 400 });
  const db = supabaseAdmin();
  const ownerId = p.data.owner === "dealer" ? me.dealer_id : p.data.centreId ?? null;
  if (!ownerId) return NextResponse.json({ marker: "0" });
  if (p.data.owner === "centre" && !me.is_platform_admin) {
    const { data: own } = await db.from("centre_owners").select("centre_id").eq("centre_id", ownerId).eq("user_id", me.id).maybeSingle();
    if (!own) return NextResponse.json({ error: "Not your centre" }, { status: 403 });
  }
  const { data: conn } = await db.from("sumup_connections").select("id, owner_type, owner_id, merchant_code, access_token, refresh_token, expires_at, synced_at").eq("owner_type", p.data.owner).eq("owner_id", ownerId).maybeSingle();
  if (!conn) return NextResponse.json({ marker: "0" });
  const fresh = conn.synced_at && Date.now() - new Date(conn.synced_at).getTime() < 5000;
  if (!fresh) await pullConnection(db, conn).catch(() => 0);
  return NextResponse.json({ marker: await sumupMarker(db, conn.id) });
}
