"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function CentrePrinterForm({ centreId }: { centreId: string }) {
  const router = useRouter();
  const [name, setName] = useState("Till printer");
  const [provider, setProvider] = useState<"browser" | "printnode">("browser");
  const [pid, setPid] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/printers", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, provider, provider_id: pid || undefined, centre_id: centreId }) });
    router.refresh();
  }
  return (
    <form onSubmit={submit} className="mt-3 flex flex-wrap gap-2">
      <input className="field flex-1" value={name} onChange={(e) => setName(e.target.value)} />
      <select className="field w-44" value={provider} onChange={(e) => setProvider(e.target.value as "browser" | "printnode")}>
        <option value="browser">Browser print</option>
        <option value="printnode">PrintNode</option>
      </select>
      {provider === "printnode" && <input className="field w-36" placeholder="Printer ID" value={pid} onChange={(e) => setPid(e.target.value)} />}
      <button className="btn-secondary">Add printer</button>
    </form>
  );
}
