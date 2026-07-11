// biome-ignore-all lint/correctness/noUndeclaredVariables: firebase / importScripts は SW context の global
// biome-ignore-all lint/correctness/noUnusedFunctionParameters: onBackgroundMessage の signature は Firebase 規定

importScripts('https://www.gstatic.com/firebasejs/12.16.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.16.0/firebase-messaging-compat.js');

// SDK バージョンは package.json の firebase と揃えて更新すること。
// Firebase Web SDK config は公開情報のためハードコード (全環境で同一プロジェクト共用)。
firebase.initializeApp({
  apiKey: 'AIzaSyBCXP11xRioE8cT8z_Uz-sBE6Rae5qO0zY',
  authDomain: 'tabi-share-8ef6b.firebaseapp.com',
  projectId: 'tabi-share-8ef6b',
  storageBucket: 'tabi-share-8ef6b.firebasestorage.app',
  messagingSenderId: '398057900448',
  appId: '1:398057900448:web:8236ebc8ad1849b59c3cc5',
});

// payload.notification が入っていれば Firebase が OS 通知を自動表示する。ここでは追加処理なし。
firebase.messaging().onBackgroundMessage(_payload => {
  // no-op
});
