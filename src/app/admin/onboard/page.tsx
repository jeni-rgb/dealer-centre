import { OnboardForm } from "./form";

export default function Onboard() {
  return (
    <>
      <h1 className="mb-1 text-[24px] font-semibold">Onboard a centre</h1>
      <p className="mb-6 text-[14px] text-ink-muted">One form. Creates the centre, the owner&rsquo;s account and every dealer with the code already on their tickets, then gives you a sign in link to send them.</p>
      <OnboardForm />
    </>
  );
}
