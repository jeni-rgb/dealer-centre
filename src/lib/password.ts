/** Whether this sign in should ask for a password. temp_password means they must choose their own. */

export type PasswordKind = "temp" | "missing" | null;

export function passwordKind(
  meta: { password_set?: boolean; temp_password?: boolean } | null | undefined,
  amr?: { method?: string }[] | null,
): PasswordKind {
  if (meta?.temp_password === true) return "temp";
  if (meta?.password_set === true) return null;
  if (amr?.some((a) => a.method === "password")) return null;
  return "missing";
}

export function passwordIssue(password: string, confirm: string): string | null {
  if (password.length < 8) return "Use at least 8 characters.";
  if (password !== confirm) return "Those passwords do not match.";
  return null;
}

export const PASSWORD_COPY = {
  title: "Set a password",
  temp: "Choose your own password. You will use it next time you sign in.",
  missing: "Sign in with your email and a password next time.",
  later: "Not now",
  save: "Save password",
  saved: "Password saved. Next time, sign in with your email and this password.",
  show: "Show",
  hide: "Hide",
  signInLead: "Email and password.",
  emailLink: "Email me a sign in link",
  forgot: "Forgot password?",
  usePassword: "Use your password",
  sendLink: "Send sign in link",
  linkSent: "Check your email for a sign in link.",
  forgotSent: "Check your email. Open the link to set a new password.",
  needEmail: "Type your email first.",
  badPassword: "That email or password is not right.",
  change: "Change password",
};
