import { supabaseServer } from "@/lib/supabase/server";

export type Me = {
  id: string;
  email: string;
  role: "platform_admin" | "centre_owner" | "dealer" | "dealer_staff" | "ops_staff";
  is_platform_admin: boolean;
  dealer_id: string | null;
};

export async function getMe(): Promise<Me | null> {
  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return null;
  const { data } = await sb.from("users").select("id, email, role, is_platform_admin, dealer_id").eq("id", auth.user.id).maybeSingle();
  return (data as Me | null) ?? null;
}

/** Dealer Centre's own people: runners, shop manager, admins. */
export const isOps = (me: Me | null) => !!me && (me.is_platform_admin || me.role === "ops_staff");

export async function requireDealer(): Promise<Me & { dealer_id: string }> {
  const me = await getMe();
  if (!me?.dealer_id) throw new Response("Unauthorised", { status: 401 });
  return me as Me & { dealer_id: string };
}
