import { supabaseServer } from "@/lib/supabase/server";
import { getMe } from "@/lib/auth";

/** Resolve which centre the owner is looking at: ?centre= or their first. */
export async function currentCentre(centreParam?: string) {
  const me = await getMe();
  if (!me) return null;
  const sb = await supabaseServer();
  if (me.is_platform_admin && centreParam) {
    const { data } = await sb.from("centres").select("*").eq("id", centreParam).single();
    return data;
  }
  const { data: owned } = await sb.from("centre_owners").select("centre_id").eq("user_id", me.id);
  const ids = (owned ?? []).map((o) => o.centre_id);
  const id = centreParam && ids.includes(centreParam) ? centreParam : ids[0];
  if (!id) return null;
  const { data } = await sb.from("centres").select("*").eq("id", id).single();
  return data;
}
