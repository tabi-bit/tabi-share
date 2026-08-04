import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { getFirebaseApp } from './firebase';

const FCM_SW_URL = '/firebase-messaging-sw.js';

let swRegistrationPromise: Promise<ServiceWorkerRegistration> | null = null;

// register() は installing 状態でも即 resolve するが、PushManager.subscribe() は active な
// SW を要求するため、activated まで待ってから返す。
const waitForActive = async (registration: ServiceWorkerRegistration): Promise<ServiceWorkerRegistration> => {
  if (registration.active) return registration;
  const worker = registration.installing ?? registration.waiting;
  if (!worker) return registration;
  await new Promise<void>(resolve => {
    const onStateChange = () => {
      if (worker.state === 'activated') {
        worker.removeEventListener('statechange', onStateChange);
        resolve();
      }
    };
    worker.addEventListener('statechange', onStateChange);
  });
  return registration;
};

const registerFcmSw = async (): Promise<ServiceWorkerRegistration> => {
  if (swRegistrationPromise !== null) return swRegistrationPromise;

  const registrationPromise = navigator.serviceWorker
    .register(FCM_SW_URL, { scope: '/firebase-cloud-messaging-push-scope' })
    .then(waitForActive);
  swRegistrationPromise = registrationPromise;
  try {
    return await registrationPromise;
  } catch (error) {
    // 失敗した Promise を cache に残すと以降ずっと失敗結果を返してしまうので null に戻して次回再登録できるようにする
    if (swRegistrationPromise === registrationPromise) swRegistrationPromise = null;
    throw error;
  }
};

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!(await isSupported())) return 'denied';
  return Notification.requestPermission();
};

export const fetchFcmToken = async (): Promise<string | null> => {
  if (!(await isSupported())) return null;

  const registration = await registerFcmSw();
  const messaging = getMessaging(getFirebaseApp());

  return getToken(messaging, {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
};

export type ForegroundNotificationHandler = (payload: {
  tripId?: string;
  urlId?: string;
  blockId?: string;
  title?: string;
  body?: string;
}) => void;

const noopUnsubscribe = (): void => undefined;

export const subscribeForegroundMessages = async (handler: ForegroundNotificationHandler): Promise<() => void> => {
  if (!(await isSupported())) return noopUnsubscribe;

  const messaging = getMessaging(getFirebaseApp());
  return onMessage(messaging, message => {
    handler({
      tripId: message.data?.tripId,
      urlId: message.data?.urlId,
      blockId: message.data?.blockId,
      title: message.notification?.title,
      body: message.notification?.body,
    });
  });
};
