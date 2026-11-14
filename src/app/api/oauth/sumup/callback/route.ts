import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/server";
import { exchangeSumupCode } from "@/lib/sumup/oauth";
import { pullConnection } from "@/lib/sumup/sync";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const code = u.searchParams.get("code");
  const state = u.searchParams.get("state");
  const saved = (await cookies()).get("su_state")?.value;
  if (!code || !state || state !== saved) return new NextResponse("state mismatch", { status: 400 });
  const { ownerType, ownerId } = JSON.parse(Buffer.from(state, "base64url").toString()) as { ownerType: "centre" | "dealer"; ownerId: string };
  const tok = await exchangeSumupCode(code, u.origin);
  const expires = new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString();
  const db = supabaseAdmin();
  const { data: conn } = await db.from("sumup_connections").upsert({
    owner_type: ownerType,
    owner_id: ownerId,
    access_token: tok.access_token,
    refresh_token: tok.refresh_token ?? null,
    expires_at: expires,
    connected_at: new Date().toISOString(),
  }, { onConflict: "owner_type,owner_id" }).select("id, owner_type, owner_id, merchant_code, access_token, refresh_token, expires_at, synced_at").single();
  if (conn) await pullConnection(db, conn).catch(() => 0);
  const back = ownerType === "centre" ? "/centre/sumup" : "/app/sumup";
  return NextResponse.redirect(new URL(back, u.origin));
}
