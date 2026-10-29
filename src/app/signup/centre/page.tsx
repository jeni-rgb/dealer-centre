import { redirect } from "next/navigation";
import { getMe } from "@/lib/auth";
import { CentreSignupForm } from "./form";

export default async function CentreSignup() {
  const me = await getMe();
  if (!me) redirect("/signin?next=/signup/centre");
  return (
    <main className="mx-auto max-w-lg px-4 pt-10 pb-16">
      <h1 className="text-lg font-medium">Connect your centre</h1>
      <p className="mt-1 text-sm text-ink-2">Free for centres. Six steps, under an hour. Your dealers' floor sales flow to their phones and your statements write themselves.</p>
      <CentreSignupForm />
    </main>
  );
}
