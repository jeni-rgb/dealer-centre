import Link from "next/link";
import { requireDealer } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { DealerNav, Phone, money } from "@/components/ui";

export default async function Statement() {
  const me = await requireDealer();
  const sb = await supabaseServer();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [{ data: links }, { data: sales }, { data: statements }] = await Promise.all([
    sb.from("dealer_centres").select("centre_id, rent_pence, rent_mode, rent_schedule, centres(name, commission_bps, online_commission_bps)").eq("dealer_id", me.dealer_id).is("left_at", null),
    sb.from("sales").select("amount_pence, channel_fee_pence, postage_pence, payment_type, centre_id, channels:channel_id(type, owner_type)").eq("dealer_id", me.dealer_id).is("voided_at", null).gte("sold_at", monthStart.toISOString()),
    sb.from("statements").select("id, period, centre_id, gross_pence, net_pence, status, pdf_path, centres(name)").eq("dealer_id", me.dealer_id).order("period", { ascending: false }).limit(12),
  ]);

  const all = sales ?? [];
  const gross = all.reduce((a, s) => a + s.amount_pence, 0);
  const floor = all.filter((s) => (s.channels as unknown as { type: string })?.type === "square");
  const online = all.filter((s) => (s.channels as unknown as { type: string })?.type !== "square");
  const card = floor.filter((s) => s.payment_type && s.payment_type !== "CASH").reduce((a, s) => a + s.amount_pence, 0);
  const floorGross = floor.reduce((a, s) => a + s.amount_pence, 0);
  const onlineGross = online.reduce((a, s) => a + s.amount_pence, 0);
  const onlineFees = online.reduce((a, s) => a + s.channel_fee_pence + s.postage_pence, 0);

  // Floor commission per centre, rent per centre
  let floorCommission = 0, rent = 0;
  for (const l of links ?? []) {
    const c = l.centres as unknown as { commission_bps: number };
    const g = floor.filter((s) => s.centre_id === l.centre_id).reduce((a, s) => a + s.amount_pence, 0);
    floorCommission += Math.round((g * c.commission_bps) / 10000);
    if (l.rent_mode === "rent") rent += l.rent_pence;
  }
  const net = gross - floorCommission - onlineFees - rent;

  const rows: [string, number, string?][] = [
    ["Gross sales", gross, `/app/stock?f=sold&month=${monthKey}`],
    ["Floor commission", -floorCommission],
    ["Online commission and postage", -onlineFees],
    ["Rent", -rent],
  ];

  return (
    <Phone>
      <header className="header-dark flex flex-col gap-5">
        <div className="flex flex-col gap-0.5"><span className="text-[12px] text-header-muted">{now.toLocaleDateString("en-GB", { month: "long", year: "numeric" })} · running</span><span className="text-[20px] font-semibold">Statement</span></div>
        <div className="flex flex-col gap-1.5"><span className="text-[13px] text-header-muted">Owed to you so far</span><span className={`num text-[44px] font-bold leading-[48px] tracking-[-0.03em] ${net < 0 ? "text-[#FCA5A5]" : ""}`}>{money(net)}</span></div>
        <div className="grid grid-cols-3 gap-2">
          <div className="header-stat"><span className="num text-[16px] font-semibold">{money(floorGross)}</span><span className="text-[11px] text-header-muted">Floor</span></div>
          <div className="header-stat"><span className="num text-[16px] font-semibold">{money(onlineGross)}</span><span className="text-[11px] text-header-muted">Online</span></div>
          <div className="header-stat"><span className="num text-[16px] font-semibold">{floorGross ? Math.round((card / floorGross) * 100) : 0}%</span><span className="text-[11px] text-header-muted">Card</span></div>
        </div>
      </header>

      <div className="flex flex-col gap-4 px-5 pt-5">
        <div className="card divide-y divide-border">
          {rows.map(([label, v, href]) => (
            <div key={label} className="flex h-[52px] items-center justify-between px-4 text-[14px]">
              {href ? <Link href={href} className="font-medium text-accent">{label}</Link> : <span>{label}</span>}
              <span className={`num font-semibold ${v < 0 ? "text-ink-muted" : ""}`}>{v < 0 ? `−${money(-v)}` : money(v)}</span>
            </div>
          ))}
          <div className="flex h-[56px] items-center justify-between px-4 text-[15px] font-semibold"><span>Net</span><span className="num">{money(net)}</span></div>
        </div>
        {(links ?? []).map((l) => {
          const c = l.centres as unknown as { name: string; commission_bps: number; online_commission_bps: number };
          const sched: Record<string, string> = { first: "1st", fifteenth: "15th", last: "last day", weekly_friday: "every Friday", weekly_monday: "every Monday", quarterly: "quarterly" };
          return <p key={l.centre_id} className="text-[12px] text-ink-muted">{c.name}: {c.commission_bps / 100}% on the floor, {c.online_commission_bps / 100}% online{l.rent_mode === "rent" ? `, rent ${money(l.rent_pence)} taken ${sched[l.rent_schedule]}` : ", commission only"}.</p>;
        })}

        <div>
          <h2 className="pb-2 text-[16px] font-semibold">Previous months</h2>
          {(statements ?? []).length === 0 && <p className="card p-4 text-[14px] text-ink-muted">Your first statement arrives on the centre's statement day.</p>}
          <div className="flex flex-col gap-2">
            {(statements ?? []).map((s) => (
              <div key={s.id} className="row !min-h-[60px]">
                <div className="flex flex-1 flex-col gap-0.5"><span className="text-[14px] font-medium">{new Date(s.period).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</span><span className="text-[12px] text-ink-muted">{(s.centres as unknown as { name: string })?.name} · {s.status}</span></div>
                <span className="num text-[15px] font-semibold">{money(s.net_pence)}</span>
                {s.pdf_path && <a className="text-[13px] font-medium text-accent" href={`/api/files?path=${encodeURIComponent(s.pdf_path)}`}>PDF</a>}
              </div>
            ))}
          </div>
        </div>
      </div>
      <DealerNav active="statement" />
    </Phone>
  );
}
