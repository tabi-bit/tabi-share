# FCM プッシュ通知 設計メモ

> **注意**: 本ドキュメントは Issue #148 の grill セッションで合意した**決定過程の記録**です。
> 実装の一次情報や機能仕様は [docs/notifications.md](../notifications.md) を参照してください。

## 決定過程 & 受容判断 (歴史的経緯)

以下は「なぜその選択をしたか」の記録。実装の詳細は本ドキュメントではなく `docs/notifications.md` に集約。

### なぜ FCM (Web Push) にしたか

- Issue #148「次の予定が通知からぱっと分かるようにしたい」の解決手段として:
  - **A: 時刻イベント push (5 分前通知)** ← MVP 採用
  - B: 常駐通知 (glanceable、通知シェードに現在/次の予定を貼り付け) ← Phase 2 候補
- iOS PWA では B のような常駐挙動が保証されず、A のほうが投資対効果高いと判断

### なぜ ADC 方式 (SA JSON 発行なし) を選んだか

- 当初案は Firebase Admin SDK 用 Service Account JSON を発行し Secret Manager に登録する方式
- **ADC (IAM 権限付与) の方が上位解**と判断:
  - SA JSON がファイルとして存在しない = 漏洩リスクゼロ
  - ローテーション不要
  - Secret Manager 経由の保管も不要
  - IAM 一元管理でシンプル
- 既存 `tabi-share-api-runtime` SA に `roles/firebasecloudmessaging.admin` を直接付与

### なぜ (fcm_token, trip_id) 単位の購読モデルか

- 選択肢:
  - (i) FCM registration token (端末×ブラウザ) ← MVP 採用
  - (ii) 既存 `tabishare_session` Cookie ベース ← ほぼ (i) と同じだが Cookie 消えたら失う
  - (iii) Firebase Auth ユーザ ID ← Firebase Auth **未実装**のため不可
- Auth が入っていない現状、FCM token が実質「端末識別子」として機能
- 将来 Firebase Auth 導入時は `user_id` カラム追加で自然に拡張可能

### なぜ INSERT-first + ロスト受容にしたか

- **二重送信絶対禁止**が最優先 (「同じ通知が 2 度届く」は UX 最悪)
- INSERT-first (`sent_notifications` PK 制約) で並列 tick でも 1 プロセスだけが送信権を獲得
- FCM 送信失敗はロスト受容:
  - FCM 到達率 99%+ で実質ロスト率無視可能
  - 1〜2 分遅れの再送より「時刻通り届くか、届かないか」の方が UX 良い
  - Phase 2 でリトライが必要になったら `sent_notifications.status` 列を追加

### なぜ Cookie 失効時も購読を維持するか (E1 方針)

- `tabishare_session` Cookie が失効しても `fcm_token` ベースの購読は独立して有効
- Trip URL 共有モデル的に「URL 知ってれば OK」なので、通知購読が独立するのは矛盾しない
- Trip 削除 (CASCADE) or FCM token 失効 (Unregistered エラー) でのみ解除
- 「URL 共有した相手が通知 ON にした後、URL を削除しても相手に通知届き続ける」ケースが存在するが、MVP は受容

### なぜ Title を "next 12:00" にしたか

- 候補:
  - A: `next 12:00` ← 採用 (popup 4 字で "next" が意味を伝える)
  - B: `次の予定 12:00` (popup 4 字で "次の予定" だが時刻が見えない)
- popup 通知の先頭 4 文字で「時刻系リマインダー」だと即認識できる情報密度が最優先
- Body で場所 / trip 名を補完

### プライバシー方針 (MVP)

- 通知内容 (block 名、場所) はロック画面に表示される
- 「内容をぼかす」オプションは MVP 見送り (Phase 2 候補)
- ユーザが自分で通知 ON にする以上、受容可

### tick > 60 秒対策を Phase 2 送りにした理由

- 現状の subscription 規模 (~数十件) では通常の tick が数秒で完了
- PostgreSQL Advisory Lock / Cloud Run request timeout / バッチ LIMIT 等の防御機構は、
  subscription が数百件を超えて問題が顕在化してから実装する
- MVP としては `sent_notifications` PK の二重送信絶対禁止だけあれば事故は防げる
- 最小改善として `elapsed_ms` 構造化ログは実装済み

## Phase 2 候補 (未着手)

- **常駐通知案 (glanceable)**: 「現在: 温泉 / 次: 昼食 13:30〜」を通知シェードに常時表示 (FCM 不要、SW 側で管理)
- **通知疲労対策**: 連続開始ブロックの集約通知
- **送信失敗リトライ**: `sent_notifications.status` 列追加
- **観測メトリクス**: Cloud Monitoring カスタムメトリクス (送信数 / 失敗率 / SLO)
- **通知内容ぼかしオプション**: ロック画面プライバシー
- **ブロック単位通知 ON/OFF**: 現行 Trip 単位のみ
- **minutes_before の UI 設定**: 5/10/30 分プリセット (DB カラムは用意済み)
- **PostgreSQL Advisory Lock**: tick 排他化
- **tick バッチ LIMIT**: subscription 数増加時の対策
- **Cookie 失効時の購読自動解除**: 現行 E1 (独立管理) 方針
- **`sent_notifications` 掃除 cron**: Issue #173
- **macOS Safari (Sonoma+) の PWA install サポート**

## 参考: 実装内容の一次情報

- 実装仕様・アーキテクチャ・データスキーマ: [docs/notifications.md](../notifications.md)
- Phase 分けと実装順序: [docs/memo/notification_roadmap.md](./notification_roadmap.md)
