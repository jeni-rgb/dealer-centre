"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Scan = { key: number; outcome: string; ticket: string; title: string | null; dealer: string | null };

const LOOK: Record<string, { label: string; tone: string; ok: boolean }> = {
  found: { label: "Found", tone: "bg-success-soft text-success", ok: true },
  repeat: { label: "Already scanned", tone: "bg-surface-2 text-ink-muted", ok: true },
  sold_online_waiting: { label: "Sold online, waiting for the runner. Leave it", tone: "bg-accent-soft text-accent-text", ok: true },
  sold: { label: "Says sold, but it is here", tone: "bg-warning-soft text-warning", ok: false },
  withdrawn: { label: "Withdrawn, but it is here", tone: "bg-warning-soft text-warning", ok: false },
  other_dealer: { label: "Another dealer's item", tone: "bg-warning-soft text-warning", ok: false },
  other_centre: { label: "Belongs to another centre", tone: "bg-warning-soft text-warning", ok: false },
  unknown: { label: "Not on the system", tone: "bg-danger-soft text-danger", ok: false },
};

/**
 * Scan every ticket. A Bluetooth or USB scanner types the code and presses Enter into the box, which keeps focus.
 * The camera button reads the label barcode with the phone. Each scan beeps once if fine, twice if not.
 */
export function StockScanner({ checkId, expected, scope, doneHref }: { checkId: string; expected: number; scope: string; doneHref: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stopCam = useRef<(() => void) | null>(null);
  const lastCam = useRef<{ text: string; at: number }>({ text: "", at: 0 });
  const [value, setValue] = useState("");
  const [scans, setScans] = useState<Scan[]>([]);
  const [busy, setBusy] = useState(false);
  const [camera, setCamera] = useState(false);
  const [camErr, setCamErr] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const found = new Set(scans.filter((s) => s.outcome === "found").map((s) => s.ticket)).size;
  const problems = scans.filter((s) => !LOOK[s.outcome]?.ok).length;

  const beep = (ok: boolean) => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const play = (at: number, f: number) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f; o.connect(g); g.connect(ctx.destination); g.gain.setValueAtTime(0.15, ctx.currentTime + at); o.start(ctx.currentTime + at); o.stop(ctx.currentTime + at + 0.09); };
      if (ok) play(0, 1200); else { play(0, 420); play(0.14, 420); }
      navigator.vibrate?.(ok ? 40 : [80, 60, 80]);
    } catch {}
  };

  const send = useCallback(async (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    setBusy(true);
    const r = await fetch(`/api/stock-checks/${checkId}/scan`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ raw: text }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setCamErr(j.error ?? "Scan not saved"); return; }
    setScans((s) => [{ key: Date.now() + Math.random(), outcome: j.outcome, ticket: j.ticket, title: j.title, dealer: j.dealer }, ...s].slice(0, 200));
    beep(!!LOOK[j.outcome]?.ok);
  }, [checkId]);

  useEffect(() => { input.current?.focus(); }, []);
  useEffect(() => () => stopCam.current?.(), []);

  async function startCamera() {
    setCamErr(null);
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      setCamera(true);
      await new Promise((r) => setTimeout(r, 50));
      const controls = await reader.decodeFromVideoDevice(undefined, video.current!, (res) => {
        if (!res) return;
        const text = res.getText();
        const now = Date.now();
        // the camera sees the same label many times a second; take it once per 2.5 seconds
        if (text === lastCam.current.text && now - lastCam.current.at < 2500) return;
        lastCam.current = { text, at: now };
        send(text);
      });
      stopCam.current = () => controls.stop();
    } catch {
      setCamera(false);
      setCamErr("Could not open the camera. Allow camera access, or use a Bluetooth scanner.");
    }
  }
  function stopCamera() { stopCam.current?.(); stopCam.current = null; setCamera(false); input.current?.focus(); }

  async function finish() {
    if (!confirm(`Finish the stock check? Anything ${scope === "pitch" ? "on this pitch" : "in the centre"} that should be there and was not scanned will be listed as missing.`)) return;
    stopCamera();
    setFinishing(true);
    const r = await fetch(`/api/stock-checks/${checkId}/finish`, { method: "POST" });
    setFinishing(false);
    if (r.ok) router.push(doneHref); else alert("Could not finish. Try again.");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="card p-3 text-center"><div className="figure text-[26px]">{found}</div><div className="text-[11px] font-semibold text-ink-muted">of {expected} found</div></div>
        <div className="card p-3 text-center"><div className="figure text-[26px]">{Math.max(0, expected - found)}</div><div className="text-[11px] font-semibold text-ink-muted">still to find</div></div>
        <div className={`card p-3 text-center ${problems ? "border-warning" : ""}`}><div className="figure text-[26px]">{problems}</div><div className="text-[11px] font-semibold text-ink-muted">to look at</div></div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); const v = value; setValue(""); send(v); input.current?.focus(); }} className="flex gap-2">
        <label className="sr-only" htmlFor="scan-box">Ticket</label>
        <input id="scan-box" ref={input} value={value} onChange={(e) => setValue(e.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="Scan or type a ticket" className="field !h-14 flex-1 !text-[18px] font-semibold" onBlur={() => { if (!camera) setTimeout(() => input.current?.focus(), 150); }} />
        <button className="btn !h-14 !w-auto !px-5" disabled={busy || !value.trim()}>Add</button>
      </form>

      {!camera ? (
        <button type="button" className="btn-outline" onClick={startCamera}>Scan with the camera</button>
      ) : (
        <div className="flex flex-col gap-2">
          <video ref={video} className="aspect-[4/3] w-full rounded-[14px] bg-ink object-cover" muted playsInline />
          <button type="button" className="btn-outline" onClick={stopCamera}>Stop camera</button>
        </div>
      )}
      {camErr && <p className="text-[13px] text-danger">{camErr}</p>}

      <div className="flex flex-col gap-1.5">
        {scans.length === 0 && <p className="card p-4 text-center text-[14px] text-ink-muted">Scan the first ticket. Work along the shelves so nothing gets scanned twice or missed.</p>}
        {scans.map((s) => (
          <div key={s.key} className={`flex items-center justify-between gap-3 rounded-[12px] px-3 py-2.5 text-[13px] ${LOOK[s.outcome]?.tone ?? "bg-surface-2"}`}>
            <span className="min-w-0"><span className="ticket font-semibold">{s.ticket}</span>{s.title ? <span className="ml-2 truncate">{s.title}</span> : null}{s.dealer && s.outcome === "other_dealer" ? <span> · {s.dealer}</span> : null}</span>
            <span className="shrink-0 font-semibold">{LOOK[s.outcome]?.label ?? s.outcome}</span>
          </div>
        ))}
      </div>

      <button type="button" className="btn-dark" disabled={finishing} onClick={finish}>{finishing ? "Working it out…" : "Finish and see what is missing"}</button>
    </div>
  );
}
