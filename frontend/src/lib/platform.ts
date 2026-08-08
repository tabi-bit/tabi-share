export const isIOS = (): boolean => {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
};

export const isPWAInstalled = (): boolean => {
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  if (window.matchMedia('(display-mode: fullscreen)').matches) return true;
  // iOS Safari の legacy フラグ。matchMedia が false を返すエッジケースの safety net。
  const nav = navigator as { standalone?: boolean };
  return nav.standalone === true;
};

export const needsIOSInstallForNotification = (): boolean => {
  return isIOS() && !isPWAInstalled();
};

export const isNotificationSupported = (): boolean => {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
};

/** iOS Safari のタブは Notification / PushManager 未露出だが、install すれば購読できるのでボタンは出す */
export const shouldShowNotificationButton = (): boolean => {
  return isNotificationSupported() || needsIOSInstallForNotification();
};
