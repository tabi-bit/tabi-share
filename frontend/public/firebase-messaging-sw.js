// Firebase Cloud Messaging Service Worker
// このファイルは Vite の public/ からそのまま配信される (トランスパイルなし)。
// VitePWA が生成する /sw.js とは別 scope で動作する。

importScripts('https://www.gstatic.com/firebasejs/12.16.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.16.0/firebase-messaging-compat.js');

// Firebase Web SDK config は公開情報のため直接埋め込む (全環境で同一プロジェクト共用)
firebase.initializeApp({
  apiKey: 'AIzaSyBCXP11xRioE8cT8z_Uz-sBE6Rae5qO0zY',
  authDomain: 'tabi-share-8ef6b.firebaseapp.com',
  projectId: 'tabi-share-8ef6b',
  storageBucket: 'tabi-share-8ef6b.firebasestorage.app',
  messagingSenderId: '398057900448',
  appId: '1:398057900448:web:8236ebc8ad1849b59c3cc5',
});

const messaging = firebase.messaging();

// バックグラウンド受信時のカスタム処理。
// notification フィールドが FCM payload に含まれていれば、Firebase が自動で OS 通知を表示する。
// ここでは追加処理なし。
// eslint-disable-next-line no-unused-vars
messaging.onBackgroundMessage(_payload => {
  // no-op: FCM が payload.notification を元に自動表示する。
});
