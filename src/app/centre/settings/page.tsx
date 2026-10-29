import { redirect } from "next/navigation";
import { currentCentre } from "@/lib/centre";
import { supabaseServer } from "@/lib/supabase/server";
import { Rule } from "@/components/ui";
import { CentrePrinterForm } from "./forms";


export default async function CentreSettings({ searchParams }: { searchParams: Promise<{ centre?: string }> }) {
  const { centre: cp } = await searchParams;
  const centre = await currentCentre(cp);
  if (!centre) redirect("/signup/centre");
  const sb = await supabaseServer();
  const [{ data: channel }, { data: printers }] = await Promise.all([
    sb.from("channels_public").select("external_account_id, status, last_webhook_at").eq("owner_type", "centre").eq("owner_id", centre.id).eq("type", "square").maybeSingle(),
    sb.from("printers").select("id, name, provider, provider_id, status").eq("owner_type", "centre").eq("owner_id", centre.id),
  ]);

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-xl font-medium">{centre.name} settings</h1>

      <section className="mb-8">
        <h2 className="mb-1 text-sm font-medium">Terms</h2>
        <Rule />
        <dl className="grid grid-cols-2 gap-y-2 py-3 text-sm">
          <dt className="text-ink-3">Commission</dt><dd className="num">{centre.commission_bps / 100}%</dd>
          <dt className="text-ink-3">Rent day</dt><dd className="num">{centre.rent_day}</dd>
          <dt className="text-ink-3">Statement day</dt><dd className="num">{centre.statement_day}</dd>
          <dt className="text-ink-3">Centre code</dt><dd className="sku">{centre.invite_code}</dd>
        </dl>
      </section>

      <section className="mb-8">
        <h2 className="mb-1 text-sm font-medium">Square</h2>
        <Rule />
        <div className="py-3 text-sm">
          {channel ? (
            <>Connected, merchant {channel.external_account_id}. {channel.last_webhook_at ? `Last event ${new Date(channel.last_webhook_at).toLocaleString("en-GB")}.` : "No events yet."}</>
          ) : (
            <a className="btn" href={`/api/oauth/square?owner=centre&id=${centre.id}`}>Connect Square</a>
          )}
        </div>
        <p className="text-xs text-ink-3">Webhook address for the Square developer dashboard: <span className="sku">{process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/square</span></p>
      </section>

      <section className="mb-8">
        <h2 className="mb-1 text-sm font-medium">Till printer</h2>
        <Rule />
        <ul className="py-2 text-sm">
          {(printers ?? []).map((p) => (
            <li key={p.id} className="flex justify-between border-b border-rule py-2">
              <span>{p.name}</span><span className="text-xs text-ink-3">{p.provider === "printnode" ? `PrintNode ${p.provider_id}` : "Browser print"}</span>
            </li>
          ))}
        </ul>
        <CentrePrinterForm centreId={centre.id} />
        <p className="mt-2 text-xs text-ink-3">For labels to print without anyone touching a computer, install the PrintNode client on the till PC or a Raspberry Pi next to the printer and enter its printer ID here. Otherwise labels open as a PDF on the till iPad.</p>
      </section>

      <section>
        <h2 className="mb-1 text-sm font-medium">Till screen</h2>
        <Rule />
        <p className="py-3 text-sm">Open <a className="underline" href={`/till?centre=${centre.id}`}>/till</a> on the till iPad and add it to the home screen. Staff enter the till PIN once a day.</p>
      </section>
    </div>
  );
}
