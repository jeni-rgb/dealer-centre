"use client";
import { useState } from "react";
import { PRINTER_MODELS } from "@/lib/labels/models";
import { useRouter } from "next/navigation";

export function CentreTermsForm({ centreId, initial }: { centreId: string; initial: { commission: number; online: number; share: number; rent_day: number; statement_day: number } }) {
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [saved, setSaved] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: parseFloat(e.target.value || "0") });
  async function save(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`/api/centres/${centreId}/terms`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(f) });
    setSaved(true); setTimeout(() => setSaved(false), 1500); router.refresh();
  }
  return (
    <form onSubmit={save} className="flex flex-wrap items-end gap-4">
      <Field value={f.commission} onChange={set("commission")} label="Floor commission" suffix="%" />
      <div className="flex flex-col gap-1 text-[13px]"><span className="text-ink-muted">Online commission</span><span className="font-medium">{f.online}% ({f.online - f.share}% Dealer Centre, {f.share}% your centre)</span></div>
      <Field value={f.rent_day} onChange={set("rent_day")} label="Rent day (1 to 28, or 1 = Monday, 5 = Friday for weekly)" suffix="" />
      <Field value={f.statement_day} onChange={set("statement_day")} label="Statement day" suffix="" />
      <button className="btn-sm">{saved ? "Saved" : "Save"}</button>
    </form>
  );
}

export function CentrePrinterForm({ centreId }: { centreId: string }) {
  const router = useRouter();
  const [name, setName] = useState("Till printer");
  const [provider, setProvider] = useState<"browser" | "printnode">("browser");
  const [pid, setPid] = useState("");
  const [model, setModel] = useState<string>(PRINTER_MODELS[0].id);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/printers", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, provider, provider_id: pid || undefined, centre_id: centreId, model }) });
    router.refresh();
  }
  return (
    <form onSubmit={submit} className="mt-3 flex flex-wrap gap-2">
      <input className="field !h-10 !w-48 !text-[14px]" value={name} onChange={(e) => setName(e.target.value)} />
      <select className="field !h-10 !w-72 !text-[14px]" value={model} onChange={(e) => setModel(e.target.value)}>{PRINTER_MODELS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
      <select className="field !h-10 !w-40 !text-[14px]" value={provider} onChange={(e) => setProvider(e.target.value as "browser" | "printnode")}><option value="browser">Browser print</option><option value="printnode">PrintNode</option></select>
      {provider === "printnode" && <input className="field !h-10 !w-32 !text-[14px]" placeholder="Printer ID" value={pid} onChange={(e) => setPid(e.target.value)} />}
      <button className="btn-sm-secondary">Add printer</button>
    </form>
  );
}

function Field({ value, onChange, label, suffix }: { value: number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; label: string; suffix: string }) {
  return <label className="flex flex-col gap-1 text-[12px] text-ink-muted">{label}<span className="flex items-center gap-1"><input className="field num !h-10 !w-24 !text-[14px]" inputMode="decimal" value={value} onChange={onChange} /><span>{suffix}</span></span></label>;
}
