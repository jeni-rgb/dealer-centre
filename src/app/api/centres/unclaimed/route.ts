import { NextResponse } from "next/server";
import { getMe } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/server";

/** Centres dealers added that no owner has claimed yet, matched by name, with the dealer count. */
export async function GET(req: Request) {
  const me = await getMe();
  if (!me) return NextResponse.json({ error: "sign in" }, { status: 401 });
  const q = (new URL(req.url).searchParams.get("q") ?? "").replace(/[,()*%\\]/g, " ").trim();
  if (q.length < 3) return NextResponse.json({ centres: [] });
  const db = supabaseAdmin();
  const { data } = await db.from("centres").select("id, name, address, dealer_centres(count)").eq("status", "unclaimed").or(`name.ilike.%${q}%,address.ilike.%${q}%`).limit(5);
  return NextResponse.json({ centres: (data ?? []).map((c) => ({ id: c.id, name: c.name, address: c.address, dealers: (c.dealer_centres as unknown as { count: number }[])?.[0]?.count ?? 0 })) });
}
