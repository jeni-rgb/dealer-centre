import { randomBytes } from "crypto";
import type { Admin } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { pushToDealer } from "@/lib/push/send";
import { LABEL_PENCE, TASTER_DAYS, TASTER_FREE_LABELS, tasterEndedPush } from "@/lib/billing/pricing";
import { sendBranded } from "@/lib/email/send";
import { tasterEndedLetter, tasterInviteLetter } from "@/lib/email/letters";

export { LABEL_PENCE, TASTER_DAYS, TASTER_FREE_LABELS };

const DAY = 86400000;

export function newTasterToken(): string {
  return randomBytes(18).toString("hex");
}

export function tasterLink(token: string): string {
  return `${env.appUrl()}/taster?t=${token}`;
}

async function centreName(db: Admin, dealerId: string): Promise<string> {
  const { data } = await db.from("dealer_centres").select("centres(name)").eq("dealer_id", dealerId).is("left_at", null).limit(1);
  const row = data?.[0] as { centres?: { name?: string } | null } | undefined;
  return row?.centres?.name || "your centre";
}

/** Create the invite token. Email it when we have an address. Always return the link so staff can text or print it. */
export async function inviteBasicDealer(db: Admin, dealerId: string, name: string, email: string | null): Promise<{ link: string; emailed: "sent" | "skipped" | "failed" }> {
  const token = newTasterToken();
  const link = tasterLink(token);
  const now = new Date().toISOString();
  await db.from("dealers").update({
    billing_model: "basic",
    taster_token: token,
    taster_invite_sent_at: email ? now : null,
  }).eq("id", dealerId);
  const centre = await centreName(db, dealerId);
  const emailed = email ? await sendBranded([email], tasterInviteLetter(name, link, centre)) : "skipped";
  return { link, emailed };
}

async function grantFreeLabels(db: Admin, dealerId: string): Promise<void> {
  const session = `taster-${dealerId}`;
  const rpc = await db.rpc("apply_listing_tokens", { p_dealer_id: dealerId, p_delta: TASTER_FREE_LABELS, p_reason: "taster", p_session: session, p_item: null });
  if (rpc.error || rpc.data == null) {
    const purchase = await db.rpc("apply_listing_tokens", { p_dealer_id: dealerId, p_delta: TASTER_FREE_LABELS, p_reason: "purchase", p_session: session, p_item: null });
    if (purchase.error || purchase.data == null) {
      const { data } = await db.from("dealers").select("listing_tokens, listing_tokens_bought").eq("id", dealerId).maybeSingle();
      await db.from("dealers").update({
        listing_tokens: (data?.listing_tokens ?? 0) + TASTER_FREE_LABELS,
        listing_tokens_bought: (data?.listing_tokens_bought ?? 0) + TASTER_FREE_LABELS,
      }).eq("id", dealerId);
    }
  }
  await db.from("dealers").update({ listing_mode: "staff" }).eq("id", dealerId);
}

/** Dealer said yes, or staff recorded a yes. Starts the 14 day clock and the 25 free labels. Does not charge. */
export async function startTaster(db: Admin, dealerId: string): Promise<{ until: string; already: boolean }> {
  const { data: dealer } = await db.from("dealers").select("id, name, taster_accepted_at, taster_ends_at, billing_model").eq("id", dealerId).maybeSingle();
  if (!dealer) throw new Error("Dealer not found");
  if (dealer.billing_model === "full") throw new Error("This dealer is already on Full.");
  if (dealer.taster_accepted_at && dealer.taster_ends_at && new Date(dealer.taster_ends_at).getTime() > Date.now()) {
    return { until: dealer.taster_ends_at, already: true };
  }
  const until = new Date(Date.now() + TASTER_DAYS * DAY).toISOString();
  const { error } = await db.from("dealers").update({
    billing_model: "taster",
    taster_accepted_at: new Date().toISOString(),
    taster_ends_at: until,
    taster_ended_notified_at: null,
    plan: "trial",
    monthly_sold_limit: 100000,
  }).eq("id", dealerId);
  if (error) throw new Error(error.message);
  await grantFreeLabels(db, dealerId);
  return { until, already: false };
}

export async function acceptTasterToken(db: Admin, token: string): Promise<{ name: string; until: string; already: boolean }> {
  const { data: dealer } = await db.from("dealers").select("id, name").eq("taster_token", token).maybeSingle();
  if (!dealer) throw new Error("That link has expired. Ask your centre for a new one.");
  const started = await startTaster(db, dealer.id);
  return { name: dealer.name, until: started.until, already: started.already };
}

/** Day 14: tell dealers their named sales have ended, and offer Full. Idempotent. */
export async function notifyEndedTasters(db: Admin): Promise<{ notified: number }> {
  const now = new Date().toISOString();
  const { data, error } = await db.from("dealers").select("id, name, contact_email, billing_model, taster_ends_at, taster_ended_notified_at").eq("billing_model", "taster").lt("taster_ends_at", now).is("taster_ended_notified_at", null);
  if (error || !data) return { notified: 0 };
  let notified = 0;
  const joinUrl = `${env.appUrl()}/signup?as=dealer`;
  for (const d of data) {
    await db.from("dealers").update({ billing_model: "basic", taster_ended_notified_at: now }).eq("id", d.id);
    const { data: users } = await db.from("users").select("email").eq("dealer_id", d.id);
    const emails = [...new Set([...(users ?? []).map((u) => u.email), d.contact_email].filter((e): e is string => !!e))];
    const centre = await centreName(db, d.id);
    await sendBranded(emails, tasterEndedLetter(d.name, joinUrl, centre));
    const push = tasterEndedPush();
    await pushToDealer(db, d.id, { title: push.title, body: push.body, url: "/signup?as=dealer", tag: `taster-end-${d.id}` }).catch(() => undefined);
    notified++;
  }
  return { notified };
}
