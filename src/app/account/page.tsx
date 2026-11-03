import { redirect } from "next/navigation";
import { getMe } from "@/lib/auth";
import { SetPassword } from "./set-password";

export const dynamic = "force-dynamic";

export default async function Account() {
  const me = await getMe();
  if (!me) redirect("/signin?next=/account");
  const back = me.dealer_id ? "/app/settings" : me.is_platform_admin ? "/admin" : "/centre";
  return (
    <main className="mx-auto max-w-md px-5 py-10">
      <h1 className="text-2xl font-semibold">Password</h1>
      <p className="mt-2 text-sm text-ink-muted">Signed in as {me.email}. Set a password so you can sign in without an email code.</p>
      <SetPassword back={back} />
    </main>
  );
}
