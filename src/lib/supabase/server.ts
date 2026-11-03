import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { demoClient, isDemo } from "./demo";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Client bound to the signed in user. RLS applies. */
export async function supabaseServer(): Promise<SupabaseClient> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (isDemo()) return (await demoClient()) as any;
  const store = await cookies();
  return createServerClient(url, anon, {
    cookieOptions: { maxAge: 400 * 24 * 60 * 60, sameSite: "lax", secure: true, path: "/" },
    cookies: {
      getAll: () => store.getAll(),
      setAll: (all) => {
        try {
          all.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* called from a server component, ignore */
        }
      },
    },
  });
}

/** Service role client. Bypasses RLS. Webhooks and jobs only, never from a page. */
export function supabaseAdmin(): SupabaseClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (isDemo()) return demoAdmin as any;
  return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type Admin = SupabaseClient;

// Synchronous admin for demo mode: role comes from the cookie at request time via demoClient, but
// admin reads do not depend on the user, so a dealer role client is fine.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let demoAdmin: any = null;
if (isDemo()) {
  // Lazy: build on first access with no cookies dependency.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("./demo") as typeof import("./demo");
  demoAdmin = new Proxy({}, { get: (_t, prop) => { const c = mod.demoSyncClient(); return (c as Record<string | symbol, unknown>)[prop]; } });
}
