"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/ui";

export function CentreNav({ centreName }: { centreName: string }) {
  const path = usePathname();
  const sp = useSearchParams();
  const q = sp.get("centre") ? `?centre=${sp.get("centre")}` : "";
  const items: [string, string, boolean][] = [
    ["End of day", `/centre/eod${q}`, path.startsWith("/centre/eod")],
    ["Dealers", `/centre${q}`, path === "/centre"],
    ["Mapping", `/centre/mapping${q}`, path.startsWith("/centre/mapping")],
    ["Online shop", `/centre/online${q}`, path.startsWith("/centre/online")],
    ["Settings", `/centre/settings${q}`, path.startsWith("/centre/settings")],
    ["Till screen", `/till${q}`, false],
  ];
  return <Sidebar items={items} title={centreName} />;
}
