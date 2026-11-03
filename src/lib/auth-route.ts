import { supabaseAdmin } from "@/lib/supabase/server";

/** Sends people where they belong: a centre owner who signed in through the generic link goes to their centre,
 *  a dealer to Today, a platform admin to Admin. Explicit sign up links are left alone. */
export async function routeFor(userId: string, next: string) {
  const db = supabaseAdmin();
  if (next === "/app" || next === "/" || next === "/centre") {
    const [{ data: me }, { data: owned }] = await Promise.all([
      db.from("users").select("dealer_id, is_platform_admin").eq("id", userId).maybeSingle(),
      db.from("centre_owners").select("centre_id").eq("user_id", userId).limit(1),
    ]);
    if (me?.dealer_id) next = "/app";
    else if (owned?.length) next = "/centre";
    else if (me?.is_platform_admin) next = "/admin";
    else if (next === "/centre") next = "/signup/centre";
    else next = "/signup/dealer";
  }
  return next;
}

/** Only paths on this site. Anything absolute, protocol relative or odd goes to /app. */
export function safeNext(n: string | null) {
  if (!n || !n.startsWith("/") || n.startsWith("//") || n.startsWith("/\\") || /[\r\n]/.test(n)) return "/app";
  return n;
}
