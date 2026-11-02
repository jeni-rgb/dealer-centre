"use client";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/ui";

export function AdminNav() {
  const path = usePathname();
  return <Sidebar title="Platform admin" items={[["Centres and dealers", "/admin", path === "/admin"], ["Online orders", "/ops/orders", path.startsWith("/ops/orders")], ["Staff", "/admin/staff", path.startsWith("/admin/staff")], ["Onboard a centre", "/admin/onboard", path.startsWith("/admin/onboard")], ["Health", "/admin/health", path.startsWith("/admin/health")], ["Admin guide", "/admin/guide", path.startsWith("/admin/guide")]]} />;
}
