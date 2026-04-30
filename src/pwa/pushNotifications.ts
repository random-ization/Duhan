export type BrowserNotificationPermission = 'default' | 'denied' | 'granted';
export type PushPermissionState = BrowserNotificationPermission | 'unsupported';

function hasPushSupport() {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

async function getFirstServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!hasPushSupport()) return null;
  const registrations = await navigator.serviceWorker.getRegistrations();
  return registrations[0] ?? null;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function getPushPermissionState(): PushPermissionState {
  if (!hasPushSupport()) return 'unsupported';
  return Notification.permission;
}

export async function requestPushPermission(): Promise<PushPermissionState> {
  if (!hasPushSupport()) return 'unsupported';
  const result = await Notification.requestPermission();
  return result;
}

export async function ensurePushSubscription(vapidPublicKey: string): Promise<PushSubscription | null> {
  if (!hasPushSupport()) return null;
  if (!vapidPublicKey.trim()) return null;

  const registration = await getFirstServiceWorkerRegistration();
  if (!registration) return null;
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });
  return subscription;
}

export async function unsubscribeCurrentPushSubscription(): Promise<void> {
  if (!hasPushSupport()) return;
  const registration = await getFirstServiceWorkerRegistration();
  if (!registration) return;
  const existing = await registration.pushManager.getSubscription();
  if (!existing) return;
  await existing.unsubscribe();
}

export async function hasPushRegistration(): Promise<boolean> {
  const registration = await getFirstServiceWorkerRegistration();
  return Boolean(registration);
}
