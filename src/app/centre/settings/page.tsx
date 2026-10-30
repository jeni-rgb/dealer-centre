import { redirect } from "next/navigation";
import { currentCentre } from "@/lib/centre";
import { supabaseServer } from "@/lib/supabase/server";
import { Pill } from "@/components/ui";
import { CentrePrinterForm, CentreTermsForm } from "./forms";

export default async function CentreSettings({ searchParams }: { searchParams: Promise<{ centre?: string }> }) {
  const { centre: cp } = await searchParams;
  const centre = await currentCentre(cp);
  if (!centre) redirect("/signup/centre");
  const sb = await supabaseServer();
  const [{ data: channels }, { data: printers }] = await Promise.all([
    sb.from("channels_public").select("type, external_account_id, status, last_webhook_at").eq("owner_type", "centre").eq("owner_id", centre.id),
    sb.from("printers").select("id, name, provider, provider_id, status").eq("owner_type", "centre").eq("owner_id", centre.id),
  ]);
  const ch = (t: string) => (channels ?? []).find((c) => c.type === t);

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <h1 className="text-[24px] font-semibold">{centre.name} settings</h1>

      <Card title="Terms">
        <CentreTermsForm centreId={centre.id} initial={{ commission: centre.commission_bps / 100, online: centre.online_commission_bps / 100, share: centre.centre_online_share_bps / 100, handling: centre.handling_fee_pence / 100, rent_day: centre.rent_day, statement_day: centre.statement_day }} />
        <p className="mt-3 text-[12px] text-ink-muted">Centre code for dealers: <span className="ticket">{centre.invite_code}</span></p>
      </Card>

      <Card title="Connections">
        <div className="divide-y divide-border">
          {[["square", "Square till", `/api/oauth/square?owner=centre&id=${centre.id}`, "Floor sales and items for every dealer"], ["shopify", "Centre online shop", null, "Your Shopify store. Dealers switch items on per item"], ["ebay", "Centre eBay store", `/api/oauth/ebay?id=${centre.id}`, "Buy it now listings, you handle postage"]].map(([t, label, href, hint]) => {
            const c = ch(t!);
            return (
              <div key={t} className="flex items-center justify-between py-3">
                <span className="flex flex-col"><span className="text-[15px] font-medium">{label}</span><span className="text-[12px] text-ink-muted">{c ? `${c.external_account_id}${c.last_webhook_at ? ` · last event ${new Date(c.last_webhook_at).toLocaleString("en-GB")}` : ""}` : hint}</span></span>
                {c ? <Pill kind="success">Connected</Pill> : t === "shopify" ? <ShopifyConnect centreId={centre.id} /> : <a className="btn-sm" href={href!}>Connect</a>}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[12px] text-ink-muted">Square webhook address: <span className="ticket">{process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/square</span></p>
      </Card>

      <Card title="Till printer">
        <div className="divide-y divide-border">{(printers ?? []).map((p) => <div key={p.id} className="flex items-center justify-between py-3 text-[14px]"><span>{p.name}</span><span className="text-[12px] text-ink-muted">{p.provider === "printnode" ? `PrintNode ${p.provider_id}` : "Opens a PDF on the till"}</span></div>)}</div>
        <CentrePrinterForm centreId={centre.id} />
        <p className="mt-3 text-[12px] text-ink-muted">For labels to print without anyone touching a computer, install the PrintNode client on the till PC or a Raspberry Pi next to the printer and enter its printer ID.</p>
      </Card>

      <Card title="Till screen">
        <p className="text-[14px]">Open <a className="font-medium text-accent" href={`/till?centre=${centre.id}`}>/till</a> on the till iPad and add it to the home screen. Staff enter the till PIN once a day. Dealer tiles carry the code in large type.</p>
      </Card>
    </div>
  );
}

function ShopifyConnect({ centreId }: { centreId: string }) {
  return (
    <form action="/api/oauth/shopify" method="get" className="flex gap-2">
      <input type="hidden" name="centre" value={centreId} />
      <input name="shop" className="field !h-9 !w-56 !text-[13px]" placeholder="centre.myshopify.com" />
      <button className="btn-sm">Connect</button>
    </form>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="card p-5"><h2 className="mb-3 text-[16px] font-semibold">{title}</h2>{children}</section>;
}
