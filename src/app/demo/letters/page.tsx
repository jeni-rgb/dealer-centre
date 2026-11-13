import { notFound } from "next/navigation";
import { isDemo } from "@/lib/supabase/demo";
import { missingLetter, saleLetter, signInLetter, statementLetter, tasterEndedLetter, tasterInviteLetter, welcomeLetter } from "@/lib/email/letters";

/** Rendered previews. Demo only. Nothing is sent. */
export default function Letters() {
  if (!isDemo()) notFound();
  const letters = [
    ["invite", tasterInviteLetter("Bloom Antiques", "https://thedealercentre.co.uk/taster?t=preview", "Looses Emporium")],
    ["ended", tasterEndedLetter("Bloom Antiques", "https://thedealercentre.co.uk/signup?as=dealer", "Looses Emporium")],
    ["sale", saleLetter({ title: "Oak coffer", amount: "£395", ticket: "B14 0362", place: "at Looses Emporium", when: "14:05", href: "https://thedealercentre.co.uk/app", centreName: "Looses Emporium" })],
    ["statement", statementLetter({ dealerName: "Bloom Antiques", centreName: "Looses Emporium", period: "November 2026", net: "£640", sales: 4, href: "https://thedealercentre.co.uk/app/statements" })],
    ["welcome", welcomeLetter({ dealerName: "Bloom Antiques", addedBy: "jeni@thedealercentre.co.uk", href: "https://thedealercentre.co.uk/signin" })],
    ["missing", missingLetter({ title: "Oak coffer", ticket: "B14 0362", amount: "£395", centreName: "Looses Emporium" })],
    ["signin", signInLetter("https://thedealercentre.co.uk/signin")],
  ] as const;
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-10">
      <h1 className="text-[28px] font-bold">Letters, not sent</h1>
      {letters.map(([id, letter]) => (
        <article key={id} id={id} className="flex flex-col gap-2">
          <h2 className="text-[16px] font-semibold">{letter.subject}</h2>
          <iframe title={letter.subject} className="h-[820px] w-full rounded-[16px] border border-border bg-white" srcDoc={letter.html} />
        </article>
      ))}
    </main>
  );
}
