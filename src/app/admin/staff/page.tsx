import { supabaseAdmin } from "@/lib/supabase/server";
import { StaffForm } from "./form";
import { PageHeader } from "../ui";

/** Runners and the shop manager: who can open the orders desk and the collection run. */
export default async function Staff() {
  const { data: staff } = await supabaseAdmin().from("users").select("email, created_at").eq("role", "ops_staff").order("email");
  return (
    <>
      <PageHeader title="Staff" subtitle="Runners and the shop manager. They sign in with an emailed link and see Online orders and the collection run." />
      <StaffForm staff={(staff ?? []).map((s) => s.email)} />
    </>
  );
}
