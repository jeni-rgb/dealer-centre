import { SignInForm } from "./form";

export default async function SignIn({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="mx-auto max-w-sm px-4 pt-16">
      <h1 className="text-[24px] font-semibold">Dealer Centre</h1>
      <p className="mt-1 text-[14px] text-ink-muted">Enter your email and we send a sign in link. No password.</p>
      <SignInForm next={next ?? "/app"} />
    </main>
  );
}
