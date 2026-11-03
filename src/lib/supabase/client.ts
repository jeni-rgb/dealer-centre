"use client";
import { createBrowserClient } from "@supabase/ssr";

export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    // Persistent cookies so the iPhone home-screen app keeps the session after it is closed.
    { cookieOptions: { maxAge: 400 * 24 * 60 * 60, sameSite: "lax", secure: true, path: "/" } },
  );
}
