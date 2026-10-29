import { supabaseAdmin } from "@/lib/supabase/server";
import { TillScreen } from "./screen";


/**
 * Quick label for till staff. No login. The centre id is in the URL, the PIN is entered once
 * and kept in the browser. Dealer tiles carry the code in very large type.
 */
export default async function Till({ searchParams }: { searchParams: Promise<{ centre?: string }> }) {
  const { centre } = await searchParams;
  if (!centre) return <main className="p-8 text-sm">Open this page from the centre settings link so it knows which centre you are.</main>;
  const db = supabaseAdmin();
  const [{ data: c }, { data: links }] = await Promise.all([
    db.from("centres").select("id, name").eq("id", centre).single(),
    db.from("dealer_centres").select("dealer_id, pitch_numbers, dealers(name, code)").eq("centre_id", centre).eq("status", "active").is("left_at", null),
  ]);
  if (!c) return <main className="p-8 text-sm">Centre not found.</main>;
  const dealers = (links ?? [])
    .map((l) => ({ id: l.dealer_id, name: (l.dealers as unknown as { name: string }).name, code: (l.dealers as unknown as { code: string }).code, pitches: l.pitch_numbers.join(", ") }))
    .sort((a, b) => a.code.localeCompare(b.code));
  return <TillScreen centreId={c.id} centreName={c.name} dealers={dealers} />;
}
