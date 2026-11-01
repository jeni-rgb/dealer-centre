import { redirect } from "next/navigation";
import { env } from "@/lib/env";
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
          {[["square", "Square till", `/api/oauth/square?owner=centre&id=${centre.id}`, centre.till === "square" ? "Floor sales and items flow in automatically" : "Not needed. You record sales in End of day. Connect this only if you move to Square."], ["shopify", "Centre online shop", null, "Your Shopify store. Dealers switch items on per item"], ["ebay", "Centre eBay store", `/api/oauth/ebay?id=${centre.id}`, "Buy it now listings, you handle postage. Coming soon"]].map(([t, label, href, hint]) => {
            const c = ch(t!);
            return (
              <div key={t} className="flex items-center justify-between py-3">
                <span className="flex flex-col"><span className="text-[15px] font-medium">{label}</span><span className="text-[12px] text-ink-muted">{c ? `${c.external_account_id}${c.last_webhook_at ? ` · last event ${new Date(c.last_webhook_at).toLocaleString("en-GB")}` : ""}` : hint}</span></span>
                {c ? <Pill kind="success">Connected</Pill> : t === "shopify" ? <ShopifyConnect centreId={centre.id} /> : t === "ebay" ? <Pill kind="neutral">Later</Pill> : <a className={centre.till === "square" ? "btn-sm" : "btn-sm-secondary"} href={href!}>Connect</a>}
              </div>
            );
          })}
        </div>
        {centre.till === "square" && <p className="mt-3 text-[12px] text-ink-muted">While Square is in test mode, the connect button only works when opened from Square's own developer dashboard. With a real Square account it works from here.</p>}
      </Card>

      <Card title="Till printer">
        <div className="divide-y divide-border">{(printers ?? []).map((p) => <div key={p.id} className="flex items-center justify-between py-3 text-[14px]"><span>{p.name}</span><span className="text-[12px] text-ink-muted">{p.provider === "printnode" ? `PrintNode ${p.provider_id}` : "Opens a PDF on the till"}</span></div>)}</div>
        <CentrePrinterForm centreId={centre.id} />
        <p className="mt-3 text-[12px] text-ink-muted">For labels to print without anyone touching a computer, install the PrintNode client on the till PC or a Raspberry Pi next to the printer and enter its printer ID.</p>
      </Card>

      <Card title="Quick label screen, optional">
        <p className="text-[14px] text-ink-muted">For dealers who do not use the app. Whoever is on the till opens <a className="font-medium text-accent" href={`/till?centre=${centre.id}`}>this page</a> on a phone or tablet, picks the dealer, types a price, and a barcode label prints or downloads. It is protected by a four digit PIN so only staff can use it.</p>
        <p className="mt-3 text-[14px]">Your till PIN: <span className="ticket text-[20px]">{centre.till_pin_plain ?? "set in sign up"}</span></p>
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
