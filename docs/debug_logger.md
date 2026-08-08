# 診断ロガー (Debug Logger)

Android PWA など DevTools の console が取れない環境で、実機の挙動を後から確認するための仕組み。
IndexedDB にログを貯め、画面上のボタンで一括コピーする。

## 有効化 / 無効化

有効化手段は 2 つある。どちらでも画面右下に **ログをコピー / ログを消去** パネルが出る。

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

同一の DB (`app-debug-log`) / store (`entries`) に書くので、client 側の「ログをコピー」で
SW のログもまとめて取得できる。

`debugLog` は IndexedDB の commit (`tx.oncomplete`) まで待って resolve する。SW から呼ぶ場合は
**返り値の Promise を必ず `event.waitUntil()` に載せること**。載せないと commit 前に worker が
終了してログが消える（診断が一番欲しい early return 経路ほど worker が早く止まる）。

## DEBUG_LOG_VERSION (build ID)

ビルドごとに変わるランダム ID (`randomUUID` の先頭 8 桁) が、client と SW の**両方に同じ値で**
埋め込まれ、ログの各行に載る。手動更新は不要。

```text
[2026-08-08T12:34:56.789Z] [faeba6fb] [SW] notificationclick | {...}
                            ^^^^^^^^ build ID
```

SW の更新は非同期でユーザー操作に依存するため、**client の行と SW の行で値がズレていれば
「古い SW が動いたまま」**と判別できる。これが実機診断で一番効く情報になる。

### 埋め込みの仕組み

| 対象 | 方法 |
| --- | --- |
| client | `vite.config.ts` の `define` で `__BUILD_ID__` を置換 |
| SW | `public/` は Vite が無変換でコピーするため `define` が効かない。`stampServiceWorkerBuildId` プラグインが build 時 (`closeBundle`) と dev 配信時 (middleware) に `__BUILD_ID__` トークンを置換する |

ID はビルド単位で変わるので、同一コミットを再ビルドすると別の値になる。コミットとの対応を
取りたい場合は `vite.config.ts` の `BUILD_ID` を git SHA に差し替えればよい（1行）。
