import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Keeps the Supabase session fresh so server pages don't refresh tokens on every render. */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon || !request.cookies.getAll().some((c) => c.name.startsWith("sb-"))) return response;
  const sb = createServerClient(url, anon, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (all) => {
        all.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        all.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  // Local JWT check; only hits Supabase when the token has expired and needs refreshing.
  await sb.auth.getClaims().catch(() => null);
  return response;
}

export const config = {
  matcher: ["/(app|centre|admin|ops|till|run)/:path*", "/api/:path*"],
};
