import { redirect } from "next/navigation";
import { getMe } from "@/lib/auth";
import { DealerSignupForm } from "./form";

export default async function DealerSignup() {
  const me = await getMe();
  if (!me) redirect("/signin?next=/signup/dealer");
  if (me.dealer_id) redirect("/app");
  return (
    <main className="mx-auto max-w-sm px-4 pt-10 pb-16">
      <h1 className="text-lg font-medium">Set up your dealer account</h1>
      <p className="mt-1 text-sm text-ink-2">Three questions, then 30 days free. £150 a month after, cancel any time.</p>
      <DealerSignupForm />
    </main>
  );
}
