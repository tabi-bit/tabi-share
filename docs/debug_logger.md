# 診断ロガー (Debug Logger)

Android PWA など DevTools の console が取れない環境で、実機の挙動を後から確認するための仕組み。
IndexedDB にログを貯め、画面上のボタンで一括コピーする。

## 有効化 / 無効化

有効化手段は 2 つある。どちらでも画面右下に **Copy Logs / Clear** パネルが出る。

### 1. ロゴを 7 回連打

ヘッダーの「たびしぇあ」ロゴを **0.8 秒以内の間隔で 7 回**タップすると ON / OFF が切り替わる
（Android の開発者オプションと同じ方式）。残り 3 回からトーストで回数を案内する。

**PWA / 実機ではこちらを使う。** URL に query を足せない環境でもその場で有効化できる。
ロゴは本来ホームへのリンクなので、トップ以外のページで始めると 1 回目でホームに遷移する。
そのまま連打を続ければ成立する。

### 2. URL の query

| 操作 | URL |
| --- | --- |
| 有効化 | `https://.../?debug=1` |
| 無効化 | `https://.../?debug=0` |

いずれの手段でも状態は localStorage (`__app_debug_panel__`) に永続化されるため、以降は
query 無しでも表示され続ける。

環境による分岐は無く、production でも同じ手順で有効化できる（URL を案内しない限り一般ユーザーには見えない）。

## API

`@/lib/debugLogger`

```ts
debugLog(tag: string, message: string, data?: unknown): Promise<void>
readAllLogs(): Promise<string>   // `[ts] [version] [tag] message | data` 形式
clearAllLogs(): Promise<void>
```

- 任意のタグで書ける汎用 API。認証の race、SWR 挙動、offline 復帰など FCM 以外の診断にも使う
- **logger は throw しない**。IndexedDB が使えない環境では黙って no-op になる
- ring buffer で最大 500 件。超過分は古い順に削除される

## Service Worker から書く場合

`frontend/public/firebase-messaging-sw.js` に**同じロジックを inline で duplicate** している。
SW は `importScripts` で firebase compat SDK を読む都合上 ES module import が使えないため、
共通モジュール化には build 側の設定が必要になる。duplicate 運用を継続する。

同一の DB (`app-debug-log`) / store (`entries`) に書くので、client 側の Copy Logs で
SW のログもまとめて取得できる。

## DEBUG_LOG_VERSION

client (`v01-cl`) と SW (`v01-sw`) にそれぞれハードコードされた定数で、ログの各行に埋め込まれる。
**診断コードを修正したら手動で bump する**。

SW の更新は非同期でユーザー操作に依存するため、共有されたログを見たときに「client は新しいが
SW は古い版が動いている」といったズレを判別するのが目的。client と SW で別採番でよい。
