# 通知機能 (Web Push / FCM)

Issue #148 で導入した Web Push 通知の**恒久リファレンス**。設計判断の経緯や実装ロードマップは
[docs/memo/notification_design.md](memo/notification_design.md) を参照。

## 1. 概要

- 予定 (Block) の**開始 5 分前**にプッシュ通知を配信する
- 端末 × Trip 単位で購読を管理し、ユーザは Trip 閲覧画面のトグルで ON/OFF
- Firebase Cloud Messaging (FCM) を Web Push のバックエンドとして使用
- Cloud Scheduler が 1 分毎に Cloud Run の tick を叩いてスキャン & 送信

## 2. アーキテクチャ

```text
[Cloud Scheduler] --(1分毎 OIDC付 HTTP)--> [Cloud Run: POST /internal/notify/tick]
                                                           ↓
                                       blocks × device_subscriptions を scan
                                       (未送信 & 未来 & minutes_before 以内)
                                                           ↓
                                       INSERT sent_notifications (ON CONFLICT DO NOTHING)
                                                           ↓
                                       Firebase Admin SDK (ADC) で FCM 送信
                                                           ↓
                                                  端末 (PWA / ブラウザ)
```

**構成要素**:

| 層 | 実装 |
|---|---|
| Client | React + Vite PWA、Firebase Messaging Web SDK |
| Backend | FastAPI on Cloud Run (asia-northeast1) |
| DB | PostgreSQL (Neon 想定) |
| Scheduler | Cloud Scheduler (無料枠 3 ジョブ以内) |
| 認証 | ADC (Application Default Credentials)、Runtime SA `tabi-share-api-runtime` に IAM 権限 |

## 3. データスキーマ

```sql
-- 端末 × Trip の購読関係
CREATE TABLE device_subscriptions (
  id             BIGSERIAL PRIMARY KEY,
  fcm_token      VARCHAR(500) NOT NULL,
  trip_id        BIGINT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  minutes_before SMALLINT NOT NULL DEFAULT 5,
  timezone       VARCHAR(64) NOT NULL,        -- IANA TZ
  user_agent     VARCHAR(500),                 -- デバッグ用
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (fcm_token, trip_id),
  CONSTRAINT ck_device_subscriptions_minutes_before_range
    CHECK (minutes_before >= 1 AND minutes_before <= 120)
);
CREATE INDEX idx_device_subscriptions_trip ON device_subscriptions(trip_id);

-- 送信済み記録 (二重送信の絶対禁止用ロック)
CREATE TABLE sent_notifications (
  block_id   BIGINT NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
  fcm_token  VARCHAR(500) NOT NULL,
  kind       VARCHAR(30) NOT NULL,   -- 'before_5min' 固定 (将来拡張余地)
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (block_id, fcm_token, kind)
);

-- 現状の tick は Page.date で絞るためこの index は未使用。将来 Block.start_time.time() を
-- 直接扱うクエリ (Phase 2 の day-of-time バッチ等) で利用予定。
CREATE INDEX idx_blocks_start_time ON blocks(start_time);
```

### 設計判断

- **`UNIQUE (fcm_token, trip_id)` のカラム順序は意図的**: fcm_token 単体 WHERE (token リフレッシュ / 失効時全削除) にも B-tree の左端 prefix match が効く
- **`sent_notifications.kind` を持つ**: 現状 `'before_5min'` 固定だが、将来「開始時通知」等の拡張時に複合 PK が壊れない保険

### `Block.start_time` の不変条件 (重要)

**`Block.start_time` の年月日部分は無意味**。時刻部分 (time-of-day) のみが真であり、ブロックが「どの日か」は親 `Page.date` が保持する。深夜イベント (例: 3 時終了) を Day 1 のプランに紐付けたい要件のため、絶対日時ではなくこの相対表現を採用している。詳細は `frontend/src/types/block.ts` のコメント参照。

**絶対日時の組み立て**: `Page.date + Block.start_time.time()` を subscriber の tz (`device_subscriptions.timezone`) で解釈して UTC 化する。`Block.start_time` を直接 `now()` と比較してはいけない。tick 側の実装は `server/app/cruds/notification.py::_compose_absolute_start` を参照。

## 4. tick 処理

### 4.1 スキャン範囲

「未来 AND minutes_before 以内 AND 未送信」を広めに絞り込む。tick 遅延しても取りこぼしなし。

```sql
-- DB は Page.date で粗く絞るだけ (±1 日)。Block.start_time の time-of-day を
-- Page.date + subscriber TZ で組み立てる細かい window 判定は Python 側で行う。
SELECT b.*, p.date, s.fcm_token, s.minutes_before, s.timezone, t.url_id, t.title
FROM blocks b
  JOIN pages p ON b.page_id = p.id
  JOIN trips t ON p.trip_id = t.id
  JOIN device_subscriptions s ON s.trip_id = t.id
  LEFT JOIN sent_notifications sn ON sn.block_id = b.id
    AND sn.fcm_token = s.fcm_token AND sn.kind = 'before_5min'
WHERE t.start_date IS NOT NULL             -- 下書き旅程は除外
  AND p.date IS NOT NULL                    -- 下書き Page は除外
  AND p.date BETWEEN (current_date - 1) AND (current_date + 1)
  AND sn.block_id IS NULL                   -- 未送信
```

Python 側で `datetime.combine(page.date, block.start_time.time(), ZoneInfo(sub.timezone)).astimezone(UTC)` を組み立てて `(now, now + minutes_before]` に入るものだけ残す。

### 4.2 INSERT-first で二重送信絶対禁止

送信ロック → 送信 の順序。`ON CONFLICT DO NOTHING` で競合 tick でも 1 プロセスだけ真を返す。

```python
for candidate in candidates:
    reserved = await notif_cruds.try_reserve_send_slot(
        db, block_id=cand.block_id, fcm_token=cand.fcm_token
    )
    if not reserved:
        continue
    send_fcm(...)
```

- **送信失敗はロスト受容**: MVP 方針。時刻通り届かない通知は再送しない
- **失効 token エラー** (`messaging.UnregisteredError` / エラーコード `mismatched-credential` / `invalid-registration-token`) → `device_subscriptions` から全 trip 分削除
- **`invalid-argument` は含めない**: payload エラーとの区別不能で、コードバグで全ユーザ購読を消す事故を防ぐため
- **block の start_time 変更 → 再通知**: `PUT /pages/{id}/blocks/{id}` で `start_time` が変わったら `sent_notifications` の該当 block 行を削除 (`server/app/cruds/blocks.py::update_block`)。次 tick で再送候補になる。既に受け取った通知の分は二重に届く可能性があるが、時刻変更を伝えるほうが優先。
- **page の date 変更 → 配下 block を全て再通知**: `PUT /pages/{id}` で `date` が変わると block の絶対日時が動くため、配下 block の `sent_notifications` を全削除 (`server/app/cruds/pages.py::update_page`)。
- **絶対日時の組み立て**: `Block.start_time` は年月日部分が無意味で time-of-day のみが真 (§3 参照)。tick は `Page.date + Block.start_time.time()` を subscriber の tz で解釈して UTC 化した値で window 判定する (`server/app/cruds/notification.py::_compose_absolute_start`)。Page.date が今日 ±1 日の範囲を DB で絞り、細かい window 判定は Python 側で行う。

### 4.3 FCM 送信オプション

```python
messaging.WebpushConfig(
    headers={"Urgency": "high", "TTL": "300"},   # 5 分後に expire (時刻遅延通知の事故防止)
    fcm_options=messaging.WebpushFCMOptions(link=deep_link_url),
)
```

- **TTL=300 秒必須**: デフォルト 4 週間だとオフライン復帰時に古い通知が届く
- **バッチ送信**: 数百件超えたら `messaging.send_each()` (最大 500 件/回) で並列化

### 4.4 過負荷対策 & Runbook

tick が 60 秒を超えると次 tick と重なる。閾値と対処:

**検知 (MVP)**:
- tick 完了時に `elapsed_ms` を構造化ログ出力
- Cloud Logging で `jsonPayload.elapsed_ms >= 45000` を 3 回連続でアラート発火

**防止機構**:

| 機構 | 状態 |
|---|---|
| `sent_notifications` PK で二重送信禁止 | ✅ 実装済み (最終防衛線) |
| PostgreSQL Advisory Lock で tick 排他化 | ⏳ Phase 2 |
| Cloud Run request timeout=60s | ⏳ deploy 時に指定 |
| バッチ LIMIT | ⏳ Phase 2 (数百 subscription 超えたら) |

**Runbook**:
1. Cloud Logging で `notification_tick_completed` を 30 分ぶん確認
2. `candidates_count` 急増 → subscription の異常増加 or 集中時間帯
3. `failed_count` 急増 → Firebase Status Page を確認
4. 緊急停止: `gcloud scheduler jobs pause notify-tick-{stg,prod}`

## 5. 通知内容フォーマット

```text
[Schedule (event/stay) — location あり]
  Title:  next 12:00
  Body:   昼食
          場所: 湯畑亭
          草津温泉プロジェクト

[Move — location のみ (現状 UI では destination 未実装)]
  Title:  next 14:30
  Body:   駐車場まで移動
          場所: 湯畑亭
          草津温泉プロジェクト

[Move — destination も実装された将来形]
  Title:  next 09:12
  Body:   新宿から草津へ
          東京駅 → 新宿駅
          草津温泉プロジェクト
```

- **Title**: `next HH:MM` 固定 (popup 4 字で "next" が見える、通知センター 10 字で完全表示)
- **Body**: 改行区切りで **block 名 → 場所行 → trip 名**。省略表示でも block 名が最上部に残る
- **場所行のルール** (`_format_location_line`):
  - `location` + `destination` 両方あり → `{location} → {destination}`
  - `destination` のみ → `→ {destination}`
  - `location` のみ → `場所: {location}`
  - どちらも無し → 行ごと省略
- **時刻**: 購読端末の `timezone` (IANA TZ) で整形。サーバはグローバル対応
- **Icon** (通知本体の大アイコン、192px、フルカラー): block_type / transportation_type 別 (`frontend/public/icons/notify/*.png`)
  - `move` + transportation → `car` / `train` / `shinkansen` / `bus` / `walk` / `bicycle` / `ship` / `flight` の 8 種
  - それ以外 (`event` / `stay`) → `schedule` (地図ピン)
  - テスト送信 → `test` (紙飛行機)
  - 素材: FA (frontend/src/assets/icons) + Lucide MapPin。オレンジバッジ (`#f4a261`) + 白抜き
- **Badge** (Android status bar 等の小モノクロアイコン、96px、透過 PNG): `badge.png` を全通知で共通使用。紙飛行機シルエット (favicon 由来)、OS 側でアクセントカラーへリカラーされる。icon と別 URL にしないと Android で四角い塗りになる
- 生成スクリプト: `scripts/gen_notification_icons.py`
- **Deep link**: `/trip/{urlId}?focusBlock={blockId}`。SW `notificationclick` (`frontend/public/firebase-messaging-sw.js`) が受け、既存 PWA/tab (focused > visible > 任意) に postMessage で client-side navigate、無ければ `clients.openWindow`。client 側は `useFocusBlockOnMount` で `useBlock(id)` から pageId を得て page 切替 → `[data-block-id]` を rAF 待機して `scrollIntoView` (center)。処理後 `focusBlock` は replaceState で除去。

## 6. プラットフォーム対応

| Platform | 通知購読 | PWA install |
|---|---|---|
| iOS Safari (16.4+) | ✅ | **必須** (共有 > ホーム画面に追加) |
| iOS 16.3 以前 | ❌ | (Web Push 非対応) |
| Android Chrome | ✅ | 不要 (install でより安定) |
| Desktop Chrome/Edge/Firefox | ✅ | 不要 |
| macOS Safari (Sonoma+) | △ | localhost では困難、production URL で PWA install |

**判定コード** (`frontend/src/lib/platform.ts`):
```ts
const isPWAInstalled = window.matchMedia('(display-mode: standalone)').matches
  || window.matchMedia('(display-mode: fullscreen)').matches
  || (navigator as { standalone?: boolean }).standalone === true;
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
if (isIOS && !isPWAInstalled) {
  // install 誘導モーダルを出す
}
```

## 7. Firebase / GCP セットアップ

### 7.1 Firebase プロジェクト

**プロジェクト ID**: `tabi-share-8ef6b` (Firebase Hosting と共用)

- Firebase Console > プロジェクト設定 > **Cloud Messaging** タブで有効化
- **VAPID 鍵**: Web configuration > 「Web プッシュ証明書」で生成 → `VITE_FIREBASE_VAPID_KEY` に設定
- **Web SDK config**: apiKey / authDomain / projectId / storageBucket / messagingSenderId / appId → `VITE_FIREBASE_*` に設定

### 7.2 ADC 方式 (Cloud Run → FCM Admin SDK)

**方針**: Service Account JSON を発行せず、既存 `tabi-share-api-runtime` SA に IAM で FCM 権限を付与し、
Firebase Admin SDK は ADC 経由で認証する。

**IAM 付与**:
```bash
gcloud projects add-iam-policy-binding tabi-share-8ef6b \
  --member="serviceAccount:tabi-share-api-runtime@tabi-share-8ef6b.iam.gserviceaccount.com" \
  --role="roles/firebasecloudmessaging.admin"
```

**サーバコード** (`server/app/firebase.py`):
```python
import firebase_admin
firebase_admin.initialize_app()   # 引数なし = ADC 自動検出
```

**メリット**: SA JSON ファイルの存在自体がなくなる (漏洩リスク / ローテーション不要 / Secret Manager 経由の JSON 保管不要)。

### 7.3 Cloud Scheduler ジョブ

各環境 (staging / production) にジョブを 1 個ずつ作成:

```bash
# stg
gcloud scheduler jobs create http notify-tick-stg \
  --location=asia-northeast1 \
  --schedule="* * * * *" \
  --uri="https://<stg-cloud-run-url>/internal/notify/tick" \
  --http-method=POST \
  --oidc-service-account-email=tabi-share-notify-scheduler@tabi-share-8ef6b.iam.gserviceaccount.com \
  --oidc-token-audience="https://<stg-cloud-run-url>" \
  --attempt-deadline=60s

# prod は同様に notify-tick-prod で
```

**Cloud Scheduler 用 SA** (`tabi-share-notify-scheduler`) は事前に作成:
```bash
gcloud iam service-accounts create tabi-share-notify-scheduler \
  --project=tabi-share-8ef6b \
  --display-name="Cloud Scheduler for notification tick"
```

Cloud Run 側の tick エンドポイントは、この SA が発行した OIDC トークンをアプリケーションレベルで検証する
(`server/app/oidc.py`)。

### 7.4 Service Worker 統合

Firebase Messaging Web SDK は **`firebase-messaging-sw.js`** という別 SW を必要とする。
VitePWA が生成する `/sw.js` とは別 scope で併存する。

- 配置: `frontend/public/firebase-messaging-sw.js`
- 参照 SDK バージョンは `importScripts` URL にハードコード → `package.json` の `firebase` と同期して更新すること

## 8. 環境変数

### 8.1 Frontend (`.env` / `.env.stg` / `.env.prod` — dotenvx で暗号化管理)

```dotenv
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=tabi-share-8ef6b.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tabi-share-8ef6b
VITE_FIREBASE_STORAGE_BUCKET=tabi-share-8ef6b.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_VAPID_KEY=...
```

Firebase プロジェクトは 3 環境で共用のため、**全環境で同じ値**を登録して問題ない。origin ごとに FCM token が独立発行されるため誤送信リスクなし。

### 8.2 Backend (Cloud Run env / local `.env`)

```dotenv
NOTIFICATIONS_ENABLED=true                                     # true で送信有効化 (local はデフォルト false)
NOTIFY_TICK_ALLOWED_AUDIENCE=https://<cloud-run-service-url>  # OIDC audience 検証
NOTIFY_TICK_ALLOWED_SA_EMAIL=tabi-share-notify-scheduler@tabi-share-8ef6b.iam.gserviceaccount.com
```

**注**: SA JSON credentials は不要 (ADC 方式)。

## 9. 環境分離

| 層 | 分離状態 |
|---|---|
| Firebase プロジェクト | **1 つ共用** (`tabi-share-8ef6b`) |
| Firebase Hosting target | **3 分離**: staging (`tabishare-st`) / production (`tabishare`) / preview (`tabi-share-8ef6b`) |
| Cloud Run サービス | stg / prod で別: `tabi-share-api-staging` / `tabi-share-api-prod` |
| DB | stg / prod で別インスタンス |
| `.env` ファイル | `.env` (local + preview) / `.env.stg` / `.env.prod` |

**Preview 環境の位置付け** (`firebase-hosting-pull-request.yml`):
- PR ごとに `pnpm run build:stg` (`.env.stg`) でビルドされる
- Backend は **staging を共用** (`https://api.st.tabishare.net`)
- → preview サイトから購読すると stg DB に入り、staging Cloud Scheduler が拾って配信

**FCM token の独立性**:
- 同一端末で staging / production / preview / localhost に個別購読すると **origin ごとに別 token** が発行される
- staging から prod ユーザに誤送信するリスクは構造的にゼロ

## 10. localhost 検証手順

### 10.1 secure context の扱い

- Web Push は Service Worker 必須 = secure context 必須
- **`localhost` / `127.0.0.1` は例外的に secure context 扱い** (Chrome / Firefox / Edge / Safari 共通)
- HTTP でも SW 登録・Push 受信可 (`http://localhost:5173` で開発可)
- **LAN 越し (実機から `192.168.x.x` 等)** は secure context 外 → `pnpm dev:https` (mkcert) が必要

### 10.2 動作確認範囲

| フロー | localhost で可 | 備考 |
|---|---|---|
| 通知許可プロンプト表示 | ✅ | Desktop Chrome/Firefox/Edge |
| FCM token 取得 | ✅ | 同一 Firebase プロジェクトから発行 |
| 購読 API (POST/DELETE/GET/test) | ✅ | ローカル DB に device_subscriptions 行が入る |
| フォアグラウンドトースト表示 | ✅ | サーバの実 FCM 送信必要 (下記 opt-in) |
| **5 分前自動通知** | ⚠️ 手動発火 | Cloud Scheduler が無いので tick を手動で叩く必要 (§10.5 参照) |
| iOS PWA install フロー | ❌ | localhost からは install 不可 → 実機は stg で verify |

### 10.3 通常の localhost 起動

```bash
# ルートで concurrently 起動 (FRONT + SERVER + STORYBOOK)
pnpm dev
```

`NOTIFICATIONS_ENABLED=false` (`.env` のデフォルト) なので、サーバの FCM 送信は skip されて `log.info` のみ。
フロントの購読フロー UI 動作確認だけしたい場合はこれで十分。

### 10.4 サーバから実 FCM を送りたい場合 (opt-in)

Desktop Chrome/Firefox に実際に通知を届かせたい場合の手順:

**1. ADC を確立** (ユーザ credentials を Firebase Admin SDK に渡す)
```bash
gcloud auth application-default login
```

**2. ユーザ自身に Firebase Cloud Messaging Admin 権限を IAM で一時付与**
```bash
gcloud projects add-iam-policy-binding tabi-share-8ef6b \
  --member=user:<your-email> \
  --role=roles/firebasecloudmessaging.admin
# ⚠️ テスト後は必ず --remove-iam-policy-binding で外すこと
```

**3. `NOTIFICATIONS_ENABLED=true` に切り替え**
```bash
pnpm dotenvx set NOTIFICATIONS_ENABLED true -f .env
```

**4. サーバ再起動**

**5. ブラウザで通知トグル ON → テスト送信ボタンを押す**
- Desktop Chrome に OS 通知が届く
- Firebase Console > Cloud Messaging で送信レポートを確認できる

### 10.5 tick の手動発火

Cloud Scheduler が無いので `/internal/notify/tick` を直接叩く。OIDC 検証は
`NOTIFY_TICK_DEV_BYPASS_OIDC=true` を `.env` にセットするとスキップされる。
**このフラグが有効になるのは `ENVIRONMENT=development` のときのみ**で、staging / production
では立てても無視される。

```bash
pnpm dotenvx set NOTIFY_TICK_DEV_BYPASS_OIDC true -f .env
# サーバ再起動後
curl -X POST http://localhost:8000/internal/notify/tick
```

送信対象がない場合の応答:

```json
{"scanned":0,"sent":0,"expired_tokens_removed":0}
```

送信対象を作るには Page.date を今日 or 明日に設定し、Block の時刻を「今から数分後」の
subscriber tz ローカル時刻にする (§4.1 参照)。

**staging で手動発火したい場合** (bypass 不可): Scheduler SA の OIDC トークンを自前で発行する。

```bash
TOKEN=$(gcloud auth print-identity-token \
  --impersonate-service-account=tabi-share-notify-scheduler@tabi-share-8ef6b.iam.gserviceaccount.com \
  --audiences=https://<staging-cloud-run-url>)
curl -X POST https://<staging-cloud-run-url>/internal/notify/tick \
  -H "Authorization: Bearer $TOKEN"
```

叩く人は `tabi-share-notify-scheduler` SA に対して `roles/iam.serviceAccountTokenCreator` が必要。

### 10.6 実機テスト

- **Android Chrome 実機**: LAN 経由で localhost にアクセスしたい場合は HTTPS 必須 → `pnpm dev:https` を使用、PC の LAN IP に接続
- **iOS Safari 実機**: localhost からの PWA install が事実上できないため、通知系は **staging 環境で verify する**
- 5 分前通知の end-to-end 確認は **staging (Cloud Scheduler + Cloud Run 揃った環境) で行う**のが本命

## 11. 運用

### 11.1 通知機能の一時停止

```bash
gcloud scheduler jobs pause notify-tick-prod --location=asia-northeast1
# 再開: resume
```

- ジョブ停止で tick が走らなくなる = 通知配信が止まる
- 購読 API は生きたままなので既存 subscription は保持される
- ジョブ再開で自然復旧

### 11.2 Cloud Run min_instances

- **`min_instances=1`** で運用中 (既存設定)
- コールドスタート遅延なし
- tick 実行は即座に反応

### 11.3 失効 token の掃除

`sent_notifications` は旅程完了後は不要。定期削除する掃除 cron は **Issue #173** で別途対応 (Phase 2)。
