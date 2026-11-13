import { notFound } from "next/navigation";
import { isDemo } from "@/lib/supabase/demo";
import { tasterEndedLetter, tasterInviteLetter } from "@/lib/billing/pricing";

/** Rendered previews of the taster letters. Demo only. Nothing is sent. */
export default function Letters() {
  if (!isDemo()) notFound();
  const invite = tasterInviteLetter("Bloom Antiques", "https://thedealercentre.co.uk/taster?t=preview");
  const ended = tasterEndedLetter("Bloom Antiques", "https://thedealercentre.co.uk/signup?as=dealer");
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10">
      <h1 className="text-[28px] font-bold">Letters, not sent</h1>
      {[invite, ended].map((letter) => (
        <article key={letter.subject} className="card p-6">
          <p className="text-[12px] font-semibold text-ink-muted">Subject</p>
          <h2 className="text-[20px] font-semibold">{letter.subject}</h2>
          <pre className="mt-4 whitespace-pre-wrap font-sans text-[15px] leading-7">{letter.text}</pre>
        </article>
      ))}
    </main>
  );
}
