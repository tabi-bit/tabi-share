# FCM プッシュ通知 設計メモ

> **注意**: 本ドキュメントは Issue #148 の grill セッションで合意した検討メモであり、実装の一次情報ではありません。実装時は必ずソースコードを正とし、本ドキュメントとの乖離がある場合はソースコードを優先してください。

## 1. 目的

Issue #148 「PWA における通知の仕組み検討 & 実装」の要件を満たす。
- **次の予定が通知からぱっと分かるようにする**
- 予定開始時刻の N 分前にプッシュ通知を届ける

## 2. 全体アーキテクチャ

```
[Cloud Scheduler] --(1分毎 OIDC 付き HTTP)--> [Cloud Run: /internal/notify/tick]
                                                           ↓
                                       blocks × device_subscriptions を scan
                                       (未送信 & 未来 & minutes_before 以内)
                                                           ↓
                                       INSERT sent_notifications (ON CONFLICT DO NOTHING)
                                                           ↓
                                       Firebase Admin SDK で FCM 送信
```

- **クライアント**: PWA (React + Vite)。Firebase Messaging Web SDK で token 取得、購読 API 呼び出し
- **サーバ**: FastAPI on Cloud Run。ポーリング型スケジューラで FCM 送信
- **スケジューラ**: Cloud Scheduler (無料枠 3 ジョブ以内)
- **Firebase プロジェクト**: 既存 Firebase Hosting プロジェクトを流用

## 3. 通知の設計

### 3.1 発火タイミング

- **N 分前通知** のみ (MVP)
- **デフォルト N = 5 分**
- Trip × 端末単位で ON/OFF、N 分は DB に列として持つが UI からの変更は当面なし (将来拡張の余地)

### 3.2 通知対象

- 全 block_type (`event`, `stay`, `move`) を通知対象
- `Trip.start_date IS NOT NULL` の Trip に限定 (下書き旅程は除外)

### 3.3 通知内容

```
[Schedule (event/stay)]
  Title:  next 12:00
  Body:   昼食 · 湯畑亭 · 草津温泉プロジェクト

[Move]
  Title:  next 12:00
  Body:   →湯畑亭 · 草津温泉プロジェクト
```

- **Title**: `next HH:MM` 固定フォーマット
  - popup(4字)で "next" が見えれば「予定リマインダー」と即認識
  - 通知センター(~10字)で "next 12:00" まで完全表示
  - move も schedule も同じ Title (区別は Body 冒頭の `→` で判別)
- **Body**: `{block名 or →目的地} · {場所名} · {trip名}`
  - 区切りは中黒 `·` で情報密度優先
  - location が null なら省略
- **時刻表示**: `HH:MM` (24h)
- **Icon**: 既存 PWA アイコン (`/icons/icon-192x192.png`) 流用
- **Badge (Android モノクロバッジ)**: 新規作成が必要

### 3.4 タイムゾーン

- サーバはグローバル対応 (Asia/Tokyo ハードコード禁止)
- DB は `TIMESTAMPTZ` で UTC 保持 (現行維持)
- 通知本文の `HH:MM` は**購読端末のタイムゾーンで整形**
  - `device_subscriptions.timezone` 列にクライアントの `Intl.DateTimeFormat().resolvedOptions().timeZone` を保存
  - サーバは送信時にその TZ で `HH:MM` を整形

### 3.5 タップ時の挙動

- タップ → `/trip/{urlId}?focusBlock={blockId}` へ遷移
- 該当 Trip タブが既に開いていれば `focus()` + `postMessage({ type: 'FOCUS_BLOCK', blockId })`
- TripPage 側で `?focusBlock` を検知して該当ブロックへ `scrollIntoView({ block: 'center' })` + ハイライト
- **閲覧モードで開く** (編集モードには自動遷移しない)
- Actions ボタン (`[開く][スヌーズ]` 等) は MVP 見送り

### 3.6 フォアグラウンド挙動

- アプリを開いている時 (`onMessage` 発火時) は **OS 通知ではなくアプリ内トースト**
- トーストに **`MoveRight` アイコン付きの遷移ボタン** (日本語ラベルより短くて明快)
- タップで通知タップと同じ deep link 挙動

## 4. 購読モデル

### 4.1 主キー: FCM registration token

- **`(fcm_token, trip_id)` ペア** で購読管理
- 端末 × Trip 単位。同じ人が iPhone/PC 両方で ON にすると両方鳴る (割り切り)
- Firebase Auth **未実装** なのでユーザ ID には依存しない
- 将来 Firebase Auth 導入時は `user_id` カラム追加で拡張

### 4.2 iOS PWA 制約

- iOS 16.4+ から Web Push 対応、ただし **PWA としてホーム画面追加した状態のみ**
- 通常 Safari タブでは permission リクエスト自体不可

**iOS 未 install 時のフロー:**
1. ベルアイコンタップ
2. アラート「アプリとしてインストールする必要があります」
3. OK → install 手順モーダル (Safari 共有 > ホーム画面に追加)
4. ユーザ手動で install
5. ホーム画面から起動
6. **再度**ベルアイコンタップ → 通知許可ダイアログ (自動再誘導は MVP 見送り)

### 4.3 通知許可のリクエストタイミング

- ページ読み込み時の自動発火は **禁止**
- ベルアイコン (OFF 状態) タップ後のみ `Notification.requestPermission()`
- denied 時は「設定から許可してください」ヘルプへの導線

### 4.4 トグル UI

- Trip 閲覧ページヘッダー (`ViewTripLayout.tsx` 周辺) にベルアイコン
- lucide-react の `Bell` (ON) / `BellOff` (OFF) を使用
- iOS 未 install 時は OFF 状態表示 + タップで install 誘導モーダル

## 5. データスキーマ

```sql
-- 端末 × Trip の購読関係
CREATE TABLE device_subscriptions (
  id             BIGSERIAL PRIMARY KEY,
  fcm_token      VARCHAR(500) NOT NULL,
  trip_id        BIGINT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  minutes_before SMALLINT NOT NULL DEFAULT 5,       -- 通知先行分 (1〜120 の範囲)
  timezone       VARCHAR(64) NOT NULL,              -- IANA TZ (例: 'Asia/Tokyo')
  user_agent     VARCHAR(500),                       -- デバッグ用
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (fcm_token, trip_id),   -- カラム順は意図的 (下記コメント参照)
  CONSTRAINT ck_device_subscriptions_minutes_before_range
    CHECK (minutes_before >= 1 AND minutes_before <= 120)
);
CREATE INDEX idx_device_subscriptions_trip ON device_subscriptions(trip_id);

-- minutes_before の範囲:
--   最小 1 分、最大 120 分 (2 時間)。DB CheckConstraint と Pydantic (ge=1, le=120) の二重防御。
--   MVP では UI から変更不可 (常に 5 分)、将来 UI 追加時のためカラムは持たせる。

-- index 設計メモ:
-- - UNIQUE (fcm_token, trip_id) の順序は「fcm_token 単体クエリ」対応のため。
--   PostgreSQL の B-tree 複合 index は左端カラムから prefix-match で使えるので、
--   fcm_token 単体 WHERE (token リフレッシュ、token 失効時の全 trip 削除) でも
--   この UNIQUE index が有効に働く。追加 index は不要。
-- - idx_device_subscriptions_trip は tick スキャン時の JOIN (trip_id 単体) 用。

-- 送信済み記録 (重複阻止)
CREATE TABLE sent_notifications (
  block_id   BIGINT NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
  fcm_token  VARCHAR(500) NOT NULL,
  kind       VARCHAR(30) NOT NULL,     -- 'before_5min' 固定 (将来拡張余地)
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (block_id, fcm_token, kind)
);
```

## 6. tick 処理 (ポーリング & 二重送信阻止)

### 6.0 blocks.start_time の index (追加必要)

現行スキーマの `blocks` テーブルには `start_time` に index がない。tick スキャンで
`WHERE b.start_time > now() AND b.start_time <= now() + interval` を毎分実行するため、
以下 index を Alembic で追加する:

```sql
CREATE INDEX idx_blocks_start_time ON blocks(start_time);
```

### 6.1 スキャン範囲

「未来 AND minutes_before 以内 AND 未送信」を広めに絞り込む。tick が遅延しても取りこぼしなし。

```sql
SELECT b.id, b.title, b.start_time, b.block_type, ...,
       s.fcm_token, s.minutes_before, s.timezone,
       t.url_id, t.name AS trip_name
FROM blocks b
  JOIN pages p ON b.page_id = p.id
  JOIN trips t ON p.trip_id = t.id
  JOIN device_subscriptions s ON s.trip_id = t.id
  LEFT JOIN sent_notifications sn
    ON sn.block_id = b.id
   AND sn.fcm_token = s.fcm_token
   AND sn.kind = 'before_5min'
WHERE t.start_date IS NOT NULL
  AND b.start_time > now()
  AND b.start_time <= now() + make_interval(mins => s.minutes_before)
  AND sn.block_id IS NULL
```

### 6.2 INSERT-first 送信 (二重送信阻止)

```python
for candidate in candidates:
    result = await db.execute(
        insert(SentNotification)
            .values(block_id=..., fcm_token=..., kind='before_5min')
            .on_conflict_do_nothing()
    )
    if result.rowcount == 1:      # INSERT 成功 = 送信権獲得
        await send_fcm(candidate)
    # 競合 tick では PK 制約で INSERT 拒否 → スキップ
```

- **順序: INSERT → send**。「送信ロスト受容、二重送信絶対禁止」の原則
- FCM 到達率 99%+ のためロスト率は無視可
- send 失敗時のリトライロジックは MVP 実装なし

### 6.3 token 失効時のハンドリング

- FCM から `Unregistered` / `InvalidRegistration` / `MismatchSenderId` エラー → **`device_subscriptions` から該当 token を全削除** (全 trip 分)
- 一時エラー (429 rate limit, 5xx) は **MVP ではロスト扱い**。リトライ機構は Phase 2 で必要になったら `sent_notifications.status` 列を追加して対応

### 6.3.1 FCM 送信オプション

- **TTL: 300 秒** (5 分) を必ず指定
  - デフォルトの 4 週間 TTL のままだと、オフライン端末が復帰した際に古い通知が届く事故が起きる
  - `messaging.WebpushConfig(headers={"Urgency": "high", "TTL": "300"})`
- **バッチ送信**: 数百件を送る場合は `messaging.send_each(messages)` で並列化 (最大 500 件/回)
  - 各 block ごとに Title/Body/link が異なるため、Message を個別に作って `send_each` に渡す
  - 同一 payload を複数 token に送る場合は `send_each_for_multicast(multicast_message)` を使うが、今回の用途では使わない

### 6.3.2 VAPID 鍵ローテーションの禁止

- VAPID 鍵を変更すると **全端末の既存 token が無効化** され、全ユーザに再購読を強いる
- 運用上、鍵ローテーションは **基本しない** (漏洩時のみ)

### 6.4 タップ後の deep link (SW `notificationclick`)

```ts
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { urlId, blockId } = event.notification.data;
  const targetUrl = `/trip/${urlId}?focusBlock=${blockId}`;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find(c => c.url.includes(`/trip/${urlId}`));
        if (existing) {
          existing.focus();
          existing.postMessage({ type: 'FOCUS_BLOCK', blockId });
          return;
        }
        return self.clients.openWindow(targetUrl);
      })
  );
});
```

## 7. Service Worker 統合方針

- `firebase-messaging-sw.js` を **別ファイルとして併存** (VitePWA の SW とは分離)
- 公式ドキュメントに事例多、iOS PWA との相性実績あり
- Vite plugin の `includeAssets` に追加

## 8. エッジケースの扱い

| ケース | 挙動 |
|---|---|
| Trip.start_date が null | **通知対象外**。トグル ON 時に「日付未設定ページがあります」アラートで警告。ページ追加/編集で null が発生した場合は黄色アテンション表示 |
| block 開始が過去 | スキャン条件 `start_time > now()` で自然除外 |
| 直前に作成された block (残り 1 分等) | 通知する (5 分前確約より「届く」ことを優先) |
| Trip 削除 | CASCADE で `device_subscriptions` 自動削除 |
| Block 削除 | CASCADE で `sent_notifications` 自動削除 |
| token リフレッシュ | クライアント起動時 `getToken()` 再取得、新旧 token を API に渡して UPDATE |

## 9. UI 詳細

### 9.1 通知トグル

- 位置: Trip 閲覧ページヘッダー
- アイコン: `lucide-react` の `Bell` (ON) / `BellOff` (OFF)
- ON にする際:
  - Trip.start_date が null なら「日付未設定です」アラート → OK 押下で有効化
  - ページに date null がある場合、Trip 画面に**黄色アテンション**表示

### 9.2 フォアグラウンドトースト

- 既存 `useNetworkToast` パターン準拠
- `MoveRight` アイコン付きのアクションボタン (日本語ラベルより明快)
- 別 Trip の通知でも同様に表示、タップで別 Trip へナビゲート

### 9.3 トグル操作のフィードバック (D1 + トースト)

- **ベルアイコン即応**: ワンタップで `requestPermission()` → `getToken()` → 購読 API まで実行
- **成功トースト**: 「通知を有効にしました」 / 「通知を無効にしました」
- **エラートースト**:
  - permission denied: 「通知が拒否されました。OS 設定から許可してください」+ ヘルプへのリンク
  - iOS 未 install: 「アプリとしてインストールする必要があります」アラート → install 手順モーダル (D1 の流れは iOS では 2 段階になる)
  - 購読 API 失敗: 「通知の有効化に失敗しました。時間を置いて再度お試しください」
- 既存 shadcn/ui の `Sonner` / `toast` パターン準拠

### 9.4 テスト送信機能 (B1 補完)

- 通知トグルの近くに「テスト送信」ボタン (ON 時のみ表示)
- タップで即座に自端末にテスト通知が届く
- iOS install 後の疎通確認、「本当に届く？」の不安解消に有用
- **エンドポイント**: `POST /api/v1/trips/{trip_id}/subscription/test`
- **通知内容**:
  ```
  Title: たびしぇあ テスト通知
  Body:  通知が正常に届いています · {trip.name}
  ```
- **レート制限**: 同 fcm_token につき **5 秒に 1 回まで** (連打防止)
- **`sent_notifications` には記録しない** (block_id が NULL 不可のため構造上入らない、テストなので記録も不要)

## 10. プラットフォーム別 install 要否

| Platform | 通知購読 | PWA install 要否 |
|---|---|---|
| iOS Safari (16.4+) | ✅ | **必須** (共有 > ホーム画面に追加) |
| iOS 16.3 以前 | ❌ | (Web Push 非対応) |
| Android Chrome | ✅ | 不要 (install するとより安定) |
| Desktop Chrome/Edge/Firefox | ✅ | 不要 |

判定コード:
```ts
const isPWAInstalled = window.matchMedia('(display-mode: standalone)').matches;
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
if (isIOS && !isPWAInstalled) {
  // install 誘導モーダルを出す
}
```

## 11. 運用: 通知機能の一時停止

- **Cloud Scheduler ジョブを停止**するだけで通知は止まる
- 購読 API は生きたままなので、既存 subscription は保持される
- ジョブ再開で自然復旧

### 11.1 Cloud Run min_instances

- **`min_instances=1`** で運用済み (既存設定)
- コールドスタート遅延の心配なし
- tick 実行は即座に反応

## 12. 環境分離 (staging / preview / production / local)

Firebase / Cloud Run / DB を含む 4 環境の分離状況:

| 層 | 共有/分離 |
|---|---|
| Firebase プロジェクト (`tabi-share-8ef6b`) | **1 つ共用** (Hosting / FCM / Analytics すべて) |
| Firebase Hosting target | **3 分離**: staging (`tabishare-st`) / production (`tabishare`) / preview (`tabi-share-8ef6b`) |
| Cloud Run サービス | **stg / prod 分離**: `tabi-share-api-staging` / `tabi-share-api-prod` |
| DB (PostgreSQL) | **完全分離** (stg / prod で別インスタンス) |
| `.env` ファイル | **3 分離**: `.env` (local + preview 兼用) / `.env.stg` (staging) / `.env.prod` (production) |

**Preview 環境の位置付け** (`firebase-hosting-pull-request.yml`):
- PR 作成/更新時に **`pnpm run build:stg`** でビルドされる (`.env.stg` を使用)
- 生成物は Firebase Hosting Preview Channel にデプロイされる
- **API は stg backend (`https://api.st.tabishare.net`) を参照**
- → **preview サイトから購読すると stg DB に入り、stg Cloud Scheduler が拾って通知配信**
- **追加インフラ不要で preview から通知動作確認が可能**

**FCM token は origin 単位で独立発行**:
- 同じ端末で staging URL / production URL / preview URL に個別購読すると 3 つの token が発行される
- stg で誤って prod ユーザに通知を送るリスクは構造的にゼロ (DB が分離されているため)

## 13. Cookie 失効と通知購読の関係 (E1 方針)

- `tabishare_session` Cookie が失効しても、`fcm_token` ベースの購読は独立して有効
- Trip URL 共有モデル的に「URL 知ってれば OK」なので、通知購読が独立するのは矛盾しない
- Trip 削除 (CASCADE) or FCM token 失効 (Unregistered エラー) でのみ解除
- 「Trip URL を共有した相手が通知 ON にした後、URL を削除しても相手には通知届き続ける」ケースが存在するが、MVP は受容

## 14. プライバシー方針 (MVP)

- 通知内容 (block 名、場所) はロック画面に表示される
- 「内容をぼかす」オプションは MVP 見送り (Phase 2 候補)
- ユーザが自分で通知 ON にする以上、受容可

## 15. Phase 2 候補 (未着手)

- **常駐通知案 (glanceable notification)**: 「現在: 温泉 / 次: 昼食 13:30〜」を通知シェードに常時表示。SW 側で管理、FCM 不要。grill 開始時に検討したが MVP は「時刻イベント push」1 本に絞ったため後回し
- 通知疲労対策 (連続開始ブロックの集約通知) — MVP は受容
- 送信失敗リトライ (`sent_notifications.status` 列追加、`sent_at` を nullable にして状態管理)
- 観測メトリクス (Cloud Monitoring カスタムメトリクス、送信数 / 失敗率 / SLO) — MVP は `log.info` のみ
- 通知内容のぼかしオプション (ロック画面プライバシー)
- ブロック単位の通知 ON/OFF (現行は Trip 単位のみ)
- minutes_before の UI 設定 (5/10/30 分プリセット、DB 列は用意済み)
- Cookie 失効時の購読自動解除 (現行は独立管理・E1 方針)
- `sent_notifications` の古いレコード掃除 cron (Issue #173)
