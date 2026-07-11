# Firebase / GCP セットアップ手順 (通知機能)

> **注意**: 本ドキュメントは Issue #148 の通知機能実装に必要な Firebase / GCP 側の設定作業を記録した検討メモです。実装の一次情報ではないため、実装時は必ずソースコードと実際のコンソール状態を正としてください。

関連: [notification_design.md](./notification_design.md)

## 1. Firebase / GCP プロジェクト

**プロジェクト ID**: `tabi-share-8ef6b` (Firebase と GCP で同一)

Firebase Hosting プロジェクトを Cloud Messaging と共用する。

- Cloud Messaging (FCM) を有効化: **Firebase コンソール > プロジェクト設定 > Cloud Messaging** タブ

**既存 Cloud Run 構成** (`deploy-backend.yml` 参照):

| 環境 | Cloud Run サービス名 | Runtime SA (共用) |
|---|---|---|
| staging | `tabi-share-api-staging` | `tabi-share-api-runtime@tabi-share-8ef6b.iam.gserviceaccount.com` |
| production | `tabi-share-api-prod` | 同上 |

Region: `asia-northeast1`

## 2. Web Push 用 VAPID 鍵

Firebase コンソール上で生成:

- **Firebase コンソール > プロジェクト設定 > Cloud Messaging > Web configuration > 「Web プッシュ証明書」**
- 「Generate key pair」で VAPID 鍵ペア生成
- 生成された **公開鍵**をコピー

### フロントに渡す

- 環境変数 `VITE_FIREBASE_VAPID_KEY` (dotenvx で管理)
- 各環境ファイル `.env`, `.env.stg`, `.env.prod` に設定
- クライアント側で `getToken(messaging, { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY, ... })` に渡す

## 3. Firebase Web SDK 設定 (フロント用)

Firebase コンソール > プロジェクト設定 > 「マイアプリ」 > Web アプリ設定から以下を取得:

- `apiKey`
- `authDomain`
- `projectId`
- `messagingSenderId`
- `appId`

全て公開情報なので `.env*` に平文で OK (client bundle に含まれる)。

環境変数命名例:
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_VAPID_KEY=...
```

## 4. Cloud Run → FCM Admin SDK (ADC 方式)

**方針**: SA JSON ファイルを発行せず、Cloud Run の実行 SA に IAM 権限を直接付与して Application Default Credentials (ADC) 経由で FCM を送信する。

### 4.1 既存の Runtime SA を再利用

既存の `tabi-share-api-runtime@tabi-share-8ef6b.iam.gserviceaccount.com` (deploy-backend.yml 参照) にFirebase Cloud Messaging 権限を追加。

### 4.2 IAM 権限付与コマンド

```bash
GCP_PROJECT_ID="tabi-share-8ef6b"

gcloud projects add-iam-policy-binding "${GCP_PROJECT_ID}" \
  --member="serviceAccount:tabi-share-api-runtime@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/firebasecloudmessaging.admin"
```

**GCP Console UI で実施する場合:**
- https://console.cloud.google.com/iam-admin/iam?project=tabi-share-8ef6b
- `tabi-share-api-runtime@...` 行の編集アイコン
- 「別のロールを追加」→ `Firebase Cloud Messaging API Admin` (`roles/firebasecloudmessaging.admin`)

### 4.3 ADC の仕組み

- **Cloud Run 上**: runtime SA の権限で自動的に認証される (何も設定しない)
- **Local 開発**: 後述の「Local での挙動」を参照
- `firebase_admin.initialize_app()` を **引数なし** で呼ぶだけで OK

**メリット**:
- SA JSON ファイルが存在しない (漏洩リスク・ローテーション不要)
- Secret Manager 経由の JSON 保管も不要
- IAM 一元管理でシンプル

## 5. Cloud Scheduler ジョブ

- **ジョブ名**: `notify-tick-prod` / `notify-tick-stg` など環境ごと
- **頻度**: `* * * * *` (1 分毎)
- **タイムゾーン**: UTC で OK (block start_time は UTC 保持)
- **ターゲット**: HTTP
- **URL**: `https://<cloud-run-domain>/internal/notify/tick`
- **HTTP method**: POST
- **Auth**: OIDC トークン、audience = Cloud Run サービス URL
- **リトライ**: デフォルト (5 回)

無料枠: 月 3 ジョブまで無料。本番/ステージング分けても余裕。

### Cloud Scheduler 用 Service Account

Cloud Scheduler ジョブ用に **専用 SA** を新規作成。Cloud Run 側でこの SA が発行した OIDC トークンをアプリケーションレベルで検証する。

```bash
GCP_PROJECT_ID="tabi-share-8ef6b"

gcloud iam service-accounts create tabi-share-notify-scheduler \
  --project="${GCP_PROJECT_ID}" \
  --display-name="Cloud Scheduler for notification tick"
```

**Cloud Run 側の認証設計**:
- 既存の Cloud Run は `--allow-unauthenticated` 済みなので Cloud Run レベルでは認証不要
- `/internal/notify/tick` は **アプリケーションレベルで OIDC トークン検証** (エンドポイント固有のミドルウェア)
- 検証内容:
  - Google 公開鍵で署名検証
  - `audience` == Cloud Run サービス URL
  - `email` == `tabi-share-notify-scheduler@${GCP_PROJECT_ID}.iam.gserviceaccount.com`
  - `iss` == `https://accounts.google.com`

## 6. Cloud Run サービスの環境変数一覧

通知機能で追加する環境変数 (deploy-backend.yml の `flags` に追加):

```
NOTIFICATIONS_ENABLED=true                                     # 送信有効化フラグ
NOTIFY_TICK_ALLOWED_AUDIENCE=<Cloud Run サービス URL>           # OIDC audience 検証
NOTIFY_TICK_ALLOWED_SA_EMAIL=tabi-share-notify-scheduler@tabi-share-8ef6b.iam.gserviceaccount.com
```

**注**: `FIREBASE_ADMIN_CREDENTIALS_JSON` は **ADC 方式のため不要**。

## 7. Firebase Messaging Web SDK (フロント側インストール)

```bash
cd frontend
pnpm add firebase
```

- `firebase-messaging-sw.js` を `frontend/public/` 配下に配置
  - VitePWA が生成する SW (`sw.js`) とは別
  - Firebase 公式の template を使用: `importScripts('https://www.gstatic.com/firebasejs/.../firebase-app-compat.js')` + `firebase-messaging-compat.js`
  - `messaging.onBackgroundMessage()` でバックグラウンド受信処理

### 7.1 SW ファイルの Firebase SDK バージョン管理

`firebase-messaging-sw.js` は `public/` にプレーン JS として置く。バンドラを通らないため、`importScripts` で参照する Firebase SDK バージョンは **URL にハードコード**される (例: `https://www.gstatic.com/firebasejs/12.16.0/firebase-app-compat.js`)。

**運用注意**:
- `package.json` の `firebase` を更新した際は、**同じバージョン番号を SW ファイルの `importScripts` URL にも反映**すること
- 齟齬があると SW とアプリで異なるバージョンの SDK が動く可能性がある (機能的には問題ないケースも多いが、予期しない挙動を避けるため揃える)
- バージョンは Firebase 公式の compat ビルド URL (`www.gstatic.com/firebasejs/<version>/firebase-*-compat.js`) を参照

## 8. FCM Admin SDK (Python) - ADC 方式

```bash
cd server
uv add firebase-admin
```

初期化 (**引数なし**):
```python
import firebase_admin
from firebase_admin import messaging

firebase_admin.initialize_app()  # ADC 自動検出

# 送信
message = messaging.Message(
    notification=messaging.Notification(title="next 12:00", body="..."),
    data={"blockId": "...", "urlId": "..."},
    token=fcm_token,
    webpush=messaging.WebpushConfig(
        headers={"Urgency": "high", "TTL": "300"}
    ),
)
messaging.send(message)
```

### 8.1 Local 環境での挙動

Cloud Run 上では runtime SA が自動で使われるが、**ローカルには runtime SA の権限がない**。

**MVP 方針: Feature flag で無効化 (デフォルト)**

- `NOTIFICATIONS_ENABLED=false` を `.env` (local 用) に設定
- サーバコード側で分岐: false なら `messaging.send()` を呼ばず `log.info()` のみ
- pytest では `firebase_admin.messaging.send` をモック化

```python
# server/app/cruds/notification.py
async def send_fcm(payload):
    if not settings.notifications_enabled:
        log.info("FCM send skipped (disabled locally)", ...)
        return
    messaging.send(payload)
```

**ローカルで実 FCM 送信を試したい場合 (オプトイン)**:

```bash
# ユーザ credentials で ADC を確立
gcloud auth application-default login

# ユーザ自身に Firebase Cloud Messaging Admin 権限を IAM で一時付与
# (テスト後は必ず外す)

# .env に NOTIFICATIONS_ENABLED=true を設定
pnpm dotenvx set NOTIFICATIONS_ENABLED true -f .env
```

## 9. Android バッジ (モノクロ)

- Android 通知シェード用のモノクロシルエット PNG が必要
- サイズ: 96x96 (推奨)
- 白いシルエット + 透明背景
- 既存ロゴから生成、`frontend/public/icons/badge-72x72.png` などに配置
- Web Push 通知 payload で `icon` + `badge` を指定

## 10. デプロイ順序 (推奨)

### 10.1 stg 環境立ち上げ

1. Firebase コンソールで FCM 有効化 & VAPID 鍵生成
2. **`tabi-share-api-runtime` SA に `roles/firebasecloudmessaging.admin` を IAM 付与** (ADC 方式)
3. **Cloud Scheduler 用 SA (`tabi-share-notify-scheduler`) を新規作成**
4. `.env*` の環境変数追加 (VITE_FIREBASE_*, NOTIFICATIONS_ENABLED 等)、`.env.stg` から先に検証
5. DB マイグレーション (`device_subscriptions`, `sent_notifications`, blocks.start_time index)
6. Backend: 購読 API + tick エンドポイント (OIDC 検証込み) 実装 & staging デプロイ
7. **staging 用 Cloud Scheduler ジョブ作成** (`notify-tick-stg`) — target: `https://tabi-share-api-staging-*.run.app/internal/notify/tick`
8. Frontend: Firebase SDK 統合 + トグル UI 実装 & staging デプロイ
9. stg で iOS PWA install → 通知テスト (**preview サイトからも同じ stg backend で動作確認可**)

### 10.2 prod 反映

10. prod 環境変数を設定 (`.env.prod` は staging と同じ VITE_FIREBASE_* 値でよい、Firebase プロジェクト共用のため)
11. Backend を production デプロイ (main へ merge → `deploy-backend.yml` が発火)
12. Frontend を production デプロイ (`deploy` 相当のワークフロー)
13. **production 用 Cloud Scheduler ジョブ作成** (`notify-tick-prod`) — target: `https://tabi-share-api-prod-*.run.app/internal/notify/tick`
14. prod で疎通確認 (テスト送信 / 実 block の 5 分前通知)

## 11. 環境分離と CI (Firebase Hosting)

Firebase Hosting は 3 target 構成 (`.firebaserc`) + Cloud Run は 2 環境 (`deploy-backend.yml`)。

| フロント (Firebase Hosting) | ビルド env | デプロイ target | 実 URL | Backend 接続先 |
|---|---|---|---|---|
| production | `.env.prod` (`pnpm run build:prod`) | `tabishare` | `https://tabishare.net` | `https://api.tabishare.net` |
| staging | `.env.stg` (`pnpm run build:stg`) | `tabishare-st` | `https://st.tabishare.net` | `https://api.st.tabishare.net` |
| preview (PR プレビュー) | **`.env.stg`** (staging と同じビルド) | `tabi-share-8ef6b` | Firebase Preview URL | `https://api.st.tabishare.net` |
| local (dev) | `.env` | - | `localhost` | `http://localhost:8000` |

**Preview 環境の位置付け**:
- `.github/workflows/firebase-hosting-pull-request.yml` が PR 単位で発火
- `pnpm run build:stg` (staging と同じビルド) を Firebase Preview Channel にデプロイ
- **Backend は stg を共用** (`https://api.st.tabishare.net`)
- したがって、**preview サイトから通知購読すると stg DB に入り、staging Cloud Scheduler が拾って配信** → 追加インフラなしで通知動作確認可能

## 12. コスト見積 (無料枠内で運用可能か)

- **FCM**: 送信無料
- **Cloud Scheduler**: 月 3 ジョブまで無料 (1 分 cron でも OK)
- **Cloud Run**: リクエスト数課金。1 分毎 tick = 月 43,200 req、無料枠 (200 万 req/月) 内
- **Secret Manager**: 月 6 アクティブシークレットまで無料
- **総額**: 現状想定の規模では **無料枠内で運用可能**
