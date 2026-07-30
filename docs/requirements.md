# 旅行旅程管理アプリケーション 要件定義書

## プロジェクト概要

### 目的

国内車旅行（主に温泉地巡り）において、友人・家族との旅程計画を効率的に作成・共有・管理するWebアプリケーションの開発

### 対象ユーザー

- 国内旅行を車で行う個人・グループ
- 1泊2日〜2泊3日の短期旅行が多い
- 温泉地周辺の観光名所・グルメスポット巡りがメイン
- ある程度の時間管理をしつつ、柔軟な旅程調整を好む

## 解決したい課題

### 現在の課題

1. **移動時間計算の手間**: Google Mapsで毎回個別に地点間の移動時間を調査
2. **複数ルート案の管理困難**: 複数の旅程案を比較検討したいが管理が大変
3. **予約情報の分散管理**: 各施設の予約確認メールを毎回確認する手間
4. **リアルタイム共有の困難**: LINEでテキスト共有、最新版の把握が困難
5. **移動時間の可視化不足**: 既存旅程アプリでは移動時間とバッファが管理しづらい

### 前作アプリからの改善点

1. Google Maps連携による移動時間自動取得
2. モダンなUI/UXデザイン

## 機能要件

### Phase 1 (MVP)

#### 基本旅程管理機能

- **ブロック式旅程作成**: スポット訪問 + 移動時間 + バッファ時間をブロックとして管理
- **ドラッグ&ドロップ操作**: ブロックの順序をパズル感覚で並び替え可能
- **時間管理**:
  - 各スポットの滞在時間設定（デフォルト値: 単位時間固定）
  - 移動時間の個別設定
  - バッファ時間の個別設定
  - 移動手段（車・電車等）と費用のメモ機能

#### 複数ルート管理

- 複数の旅程案を保存・比較
- ルート案への名前付け機能（例: "効率重視ルート", "景色重視ルート"）
- 下書き保存機能

#### 認証・共有機能

- **閲覧・編集ともログイン不要**: tripId（ハッシュ化）を知っている人は誰でも閲覧・編集可能
  - グループ利用（家族/友人）を前提とし、編集の絞り込みは行わない
  - URL 共有相手には同等の編集権限を与える設計
- **認可の仕組み**: HttpOnly Cookie に不透明トークン (session_id) を格納し、DB の `user_trip_access` テーブルで trip 単位のアクセス権を管理する（旧 `trip_ids` 配列 JWT からセッションキー方式へ移行、issue #194）
- **セッション**: 長期間有効 (Cookie Max-Age = 30 日、アクセス毎に延長)
- **メール認証** (オプション、Firebase Authentication のパスワードレス方式):
  - **バックアップ・追加機能** として位置付ける（編集の必須要件ではない）
  - 有効化することで以下ができるようになる:
    - デバイス間での旅程一覧同期
    - Cookie 消失 (ブラウザデータクリア、機種変更、iOS Safari の ITP 7 日パージ) 時のリカバリ
  - 認証時は同一 `firebase_uid` の user に session を紐付けて統合する
- **デバイス引き継ぎ** (Firebase Custom Token 経由):
  - iOS PWA (ホーム画面追加) は Safari とストレージが分離され、メールリンクも常に Safari 側で開かれるため **メール認証によるリカバリが機能しない**。この抜け穴を塞ぐための機構
  - 認証済みデバイスで発行した Firebase Custom Token (1 時間有効) を、別デバイスに QR コード or コピペで転送し、受け側で `signInWithCustomToken` により認証状態を移送する
  - 受信側では既存の `/auth/link` (パターン 2: マージ) が発火し、匿名 session が同 user_id に統合される。追加の DB スキーマは不要

### Phase 2

#### Google Maps連携

- **移動時間自動取得**: 取得ボタンによる手動トリガー
- **経路選択**: 複数経路候補からの選択機能
- **アプリ内地図検索**: Google Maps検索機能の統合
- **移動手段対応**: 車・電車・徒歩等の移動手段別時間取得
- **API使用量制限**: Google Maps API無料枠内での運用、ユーザー/アプリ全体での使用制限

#### リアルタイム同期

- **WebSocket通信**: ブロック操作のリアルタイム共有
- **競合解決**: 同時編集時の後勝ちルール
- **接続状態管理**: 編集参加者の状態可視化

#### プッシュ通知

- **FCM (Firebase Cloud Messaging)** による端末単位の通知
- 出発時刻の直前リマインダー
- 端末 × Trip 単位で購読を管理 (`device_subscriptions` テーブル)

### Phase 3

#### 追加管理機能

- **旅程一覧のアーカイブ**: `user_trip_access.archived` フラグでの一覧非表示
- **外部URL管理**: Walica等の割り勘サービスURL管理
- **旅行メタ情報管理**: 旅行名、期間、参加者、テーマ等
- **予約情報統合管理**: 各施設の予約情報の一元管理

#### AI機能（優先度低）

- 現在の旅程に基づく観光スポット提案
- 旅程のテキスト形式エクスポート
- 効率的なルート提案

## 技術要件

### 技術スタック

#### フロントエンド

- **フレームワーク**: React + TypeScript + Vite
- **UI/UX**: Shadcn/ui + Tailwind CSS
- **ドラッグ&ドロップ**: @dnd-kit
- **認証 (オプション)**: Firebase Authentication (パスワードレス、バックアップ用)

#### バックエンド

- **フレームワーク**: Python + FastAPI
- **データベース**: PostgreSQL
- **認可**: セッションキー方式 (HttpOnly Cookie の JWT に session_id、DB で `user_trip_access` を参照)
- **認証 (オプション)**: Firebase Authentication (Firebase Admin SDK による ID トークン検証)
- **リアルタイム通信**: WebSocket（Socket.io検討）
- **プッシュ通知**: Firebase Cloud Messaging (FCM)

#### インフラ

- **フロントエンド**: Firebase Hosting
- **バックエンド**: Google Cloud Run
- **データベース**: PostgreSQL (Cloud SQL / Neon 等)

#### 外部API

- **地図**: Google Maps API（無料枠内運用）

### 非機能要件

#### 性能要件

- リアルタイム同期レスポンス: 1秒以内
- 画面遷移: 2秒以内
- モバイル対応
- 認可判定は 1 リクエストあたり 1 クエリで完結する (page/block CRUD は JOIN 1 発)

#### セキュリティ要件

- tripIdのハッシュ化によるURL推測防止 (認可の主軸)
- HttpOnly Cookie による session_id 管理 (JavaScript からのアクセス防止)
- HTTPS通信
- メール認証 (オプション) は Firebase Authentication のパスワードレス方式
- 並列アクセス時のアクセス権付与は `(user_id, trip_id)` 複合 PK + `ON CONFLICT DO NOTHING` で idempotent 化

#### 可用性要件

- サービス稼働率: 99%以上
- コールドスタート回避（Cloud Run 最小インスタンス構成）

## URL設計

### URL構造

```text
閲覧/編集共通: /trip/[secureHashId]
```

### アクセスパターン

- URL (`/trip/[secureHashId]`) を知っている人は誰でも閲覧・編集可能
- 初回アクセス時に匿名 session と共に `user_trip_access` へアクセス権が付与される
- メール認証 (オプション) を経由すると、複数デバイスで同じ旅程一覧を共有できる

### tripId仕様

- ランダムハッシュ値（推測困難）
- 例: nanoid(16) または crypto.randomUUID() + timestamp

## データ構造

論理設計の全体像は [db_schema.md](./db_schema.md) を参照。

認可関連の主なテーブル:

- `users` — 認可の主体。Cookie 発行時に匿名 user (`firebase_uid IS NULL`) を自動作成し、Firebase 認証時に `firebase_uid` を埋めて昇格させる
- `sessions` — Cookie に載る `session_id` と `user_id` の紐付け
- `user_trip_access` — `(user_id, trip_id)` 複合 PK の中間表。並列付与の race を `ON CONFLICT DO NOTHING` で idempotent に解消する

## 開発フェーズ

### Phase 1: MVP（最小機能）

- 基本的なブロックUI実装
- ドラッグ&ドロップ機能
- セッションキー方式による認可 (issue #194)
- メール認証 (Firebase Auth) をオプション機能として実装

### Phase 2: 中核機能

- Google Maps API連携
- リアルタイム同期機能 (WebSocket)
- プッシュ通知 (FCM)
- モバイル対応

### Phase 3: 拡張機能

- 旅程一覧のアーカイブ
- 外部URL管理画面
- AI機能実装
- 各種最適化

## 運用・保守要件

### コスト管理

- Firebase Hosting: 無料枠内運用
- Google Cloud Run: 従量課金 (通常運用で月数ドル程度)
- Firebase Authentication: 無料枠内 (パスワードレスメール認証は月 10K auth まで無料)
- Google Maps API: 無料枠内、制限機能実装

### 監視・ログ

- エラー監視
- API使用量監視
- ユーザー行動分析（基本的な指標のみ）

## 制約・前提条件

### 技術制約

- Google Maps API無料枠内での運用
- 個人開発のためミニマム構成
- iOS Safari の ITP により、iOS からのアクセスでは HttpOnly Cookie が 7 日程度でパージされうる (Cloud Run + Firebase Hosting 構成の IP prefix 不一致による)。iOS Safari (通常ブラウザ) はメール認証がリカバリ手段になるが、**iOS PWA (ホーム画面追加) は Safari と分離されメールリンクも Safari で開かれるため、メール認証では復旧できない**。この抜け穴は Firebase Custom Token 経由の「デバイス引き継ぎ」でカバーする

### ビジネス制約

- 収益化は当面考慮しない
- 個人・小グループでの利用を想定

### 設計制約

- リアルタイム同期における競合解決は後勝ちルール
- 認可は URL の秘匿性 + session_id で担保する (認証は必須ではない)
- メール認証 (オプション) はパスワードレス方式のみ (SNS 認証は未対応)
