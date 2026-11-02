import { redirect } from "next/navigation";
import { currentCentre } from "@/lib/centre";
import { supabaseServer } from "@/lib/supabase/server";
import { PrintButton } from "./print";

/** Printable code sheet for the till: who is who. One line per dealer, big type. */
export default async function CodeSheet({ searchParams }: { searchParams: Promise<{ centre?: string }> }) {
  const { centre: cp } = await searchParams;
  const centre = await currentCentre(cp);
  if (!centre) redirect("/signup/centre");
  const sb = await supabaseServer();
  const { data } = await sb.from("dealer_centres").select("pitch_numbers, dealers(name, code, placeholder)").eq("centre_id", centre.id).is("left_at", null).eq("status", "active");
  const rows = (data ?? []).map((r) => ({ ...(r.dealers as unknown as { name: string; code: string; placeholder: boolean }), pitches: (r.pitch_numbers as string[]) ?? [] })).sort((a, b) => a.code.localeCompare(b.code));
  const half = Math.ceil(rows.length / 2);
  const cols = [rows.slice(0, half), rows.slice(half)];
  return (
    <div className="mx-auto max-w-[900px] bg-white p-8 print:p-0">
      <div className="mb-6 flex items-end justify-between print:mb-4">
        <div><h1 className="text-[28px] font-semibold">{centre.name}: dealer codes</h1><p className="text-[14px] text-ink-muted">Type the code and the ticket number into the till screen. Handwritten ticket &ldquo;Bloom Antiques 372&rdquo; is <span className="ticket">B14 0372</span>.</p></div>
        <PrintButton />
      </div>
      <div className="grid grid-cols-2 gap-x-10">
        {cols.map((col, i) => (
          <table key={i} className="w-full text-[16px]">
            <tbody>
              {col.map((r) => (
                <tr key={r.code} className="border-b border-border">
                  <td className="py-2.5 pr-3"><span className="ticket text-[22px] font-semibold">{r.code}</span></td>
                  <td className="py-2.5">{r.name}{r.placeholder ? "" : " ·"}{!r.placeholder && <span className="ml-1 text-[12px] text-ink-muted">app</span>}</td>
                  <td className="py-2.5 text-right text-ink-muted">{r.pitches.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}
      </div>
      {rows.length === 0 && <p className="text-ink-muted">No dealers yet. Add them on the Dealers page.</p>}
      <p className="mt-6 text-[12px] text-ink-muted">Updated {new Date().toLocaleDateString("en-GB")}. Print a fresh one when dealers change.</p>
    </div>
  );
}
