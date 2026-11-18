"use client";
import { useRouter } from "next/navigation";
import { SetPassword } from "@/app/account/set-password";

/** After a password is saved, stay on this onboarding page so the next step can render. */
export function PasswordContinue() {
  const router = useRouter();
  return <SetPassword onSaved={() => router.refresh()} />;
}
