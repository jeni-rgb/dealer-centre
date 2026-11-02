import webpush from "web-push";
import type { Admin } from "@/lib/supabase/server";

export type PushMessage = { title: string; body: string; url?: string; tag?: string };

/**
 * Send a push to every device a dealer has turned notifications on in.
 * Web push works today (Safari on iPhone from the home screen, Chrome, Android).
 * Native tokens (ios/android, from the Capacitor app) are sent via Firebase when FCM_SERVICE_ACCOUNT is set.
 */
export async function pushToDealer(db: Admin, dealerId: string, msg: PushMessage) {
  const { data: subs } = await db.from("push_subscriptions").select("id, kind, endpoint, keys").eq("dealer_id", dealerId).is("failed_at", null);
  if (!subs?.length) return { sent: 0 };
  let sent = 0;
  const pub = process.env.VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (pub && priv) webpush.setVapidDetails("mailto:hello@thedealercentre.co.uk", pub, priv);

  for (const s of subs) {
    try {
      if (s.kind === "web") {
        if (!pub || !priv) continue;
        await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys as { p256dh: string; auth: string } }, JSON.stringify(msg), { TTL: 60 * 60 * 6 });
      } else {
        await sendFcm(s.endpoint, msg);
      }
      sent++;
      await db.from("push_subscriptions").update({ last_used_at: new Date().toISOString() }).eq("id", s.id);
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      // 404/410: the browser dropped the subscription. Stop trying it.
      if (status === 404 || status === 410) await db.from("push_subscriptions").update({ failed_at: new Date().toISOString() }).eq("id", s.id);
      else console.error("[push]", s.kind, status ?? e);
    }
  }
  return { sent };
}

/** Firebase Cloud Messaging HTTP v1, used for the native apps. Needs a service account JSON in FCM_SERVICE_ACCOUNT. */
async function sendFcm(token: string, msg: PushMessage) {
  const raw = process.env.FCM_SERVICE_ACCOUNT;
  if (!raw) return;
  const sa = JSON.parse(raw) as { project_id: string; client_email: string; private_key: string };
  const jwt = await googleJwt(sa);
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
    method: "POST", headers: { authorization: `Bearer ${jwt}`, "content-type": "application/json" },
    body: JSON.stringify({ message: { token, notification: { title: msg.title, body: msg.body }, data: { url: msg.url ?? "/app" }, apns: { payload: { aps: { sound: "default" } } }, android: { priority: "high" } } }),
  });
  if (!res.ok) { const err = new Error(await res.text()) as Error & { statusCode?: number }; err.statusCode = res.status === 404 ? 410 : res.status; throw err; }
}

async function googleJwt(sa: { client_email: string; private_key: string }) {
  const { createSign } = await import("node:crypto");
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/firebase.messaging", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 })}`;
  const sig = createSign("RSA-SHA256").update(unsigned).sign(sa.private_key, "base64url");
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${unsigned}.${sig}` });
  const j = (await r.json()) as { access_token: string };
  return j.access_token;
}
