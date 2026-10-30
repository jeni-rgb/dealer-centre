"use client";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/ui";

export function AdminNav() {
  const path = usePathname();
  return <Sidebar title="Platform admin" items={[["Centres and dealers", "/admin", path === "/admin"], ["Health", "/admin/health", path.startsWith("/admin/health")]]} />;
}
