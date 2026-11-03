import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Keeps the Supabase session fresh so server pages don't refresh tokens on every render. */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon || !request.cookies.getAll().some((c) => c.name.startsWith("sb-"))) return response;
  const sb = createServerClient(url, anon, {
    cookieOptions: { maxAge: 400 * 24 * 60 * 60, sameSite: "lax", secure: true, path: "/" },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (all) => {
        all.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        all.forEach(({ name, value, options }) => response.cookies.set(name, value, { ...options, maxAge: value ? 400 * 24 * 60 * 60 : 0 }));
      },
    },
  });
  // Local JWT check; only hits Supabase when the token has expired and needs refreshing.
  await sb.auth.getClaims().catch(() => null);
  return response;
}

export const config = {
  // Every page and API route (not static files). Server components can't write cookies, so if a page refreshed the
  // token outside the proxy the new refresh token was thrown away, the old one was then "reused" and Supabase
  // revoked the whole session. Refreshing here, on every request, means the rotated token is always saved.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt|xml)$).*)"],
};
