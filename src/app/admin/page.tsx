import { supabaseAdmin } from "@/lib/supabase/server";
import { money } from "@/components/ui";


export default async function Admin() {
  const db = supabaseAdmin();
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const [{ data: centres }, { data: dealers }, { data: sales }, { data: channels }] = await Promise.all([
    db.from("centres").select("id, name, invite_code, status, created_at"),
    db.from("dealers").select("id, name, code, plan, trial_ends_at, created_at"),
    db.from("sales").select("dealer_id, centre_id, amount_pence").is("voided_at", null).gte("sold_at", monthStart.toISOString()),
    db.from("channels").select("owner_type, owner_id, type, status, last_webhook_at"),
  ]);
  const byDealer = new Map<string, number>();
  const byCentre = new Map<string, number>();
  for (const s of sales ?? []) {
    if (s.dealer_id) byDealer.set(s.dealer_id, (byDealer.get(s.dealer_id) ?? 0) + s.amount_pence);
    if (s.centre_id) byCentre.set(s.centre_id, (byCentre.get(s.centre_id) ?? 0) + s.amount_pence);
  }
  const paying = (dealers ?? []).filter((d) => d.plan === "pro").length;
  const trial = (dealers ?? []).filter((d) => d.plan === "trial").length;

  return (
    <>
      <div className="mb-8 grid grid-cols-4 gap-6 text-sm">
        <div><div className="text-xs text-ink-3">Centres</div><div className="num text-2xl">{(centres ?? []).length}</div></div>
        <div><div className="text-xs text-ink-3">Paying dealers</div><div className="num text-2xl">{paying}</div></div>
        <div><div className="text-xs text-ink-3">On trial</div><div className="num text-2xl">{trial}</div></div>
        <div><div className="text-xs text-ink-3">MRR</div><div className="num text-2xl">{money(paying * 15000)}</div></div>
      </div>

      <h2 className="mb-2 text-sm font-medium">Centres</h2>
      <table className="mb-10 w-full text-sm">
        <thead className="text-left text-xs text-ink-3"><tr className="border-b border-rule"><th className="py-2 font-normal">Name</th><th className="py-2 font-normal">Code</th><th className="py-2 font-normal">Square</th><th className="py-2 text-right font-normal">Sales MTD</th><th className="py-2 text-right font-normal">Export</th></tr></thead>
        <tbody>
          {(centres ?? []).map((c) => {
            const ch = (channels ?? []).find((x) => x.owner_type === "centre" && x.owner_id === c.id && x.type === "square");
            return (
              <tr key={c.id} className="border-b border-rule">
                <td className="py-2"><a className="underline" href={`/centre?centre=${c.id}`}>{c.name}</a></td>
                <td className="sku py-2">{c.invite_code}</td>
                <td className="py-2 text-xs">{ch ? `${ch.status}${ch.last_webhook_at ? `, ${new Date(ch.last_webhook_at).toLocaleString("en-GB")}` : ""}` : <span className="text-oxblood">Not connected</span>}</td>
                <td className="num py-2 text-right">{money(byCentre.get(c.id) ?? 0)}</td>
                <td className="py-2 text-right"><a className="text-xs underline" href={`/api/admin/export?centre=${c.id}`}>CSV</a></td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2 className="mb-2 text-sm font-medium">Dealers</h2>
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-ink-3"><tr className="border-b border-rule"><th className="py-2 font-normal">Name</th><th className="py-2 font-normal">Code</th><th className="py-2 font-normal">Plan</th><th className="py-2 font-normal">Shopify</th><th className="py-2 text-right font-normal">Sales MTD</th><th className="py-2 text-right font-normal">Joined</th></tr></thead>
        <tbody>
          {(dealers ?? []).map((d) => {
            const sh = (channels ?? []).find((x) => x.owner_type === "dealer" && x.owner_id === d.id && x.type === "shopify");
            return (
              <tr key={d.id} className="border-b border-rule">
                <td className="py-2">{d.name}</td>
                <td className="sku py-2">{d.code}</td>
                <td className="py-2">{d.plan}{d.plan === "trial" && d.trial_ends_at ? ` to ${new Date(d.trial_ends_at).toLocaleDateString("en-GB")}` : ""}</td>
                <td className="py-2 text-xs">{sh ? sh.status : "–"}</td>
                <td className="num py-2 text-right">{money(byDealer.get(d.id) ?? 0)}</td>
                <td className="py-2 text-right text-xs text-ink-3">{new Date(d.created_at).toLocaleDateString("en-GB")}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
