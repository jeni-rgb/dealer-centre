import { cache } from "react";
import { supabaseServer } from "@/lib/supabase/server";

export type Me = {
  id: string;
  email: string;
  role: "platform_admin" | "centre_owner" | "dealer" | "dealer_staff" | "ops_staff";
  is_platform_admin: boolean;
  dealer_id: string | null;
  impersonating?: boolean;
};

// Cached per request: the layout and the page both call this, so it runs once.
export const getMe = cache(async (): Promise<Me | null> => {
  const sb = await supabaseServer();
  // getClaims verifies the JWT locally (no round trip to Supabase Auth when signing keys are asymmetric).
  let uid: string | undefined;
  const claims = await sb.auth.getClaims().catch(() => null);
  uid = claims?.data?.claims?.sub as string | undefined;
  if (!uid) {
    const { data: auth } = await sb.auth.getUser();
    uid = auth.user?.id;
  }
  if (!uid) return null;
  const { data } = await sb.from("users").select("id, email, role, is_platform_admin, dealer_id").eq("id", uid).maybeSingle();
  const me = (data as Me | null) ?? null;
  if (me?.is_platform_admin) {
    // Admin opened the app as a dealer (set by /api/admin/impersonate). Reads still go through admin RLS; writes are admin's.
    const { cookies } = await import("next/headers");
    const as = (await cookies()).get("admin_as_dealer")?.value;
    if (as) return { ...me, dealer_id: as, impersonating: true };
  }
  return me;
});

/** Dealer Centre's own people: runners, shop manager, admins. */
export const isOps = (me: Me | null) => !!me && (me.is_platform_admin || me.role === "ops_staff");

export async function requireDealer(): Promise<Me & { dealer_id: string }> {
  const me = await getMe();
  if (!me?.dealer_id) throw new Response("Unauthorised", { status: 401 });
  return me as Me & { dealer_id: string };
}
