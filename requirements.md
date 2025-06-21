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
- **閲覧**: ログイン不要、tripId（ハッシュ化）を知っていれば誰でもアクセス可能
- **編集**: Firebase Authenticationによるメール認証（パスワードレス）
- **セッション**: 長期間有効
- **権限管理**:
  - 旅程作成者: 削除権限、AI機能利用権限
  - 編集参加者: 閲覧画面から「一緒に編集する」ボタンで編集モードに移行

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

### Phase 3
#### 追加管理機能
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
- **認証**: Firebase Authentication

#### バックエンド
- **フレームワーク**: Python + FastAPI
- **データベース**: MySQL
- **リアルタイム通信**: WebSocket（Socket.io検討）

#### インフラ
- **フロントエンド**: Firebase Hosting
- **バックエンド**: Railway
- **データベース**: Railway MySQL

#### 外部API
- **地図**: Google Maps API（無料枠内運用）

### 非機能要件
#### 性能要件
- リアルタイム同期レスポンス: 1秒以内
- 画面遷移: 2秒以内
- モバイル対応

#### セキュリティ要件
- tripIdのハッシュ化によるURL推測防止
- Firebase Authenticationによる認証
- HTTPS通信

#### 可用性要件
- サービス稼働率: 99%以上
- コールドスタート回避（Railway使用）

## URL設計

### URL構造
```
閲覧/編集共通: /trip/[secureHashId]
```

### アクセスパターン
1. **閲覧モード**: 誰でもアクセス可能
2. **編集モード**: 「一緒に編集する」ボタン → Firebase認証 → 編集モード切り替え

### tripId仕様
- ランダムハッシュ値（推測困難）
- 例: nanoid(16) または crypto.randomUUID() + timestamp

## データ構造（概要）

### 旅程データ
```typescript
interface Trip {
  id: string; // ハッシュ化されたID
  title: string;
  createdBy: string; // Firebase UID
  createdAt: Date;
  updatedAt: Date;
  routes: Route[];
  metadata: TripMetadata;
}

interface Route {
  id: string;
  name: string;
  blocks: Block[];
  isActive: boolean;
}

interface Block {
  id: string;
  type: 'spot' | 'travel';
  spotData?: SpotData;
  travelData?: TravelData;
  order: number;
}

interface SpotData {
  name: string;
  address: string;
  duration: number; // 分
  memo: string;
}

interface TravelData {
  from: string;
  to: string;
  duration: number; // 分
  buffer: number; // バッファ時間（分）
  method: string; // 移動手段
  cost: number;
  memo: string;
}
```

## 開発フェーズ

### Phase 1: MVP（最小機能）
- 基本的なブロックUI実装
- ドラッグ&ドロップ機能
- Firebase認証実装
- 閲覧/編集権限機能

### Phase 2: 中核機能
- Google Maps API連携
- リアルタイム同期機能
- モバイル対応

### Phase 3: 拡張機能  
- 外部URL管理画面
- AI機能実装
- 各種最適化

## 運用・保守要件

### コスト管理
- Firebase Hosting: 無料枠内運用
- Railway: 月額3-5ドル程度
- Google Maps API: 無料枠内、制限機能実装

### 監視・ログ
- エラー監視
- API使用量監視
- ユーザー行動分析（基本的な指標のみ）

## 制約・前提条件

### 技術制約
- Google Maps API無料枠内での運用
- 個人開発のためミニマム構成

### ビジネス制約
- 収益化は当面考慮しない
- 個人・小グループでの利用を想定

### 設計制約
- リアルタイム同期における競合解決は後勝ちルール
- 認証はメール認証のみ（SNS認証は未対応）