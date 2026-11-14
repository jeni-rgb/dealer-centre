"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Refreshes the open screen when a SumUp sale lands. */
export function SumupLive({ owner, centreId, seen }: { owner: "dealer" | "centre"; centreId?: string; seen: string }) {
  const router = useRouter();
  useEffect(() => {
    let marker = seen;
    let dead = false;
    async function tick() {
      if (dead || document.visibilityState === "hidden") return;
      const r = await fetch("/api/app/sumup/live", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ owner, centreId }),
      });
      if (!r.ok) return;
      const j = (await r.json()) as { marker?: string };
      if (!j.marker || j.marker === marker) return;
      marker = j.marker;
      router.refresh();
    }
    const id = window.setInterval(tick, 8000);
    void tick();
    return () => {
      dead = true;
      window.clearInterval(id);
    };
  }, [owner, centreId, seen, router]);
  return null;
}
