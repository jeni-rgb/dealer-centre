import { supabaseServer } from "@/lib/supabase/server";
import { isDemo } from "@/lib/supabase/demo";
import { passwordKind, type PasswordKind } from "@/lib/password";

/** Server read of the signed in user. Demo has no password yet, so the prompt and signup step show. */
export async function passwordNeed(): Promise<PasswordKind> {
  if (isDemo()) return "missing";
  const sb = await supabaseServer();
  const [{ data: userData }, claims] = await Promise.all([
    sb.auth.getUser(),
    sb.auth.getClaims().catch(() => null),
  ]);
  const meta = (userData.user?.user_metadata ?? null) as { password_set?: boolean; temp_password?: boolean } | null;
  const amr = (claims?.data?.claims as { amr?: { method?: string }[] } | undefined)?.amr ?? null;
  return passwordKind(meta, amr);
}
