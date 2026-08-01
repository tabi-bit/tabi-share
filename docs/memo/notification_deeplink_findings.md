# 通知タップ deep link 実機検証で判明した仕様 (Issue #207)

> 本メモは検証ブランチ `chore/issue207_debug-logger` (PR #216 / DO NOT MERGE)
> で Android PWA 実機を使って一連の切り分けを行った結果、**検証で確定した仕様**
> のみを記録する。実装の意思決定は #209 の commit / PR description に残す。

## FCM SW の update lifecycle

- **FCM SW は root scope 外 (`/firebase-cloud-messaging-push-scope`) に登録される**ため、navigation 由来の SW update check が発火しない
- `navigator.serviceWorker.register()` の byte-diff check は PWA セッション中 1 回のみ (呼び出し側の promise cache により再呼び出しされない)
- **明示 `registration.update()` が唯一の SW 更新経路**
- SW default lifecycle だと new SW は install → waiting のまま、既存 client が全部閉じるまで activate されない
- install イベントで `self.skipWaiting()` を呼ぶと即 waiting をスキップして activate に遷移する
- activate イベントで `self.clients.claim()` を呼ぶと既存 client (root scope 含む) の controller にもなれる

## VitePWA precache との干渉

- `workbox.globPatterns: ['**/*.{js,...}']` は **firebase-messaging-sw.js を precache 対象に取り込む**
- 結果、Chrome の `register('/firebase-messaging-sw.js')` 時に VitePWA sw.js の fetch handler が cache 経由で古い版を返す → 新 SW が実機で永遠に active にならない
- **対策**: `workbox.globIgnores` + `navigateFallbackDenylist` で firebase-messaging-sw.js を除外

## FCM payload に載る deep link の位置

- Firebase Admin SDK v13 の `WebpushFCMOptions(link=...)` を指定して送ると、SDK v12.16 の client 側では **`data.FCM_MSG.notification.click_action`** に写された payload が届く
- foreground 通知 (`useForegroundNotificationToast` の自前 `showNotification`) 経由の場合は **`data.link`** に相対 URL が入る (別経路)
- extract 順は `click_action` を primary、`data.link` を fallback にする

## Firebase Hosting のデフォルト cache header

- 静的ファイルに `cache-control: max-age=3600` (1 時間) がデフォルトで付く
- **SW file にこれが効くと deploy 直後でも update が実機に届くまで最悪 1 時間遅延する**
- `firebase.json` の `headers` で `/firebase-messaging-sw.js` に `Cache-Control: no-cache, no-store, must-revalidate` を指定して抑制

## task-killed 状態からの通知タップ

- PWA を recents から swipe out した完全終了状態で通知タップすると、SW の `matchAll` は **0 件**を返す (phantom client を返さない)
- `clients.openWindow(url)` で PWA が起動し、**渡した URL が尊重されて focusBlock まで適用**される (Android Chrome 実機で確認)
- postMessage 未着ケース想定の Cache Storage safety net (SW → client の遅延伝達経路) は **不要**と確認された

## block DOM の描画タイミング

- `ViewTripLayout` は `useBlocks(pageId).isLoading` 中は `TimelineSkeleton` を返す構造 → 該当 page への `setSelectedPageId` 直後は `data-block-id` の DOM が未存在
- rAF ポーリングだと Skeleton → Timeline 差し替え待ちで空回りする → **MutationObserver で DOM 変更 event 単位に補足**
- staging Cold Start では Skeleton → Timeline 差し替えまで 3 秒を超えるケースがあり、**timeout は 8 秒**確保する
