import { redirect } from "next/navigation";
import { getMe } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { CentreSignupForm } from "./form";
import { PASSWORD_COPY } from "@/lib/password";
import { passwordNeed } from "@/lib/password-user";
import { PasswordContinue } from "@/components/password-continue";

export default async function CentreSignup() {
  const me = await getMe();
  if (!me) redirect("/signin?next=/signup/centre");
  const sb = await supabaseServer();
  const { data: owned } = await sb.from("centre_owners").select("centre_id").eq("user_id", me.id).limit(1);
  if (owned?.length) redirect(`/centre?centre=${owned[0].centre_id}`);
  const need = await passwordNeed();
  if (need) {
    return (
      <main className="mx-auto max-w-lg px-5 pb-16 pt-10">
        <div className="text-[13px] font-semibold text-accent">Dealer Centre</div>
        <h1 className="mt-2 text-[24px] font-semibold">{PASSWORD_COPY.title}</h1>
        <p className="mt-1 text-[14px] text-ink-muted">{need === "temp" ? PASSWORD_COPY.temp : PASSWORD_COPY.missing}</p>
        <PasswordContinue />
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-lg px-5 pb-16 pt-10">
      <div className="text-[13px] font-semibold text-accent">Dealer Centre</div>
      <h1 className="mt-2 text-[24px] font-semibold">Set up your centre</h1>
      <p className="mt-1 text-[14px] text-ink-muted">Six quick questions. Free for centres, always.</p>
      <CentreSignupForm />
    </main>
  );
}
