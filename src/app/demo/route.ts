import { NextResponse } from "next/server";
import { isDemo } from "@/lib/supabase/demo";

/** /demo?as=dealer|centre|admin sets who you are in demo mode, then sends you to that area. */
export async function GET(req: Request) {
  if (!isDemo()) return new NextResponse("Demo mode is off", { status: 404 });
  const as = new URL(req.url).searchParams.get("as") ?? "dealer";
  const dest = as === "centre" ? "/centre" : as === "admin" ? "/admin" : "/app";
  const res = NextResponse.redirect(new URL(dest, req.url));
  res.cookies.set("demo_role", as, { path: "/", maxAge: 86400 });
  return res;
}
