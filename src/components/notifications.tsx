"use client";
import { useEffect, useState } from "react";

type State = "unsupported" | "install" | "off" | "on" | "denied" | "busy";

/**
 * "Turn on notifications" card. Web push in the browser or home screen app today;
 * inside the native app (Capacitor) it registers the device token instead.
 */
export function NotificationsCard({ vapidPublicKey }: { vapidPublicKey: string | null }) {
  const [state, setState] = useState<State>("busy");
  const [native, setNative] = useState(false);

  useEffect(() => {
    (async () => {
      const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
      if (cap?.isNativePlatform?.()) { setNative(true); setState(localStorage.getItem("dc_push") === "on" ? "on" : "off"); return; }
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !vapidPublicKey) {
        // iPhone Safari only allows push once the app is on the home screen
        const ios = /iPhone|iPad/.test(navigator.userAgent) && !(window.matchMedia("(display-mode: standalone)").matches);
        setState(ios ? "install" : "unsupported"); return;
      }
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, [vapidPublicKey]);

  async function turnOn() {
    setState("busy");
    try {
      if (native) {
        const { PushNotifications } = await import("@capacitor/push-notifications");
        const perm = await PushNotifications.requestPermissions();
        if (perm.receive !== "granted") return setState("denied");
        await new Promise<void>((resolve, reject) => {
          PushNotifications.addListener("registration", async (t) => {
            const ua = navigator.userAgent;
            await fetch("/api/push", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: /iPhone|iPad/.test(ua) ? "ios" : "android", endpoint: t.value }) });
            resolve();
          });
          PushNotifications.addListener("registrationError", (e) => reject(e));
          PushNotifications.register();
        });
        localStorage.setItem("dc_push", "on"); setState("on"); return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidPublicKey!) });
      const j = sub.toJSON();
      const r = await fetch("/api/push", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "web", endpoint: sub.endpoint, keys: j.keys }) });
      if (!r.ok) throw new Error("register failed");
      setState("on");
      await fetch("/api/push", { method: "PUT" });
    } catch (e) {
      setState(Notification.permission === "denied" ? "denied" : "off");
      console.error(e);
    }
  }

  if (state === "on" || state === "unsupported" || state === "busy") return null;
  return (
    <div className="card flex items-center justify-between gap-3 p-4 text-[14px]">
      <span className="flex flex-col">
        <span className="font-medium">{state === "install" ? "Add to your home screen for notifications" : state === "denied" ? "Notifications are blocked" : "Hear the moment something sells"}</span>
        <span className="text-[12px] text-ink-muted">{state === "install" ? "Share button, then Add to Home Screen. Open it from there and tap Turn on." : state === "denied" ? "Allow notifications for this site in your phone settings, then come back." : "A buzz on this phone for every sale, floor or online."}</span>
      </span>
      {state === "off" && <button className="btn-sm shrink-0" onClick={turnOn}>Turn on</button>}
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}
