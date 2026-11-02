import { supabaseAdmin } from "@/lib/supabase/server";
import { StaffForm } from "./form";

/** Runners and the shop manager: who can open the orders desk and the collection run. */
export default async function Staff() {
  const { data: staff } = await supabaseAdmin().from("users").select("email, created_at").eq("role", "ops_staff").order("email");
  return (
    <>
      <div className="mb-6"><h1 className="text-[24px] font-semibold">Staff</h1><p className="text-[13px] text-ink-muted">Runners and the shop manager. They sign in with an emailed link and see the Online orders desk and the Collection run (/run) on their phone, nothing else.</p></div>
      <StaffForm staff={(staff ?? []).map((s) => s.email)} />
    </>
  );
}
