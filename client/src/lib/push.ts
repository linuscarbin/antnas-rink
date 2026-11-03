// Browser-side helpers for Web Push + PWA install state.

export function isIos(): boolean {
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

export function isAndroid(): boolean {
  return /android/i.test(navigator.userAgent);
}

/** True when running as an installed app (home screen). */
export function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function pushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function registration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing) return existing;
  await navigator.serviceWorker.register("/sw.js");
  return navigator.serviceWorker.ready;
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration("/");
  return (await reg?.pushManager.getSubscription()) ?? null;
}

/** Asks for permission (if needed) and returns a browser push subscription. */
export async function ensureSubscription(vapidPublicKey: string): Promise<PushSubscription> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error(
      permission === "denied"
        ? "Notiser är blockerade för den här sidan. Tillåt dem i telefonens inställningar."
        : "Du behöver tillåta notiser för att få dem."
    );
  }
  const reg = await registration();
  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;
  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
  });
}

export function subscriptionPayload(sub: PushSubscription) {
  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  return { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } };
}

/* ---- Android/Chrome install prompt ---- */

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<unknown> };
let deferredPrompt: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as InstallPromptEvent;
    listeners.forEach((l) => l());
  });
}

export function canPromptInstall(): boolean {
  return deferredPrompt !== null;
}

export function onInstallPromptChange(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export async function promptInstall(): Promise<void> {
  if (!deferredPrompt) return;
  await deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  listeners.forEach((l) => l());
}
