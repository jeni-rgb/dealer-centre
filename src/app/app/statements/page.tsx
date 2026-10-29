import { requireDealer } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { DealerNav, Page, Rule, Stat, money } from "@/components/ui";


export default async function Statements() {
  const me = await requireDealer();
  const sb = await supabaseServer();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [{ data: links }, { data: sales }, { data: statements }] = await Promise.all([
    sb.from("dealer_centres").select("centre_id, rent_pence, centres(name, commission_bps)").eq("dealer_id", me.dealer_id).is("left_at", null),
    sb.from("sales").select("amount_pence, centre_id, channel_id").eq("dealer_id", me.dealer_id).is("voided_at", null).gte("sold_at", monthStart.toISOString()),
    sb.from("statements").select("id, period, centre_id, gross_pence, commission_pence, rent_pence, net_pence, status, pdf_path, centres(name)").eq("dealer_id", me.dealer_id).order("period", { ascending: false }).limit(24),
  ]);

  const online = (sales ?? []).filter((s) => !s.centre_id).reduce((a, s) => a + s.amount_pence, 0);

  return (
    <Page title="Money">
      <h2 className="mb-1 text-sm font-medium">This month so far</h2>
      <Rule />
      {(links ?? []).map((l) => {
        const c = l.centres as unknown as { name: string; commission_bps: number };
        const gross = (sales ?? []).filter((s) => s.centre_id === l.centre_id).reduce((a, s) => a + s.amount_pence, 0);
        const commission = Math.round((gross * c.commission_bps) / 10000);
        const net = gross - commission - l.rent_pence;
        return (
          <div key={l.centre_id} className="border-b border-rule py-4">
            <div className="mb-3 text-sm">{c.name}</div>
            <div className="grid grid-cols-4 gap-2">
              <Stat label="Sales" value={money(gross)} />
              <Stat label={`Comm. ${c.commission_bps / 100}%`} value={`−${money(commission)}`} />
              <Stat label="Rent" value={`−${money(l.rent_pence)}`} />
              <Stat label="Owed to you" value={money(Math.max(net, 0))} />
            </div>
            {net < 0 && <p className="mt-2 text-xs text-oxblood">You owe {money(-net)} if nothing else sells.</p>}
          </div>
        );
      })}
      {online > 0 && (
        <div className="border-b border-rule py-4">
          <div className="mb-3 text-sm">Shopify</div>
          <Stat label="Sales" value={money(online)} />
        </div>
      )}

      <h2 className="mb-1 mt-8 text-sm font-medium">Statements</h2>
      <Rule />
      {(statements ?? []).length === 0 && <p className="py-4 text-sm text-ink-2">Your first statement arrives on the centre's statement day.</p>}
      <ul>
        {(statements ?? []).map((s) => (
          <li key={s.id} className="flex items-center justify-between border-b border-rule py-3 text-sm">
            <div>
              <div>{new Date(s.period).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</div>
              <div className="text-xs text-ink-3">{(s.centres as unknown as { name: string })?.name} · {s.status}</div>
            </div>
            <div className="text-right">
              <div className="num font-medium">{money(s.net_pence)}</div>
              {s.pdf_path && <a className="text-xs underline" href={`/api/files?path=${encodeURIComponent(s.pdf_path)}`}>PDF</a>}
            </div>
          </li>
        ))}
      </ul>
      <DealerNav active="/app/statements" />
    </Page>
  );
}
