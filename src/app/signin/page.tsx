import { SignInForm } from "./form";

export default async function SignIn({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="mx-auto max-w-sm px-4 pt-16">
      <h1 className="text-lg font-medium">Dealer Centre</h1>
      <p className="mt-1 text-sm text-ink-2">Enter your email and we send a sign in link. No password.</p>
      <SignInForm next={next ?? "/app"} />
    </main>
  );
}
