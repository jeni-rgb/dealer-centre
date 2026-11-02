import { NextResponse } from "next/server";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";

/** Centre picker: every centre on the platform by name or town, including ones dealers added themselves. */
export async function GET(req: Request) {
  const me = await getMe();
  if (!me) return NextResponse.json({ error: "sign in" }, { status: 401 });
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ centres: [] });
  const { data } = await supabaseAdmin().from("centres").select("id, name, address, status").in("status", ["active", "unclaimed"]).or(`name.ilike.%${q}%,address.ilike.%${q}%`).limit(8);
  return NextResponse.json({ centres: (data ?? []).map((c) => ({ ...c, unclaimed: c.status === "unclaimed" })) });
}
