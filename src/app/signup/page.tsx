import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { SignupStart } from "./start";

export const metadata: Metadata = { title: "Create your Dealer Centre account" };

/** The front door. Who are you, what is your email. The sign in link lands you in the right flow. */
export default async function Signup({ searchParams }: { searchParams: Promise<{ as?: string; plan?: string }> }) {
  const { as, plan } = await searchParams;
  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5"><Link href="/"><Logo size={30} /></Link><Link href="/signin" className="text-[14px] font-semibold">Already have an account? Sign in</Link></header>
      <div className="mx-auto max-w-md px-6 pb-20 pt-10">
        <SignupStart initialAs={as === "centre" ? "centre" : as === "dealer" ? "dealer" : null} plan={plan ?? null} />
      </div>
    </main>
  );
}
