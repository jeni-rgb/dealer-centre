"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { PASSWORD_COPY, type PasswordKind } from "@/lib/password";
import { SetPassword } from "@/app/account/set-password";

/** Once per sign in. Dismiss hides it until the next sign in. A temporary password cannot be dismissed. */
export function PasswordPrompt({ kind }: { kind: PasswordKind }) {
  const path = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const [stamp, setStamp] = useState("session");
  useEffect(() => {
    let cancel = false;
    (async () => {
      let mark = "session";
      try {
        const { data } = await supabaseBrowser().auth.getSession();
        mark = data.session?.user.last_sign_in_at || "session";
      } catch { /* show the prompt */ }
      if (cancel) return;
      setStamp(mark);
      if (kind === "missing" && sessionStorage.getItem(`pw-skip-${mark}`)) return;
      setOpen(true);
    })();
    return () => { cancel = true; };
  }, [kind]);
  if (!kind || !open) return null;
  if (path.startsWith("/signup") || path.startsWith("/account") || path.startsWith("/centre/welcome") || path.startsWith("/run")) return null;
  const temp = kind === "temp";
  return (
    <div className="mb-4 rounded-[14px] border border-border bg-white p-4">
      <h2 className="text-[16px] font-semibold">{PASSWORD_COPY.title}</h2>
      <p className="mt-1 text-[14px] text-ink-muted">{temp ? PASSWORD_COPY.temp : PASSWORD_COPY.missing}</p>
      <SetPassword onSaved={() => setOpen(false)} />
      {!temp && <button type="button" className="mt-2 text-[14px] font-medium text-ink-muted" onClick={() => { sessionStorage.setItem(`pw-skip-${stamp}`, "1"); setOpen(false); }}>{PASSWORD_COPY.later}</button>}
    </div>
  );
}
