import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { squareClient, squareOAuth } from "@/lib/channels/square";
import { supabaseAdmin } from "@/lib/supabase/server";
import { enqueue } from "@/lib/jobs/queue";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const code = u.searchParams.get("code");
  const state = u.searchParams.get("state");
  const saved = (await cookies()).get("sq_state")?.value;
  if (!code || !state || state !== saved) return new NextResponse("state mismatch", { status: 400 });
  const { ownerType, ownerId } = JSON.parse(Buffer.from(state, "base64url").toString()) as { ownerType: "dealer" | "centre"; ownerId: string };

  const tok = await squareOAuth.exchange(code);
  const client = squareClient(tok.accessToken!);
  const { locations } = await client.locations.list();
  const location = locations?.find((l) => l.status === "ACTIVE") ?? locations?.[0];

  const db = supabaseAdmin();
  const { data: ch } = await db
    .from("channels")
    .upsert(
      {
        type: "square",
        owner_type: ownerType,
        owner_id: ownerId,
        external_account_id: tok.merchantId!,
        location_id: location?.id ?? null,
        access_token: tok.accessToken,
        refresh_token: tok.refreshToken,
        token_expires_at: tok.expiresAt,
        scopes: [],
        status: "active",
      },
      { onConflict: "type,external_account_id" },
    )
    .select("id")
    .single();
  if (ch) await enqueue(db, "backfill_channel", { channel_id: ch.id });

  const dest = ownerType === "centre" ? `/centre/mapping?centre=${ownerId}&connected=square` : "/app/settings?connected=square";
  return NextResponse.redirect(new URL(dest, process.env.NEXT_PUBLIC_APP_URL));
}
