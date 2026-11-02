"use client";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/ui";

export function AdminNav() {
  const path = usePathname();
  return <Sidebar title="Platform admin" items={[["Centres and dealers", "/admin", path === "/admin"], ["Onboard a centre", "/admin/onboard", path.startsWith("/admin/onboard")], ["Health", "/admin/health", path.startsWith("/admin/health")], ["Admin guide", "/admin/guide", path.startsWith("/admin/guide")]]} />;
}
