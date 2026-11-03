import { requireDealer } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { DealerNav, Screen } from "@/components/ui";
import { LabelsView } from "./view";
import { sizeText } from "@/lib/labels/models";

export default async function Labels() {
  const me = await requireDealer();
  const sb = await supabaseServer();
  const [{ data: jobs }, { data: printers }, { data: last }] = await Promise.all([
    sb.from("print_jobs").select("id, status, created_at, updated_at, printer_id, item_id, items(sku, title, status, photos)").eq("dealer_id", me.dealer_id).order("updated_at", { ascending: false }).limit(200),
    sb.from("printers").select("id, name, owner_type, provider, status, label_width_mm, label_height_mm, centres:centre_id(name)").eq("status", "ready"),
    sb.from("print_jobs").select("printer_id").eq("dealer_id", me.dealer_id).not("printer_id", "is", null).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const rows = (jobs ?? [])
    .filter((j) => (j.items as unknown as { status: string })?.status === "live" || j.status !== "not_printed")
    .map((j) => {
      const it = j.items as unknown as { sku: string; title: string; photos: { url?: string }[] };
      return { id: j.id, item_id: j.item_id, status: j.status, sku: it.sku, title: it.title, photo: it.photos?.[0]?.url ?? null, at: j.updated_at };
    });
  return (
    <Screen title="Labels" back={{ href: "/app" }}>
      <LabelsView
        rows={rows}
        printers={(printers ?? []).map((p) => ({ id: p.id, name: p.owner_type === "centre" ? `${(p.centres as unknown as { name: string })?.name ?? p.name} till` : p.name, kind: p.owner_type === "centre" ? "Shop printer" : "Your printer", cloud: p.provider === "printnode", size: sizeText(p.label_width_mm, p.label_height_mm) }))}
        lastPrinterId={last?.printer_id ?? null}
      />
      <DealerNav active="today" />
    </Screen>
  );
}
