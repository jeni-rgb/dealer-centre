"use client";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/ui";

export function OpsNav({ admin }: { admin: boolean }) {
  const path = usePathname();
  const items: [string, string, boolean][] = [["Online orders", "/ops/orders", path.startsWith("/ops/orders")], ["Collection run", "/run", false]];
  if (admin) items.push(["Platform admin", "/admin", false]);
  return <Sidebar title="Operations" items={items} />;
}
