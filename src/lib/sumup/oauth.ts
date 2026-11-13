import { env } from "@/lib/env";

const AUTH = "https://api.sumup.com/authorize";
const TOKEN = "https://api.sumup.com/token";

export function sumupRedirect(origin: string): string {
  return `${origin}/api/oauth/sumup/callback`;
}

export function sumupAuthorizeUrl(state: string, origin: string): string {
  const q = new URLSearchParams({
    response_type: "code",
    client_id: env.sumup.clientId(),
    redirect_uri: sumupRedirect(origin),
    scope: "transactions.history",
    state,
  });
  return `${AUTH}?${q.toString()}`;
}

export type SumupToken = { access_token: string; refresh_token?: string; expires_in?: number };

export async function exchangeSumupCode(code: string, origin: string): Promise<SumupToken> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: sumupRedirect(origin),
    client_id: env.sumup.clientId(),
    client_secret: env.sumup.clientSecret(),
  });
  const r = await fetch(TOKEN, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
  if (!r.ok) throw new Error("SumUp did not accept the code");
  return r.json();
}

export async function refreshSumup(refreshToken: string): Promise<SumupToken> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: env.sumup.clientId(),
    client_secret: env.sumup.clientSecret(),
  });
  const r = await fetch(TOKEN, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
  if (!r.ok) throw new Error("SumUp did not refresh");
  return r.json();
}
