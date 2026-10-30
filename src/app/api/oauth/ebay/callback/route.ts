import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ebayOAuth } from "@/lib/channels/ebay";
import { supabaseAdmin } from "@/lib/supabase/server";
import { enqueue } from "@/lib/jobs/queue";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const code = u.searchParams.get("code");
  const state = u.searchParams.get("state");
  const saved = (await cookies()).get("eb_state")?.value;
  if (!code || !state || state !== saved) return new NextResponse("state mismatch", { status: 400 });
  const { centreId } = JSON.parse(Buffer.from(state, "base64url").toString()) as { centreId: string };
  const tok = await ebayOAuth.exchange(code);
  const db = supabaseAdmin();
  const { data: ch } = await db
    .from("channels")
    .upsert(
      {
        type: "ebay", owner_type: "centre", owner_id: centreId, external_account_id: `centre:${centreId}`,
        access_token: tok.access_token, refresh_token: tok.refresh_token,
        token_expires_at: new Date(Date.now() + tok.expires_in * 1000).toISOString(), status: "active",
      },
      { onConflict: "type,external_account_id" },
    )
    .select("id").single();
  if (ch) await enqueue(db, "backfill_channel", { channel_id: ch.id });
  return NextResponse.redirect(new URL(`/centre/settings?centre=${centreId}&connected=ebay`, process.env.NEXT_PUBLIC_APP_URL));
}
