# 地図連携機能 要件定義書

## 概要

予定ブロック・移動ブロックにおける地図関連操作をアプリ内で完結させ、Googleマップとのタブ/アプリ切り替えの手間を削減する機能。

### 解決する課題

- Googleマップとのタブ・アプリ間の行き来が発生しUXが悪い
- ホテルや観光地の場所を手動でURL貼り付けする手間
- 移動ブロックの所要時間を毎回Googleマップで調べる手間

### 対象ユーザー

- 旅程を作成・編集するユーザー（Firebase認証済み）
- 旅程を閲覧するユーザー（未認証でもアクセス可能）

---

## 実装フェーズ

### Phase A: 予定ブロック - 場所検索・Pin設定

ダイアログ内で地図を開き、場所を検索・選択してブロックに紐づける。

### Phase B: 移動ブロック - ルート検索・所要時間取得

前後ブロックの場所から所要時間・距離を自動計算する。アプリ内では地図・ポリラインを表示せず、テキストベースで距離・所要時間を表示する。ルートの視覚的確認はGoogle Mapsリンクに委譲する（Google Mapsの操作性に勝てない部分は無理に再現しない方針）。

### Phase C: 移動ブロック - 経路の自動入力

前後の予定ブロックの場所情報から出発地・目的地を自動セットする。

---

## 技術選定

### Google Maps Platform（選択肢A: フル連携）

UXと検索精度を優先し、Google Maps Platformをフル活用する。

| API | 用途 | 料金/1,000リクエスト | 月間無料枠 |
|---|---|---|---|
| Maps JavaScript API | 地図ダイアログ内の地図表示 | $7.00 | - |
| Places Autocomplete (New) | 場所検索（Essentials tier） | $2.83 | 10,000 |
| **Places UI Kit Query** | **POI情報表示（gmp-place-details-compact）** | **$1.00** | **10,000** |
| Routes API | ルート・所要時間計算（Essentials tier） | $5.00 | 10,000 |

**Place Details API（fetchFields）は使わない方針**: 表示名（displayName）はProtier $17/1Kになるため、UI Kitで代替する（同等機能で17倍安い）。

### コスト試算（個人・小グループ利用）

月間$200の無料クレジット（全API合算）内での運用を前提とする。

| 操作 | 月間想定回数 | 月額 |
|---|---|---|
| 地図ダイアログを開く（JS API） | 100回 | $0.70 |
| 場所検索Autocomplete（500件中10,000件は無料枠内） | 500回 | $0 |
| POI情報表示（UI Kit、10,000件無料枠内） | 300回 | $0 |
| ルート計算（Routes、10,000件無料枠内） | 200回 | $0 |
| **合計** | | **$0.70/月** |

ほぼ全SKUがそれぞれ独立した月10,000件の無料枠内に収まる（2025年3月以降の価格体系）。Maps JS API自体には無料枠がないが$7/1K単価は低いため、個人利用なら$1/月未満で運用可能。
**注**: 地図ダイアログはPhase A（場所検索）でのみ使用。Phase B（ルート検索）では地図を表示しないため、Maps JS APIの呼び出し回数を抑制。

### コスト抑制策

- 閲覧画面（View）では地図APIを使用しない（Googleマップへのリンクで代替）
- 地図ダイアログは明示的な操作時のみ開く（自動ロードしない）
- Place Details・ルート計算結果はバックエンドDBでキャッシュ
- ルート検索は時間指定なし（リアルタイム交通情報を使わない）でEssentials tierに抑える
- 将来的にコストが増加した場合、時間指定ルート検索を制限する

---

## データモデル

Blockテーブルとは別テーブルに分離し、FK参照で紐づける。
将来的な場所の再利用（お気に入り、過去に使った場所など）に対応しやすい設計とする。

### locationsテーブル（新規）

予定ブロックに紐づく場所情報を管理する。

| カラム | 型 | 説明 |
|---|---|---|
| id | Integer (PK) | 自動採番 |
| google_place_id | String(255) / nullable | Google Places API の place_id（検索から選択時のみ） |
| name | String(200) | 場所名 |
| address | Text / nullable | 住所 |
| latitude | Float / nullable | 緯度（地図タップ or 検索から取得） |
| longitude | Float / nullable | 経度（地図タップ or 検索から取得） |
| created_at | DateTime | 作成日時 |
| updated_at | DateTime | 更新日時 |

**補足**: google_place_idと緯度経度は独立してnullable。Places検索からの選択なら両方あり、地図タップなら緯度経度のみ、のケースがある。

### routesテーブル（新規）

移動ブロックに紐づくルート情報を管理する。

| カラム | 型 | 説明 |
|---|---|---|
| id | Integer (PK) | 自動採番 |
| origin_location_id | Integer (FK → locations.id) | 出発地 |
| destination_location_id | Integer (FK → locations.id) | 目的地 |
| distance_meters | Integer / nullable | 距離（メートル） |
| duration_seconds | Integer / nullable | 所要時間（秒） |
| transportation_mode | String(50) | 交通手段（アプリ内の値: car, train等） |
| created_at | DateTime | 作成日時 |
| updated_at | DateTime | 更新日時 |

### blocksテーブルの拡張

| カラム | 型 | 説明 |
|---|---|---|
| location_id | Integer (FK → locations.id) / nullable | 予定ブロックの場所 |
| route_id | Integer (FK → routes.id) / nullable | 移動ブロックのルート |

**データ整合性制約**:
- `block_type = 'event' / 'stay'` の場合: `route_id` は必ず NULL
- `block_type = 'move'` の場合: `location_id` は必ず NULL
- アプリケーション層のバリデーション（Pydanticスキーマ）で強制し、DBレベルでも CHECK 制約を設定する

### 交通手段のマッピング

アプリ内の `transportation_type` と Routes API の `travelMode` の対応表。

| アプリ内の値 | Routes API travelMode | 備考 |
|---|---|---|
| car | DRIVE | - |
| bicycle | BICYCLE | - |
| walk | WALK | - |
| train | TRANSIT | - |
| bus | TRANSIT | - |
| shinkansen | TRANSIT | - |
| ship | DRIVE | Routes APIに船舶モードなし。DRIVEで代替 |
| flight | - | Routes API対象外。ルート検索は使用不可 |

**注意**: `TRANSIT`にマッピングされる交通手段（train, bus, shinkansen）はRoutes APIで同一の結果を返す。キャッシュキーにはアプリ内の値ではなくRoutes APIの `travelMode` を使用する。

### キャッシュテーブル（新規）

API呼び出し結果のキャッシュ。

#### place_details_cacheテーブル

Place Details APIの結果をキャッシュする。Autocomplete結果はクエリが多様すぎてキャッシュ効率が低いため、キャッシュ対象外とする。

| カラム | 型 | 説明 |
|---|---|---|
| id | Integer (PK) | 自動採番 |
| google_place_id | String(255) / unique | Google place_id |
| result_json | JSON | API応答のJSON |
| created_at | DateTime | 作成日時 |
| expires_at | DateTime | 有効期限（作成から30日） |

#### route_cacheテーブル

| カラム | 型 | 説明 |
|---|---|---|
| id | Integer (PK) | 自動採番 |
| origin_key | String(255) | 出発地キー（place_id または "lat,lng" 形式） |
| destination_key | String(255) | 目的地キー（place_id または "lat,lng" 形式） |
| travel_mode | String(50) | Routes API の travelMode（DRIVE, WALK等） |
| result_json | JSON | API応答のJSON |
| created_at | DateTime | 作成日時 |
| expires_at | DateTime | 有効期限（作成から7日） |

**キャッシュキーの生成ルール**: google_place_idがある場合はplace_idを、ない場合は `"<latitude>,<longitude>"` の文字列をキーとして使用する。これにより、地図タップで設定した地点（place_idなし）でもキャッシュが機能する。

### レコード削除ルール

- **ブロック削除時**: 所有する locations レコードも同時に削除する（各ブロックが独自の location を持ち、dedup しない方針のため孤立防止）。routes レコードは複数ブロックから参照される可能性があるため、紐づけ解除のみ行う
- **孤立レコードの清掃**: routes レコードについて、定期的にどのブロックからも参照されていないレコードを削除するバッチ処理を将来的に検討。初期実装では不要（データ量が少ないため）
- **キャッシュテーブル**: `expires_at` を超えたレコードは次回クエリ時に無視し、定期バッチまたはAPI呼び出し時に削除

---

## 機能仕様

### Phase A: 予定ブロック - 場所検索・Pin設定

#### 編集画面（Edit）

1. **地図ダイアログの起動**
   - AddBlockDialog / EditBlockDialog に「場所を設定」ボタンを追加
   - ボタン押下で地図ダイアログ（別ダイアログ）を開く
   - モバイルではフルスクリーンのシートとして表示

2. **地図ダイアログの機能**
   - Google Maps JavaScript API による地図表示
   - Places Autocomplete による場所検索バー
   - 検索結果から場所を選択するとPinが地図上に表示される
   - 地図をタップ/クリックしてもPinを配置可能
   - 「決定」ボタンで場所情報をブロックに反映

3. **場所情報の保存フロー**

   **EditBlockDialogの場合:**
   - 地図ダイアログで場所を確定
   - `POST /api/v1/locations` で場所データを保存（既存のgoogle_place_idがあれば再利用）
   - `PUT /api/v1/blocks/{block_id}/location` でブロックに紐づけ
   - ブロックのtitleは変更しない（場所名は別フィールドで管理）

   **AddBlockDialogの場合:**
   - 地図ダイアログで場所を確定 → ローカルstateに場所データを保持
   - ブロック作成API（`POST /api/v1/pages/{page_id}/blocks`）のリクエストボディに場所データを含めて送信
   - サーバー側でlocationsテーブルへの保存とblocksへの紐づけを1トランザクションで実行

4. **場所の編集・削除**
   - 設定済みの場所がある場合、ボタンは「場所を変更」に表示変更
   - 場所の削除（紐づけ解除）も可能

#### 閲覧画面（View）

- 場所情報があるブロックに場所名・住所をテキスト表示
- 場所名タップでGoogleマップアプリ/ブラウザで開く
  - URL形式: `https://www.google.com/maps/search/?api=1&query=<lat>,<lng>&query_place_id=<place_id>`
  - place_idがない場合: `https://www.google.com/maps/search/?api=1&query=<lat>,<lng>`
- 地図APIは使用しない（コスト$0）

### Phase B: 移動ブロック - ルート検索・所要時間取得

#### 設計方針

アプリ内にGoogle Maps相当のルート地図UIを構築しない。理由:
- 複数ルート比較、ドラッグ変更、交通情報表示等はGoogle Mapsの操作性に勝てない
- Maps JS APIの読み込みコスト（$7/1,000回）を削減できる
- 旅程計画で本当に必要な情報は「所要時間」と「距離」であり、ルートの視覚確認はGoogle Mapsに委譲する

#### 編集画面（Edit）

1. **ルート検索UIの起動**
   - EditBlockDialog に「ルートを検索」ボタンを追加
   - ボタン押下でルート検索パネル（ダイアログ内のセクション展開）を表示
   - 別ダイアログは開かず、EditBlockDialog内で完結する

2. **ルート検索パネルの機能**
   - 出発地・目的地の入力欄（Places Autocomplete付き）
   - 交通手段の選択（既存のtransportation_typeを使用）
   - 「検索」ボタンで Routes API を呼び出し
   - 距離・所要時間をテキストで表示（例: 「45km・約1時間」）
   - 「Google Mapsでルートを見る」リンク（タップでGoogle Maps起動）
     - URL形式: `https://www.google.com/maps/dir/?api=1&origin=<出発地>&destination=<目的地>&travelmode=<mode>`
     - place_idがある場合は `origin_place_id` / `destination_place_id` パラメータも付与
   - 「決定」ボタンでルート情報をブロックに反映

3. **ルート情報の保存フロー**
   - バックエンドでRoutes APIを呼び出し（キャッシュ確認 → なければAPI呼び出し）
   - routesテーブルにルートデータを保存
   - blocksテーブルのroute_idを更新
   - ブロックの所要時間（start_time / end_time）にルート所要時間を反映

4. **コスト制御**
   - Routes APIはEssentials tier（リアルタイム交通情報なし）を使用
   - 同一区間・同一交通手段のルートはバックエンドDBでキャッシュ（TTL: 7日）
   - `flight`（飛行機）はRoutes API対象外のため、ルート検索ボタンを非表示にする
   - 将来的にコスト増加時は検索回数制限を導入可能

#### 閲覧画面（View）

- ルート情報がある移動ブロックに距離・所要時間をテキスト表示
- タップでGoogleマップのルート案内を開く
  - URL形式: `https://www.google.com/maps/dir/?api=1&origin=<lat>,<lng>&destination=<lat>,<lng>&travelmode=<mode>`
- 地図APIは使用しない（コスト$0）

### Phase C: 移動ブロック - 経路の自動入力

1. **前後ブロックからの自動入力**
   - 移動ブロックの「ルートを検索」ボタン押下時
   - 前のブロック（予定ブロック）にlocation_idが設定されていれば → 出発地に自動セット
   - 後のブロック（予定ブロック）にlocation_idが設定されていれば → 目的地に自動セット
   - ユーザーは自動入力された値を手動で変更可能

2. **自動入力の判定ロジック**
   - 同一ページ内で、対象移動ブロックの直前・直後のブロックを取得
   - 時間順でソートし、隣接する予定ブロックのlocation_idを参照

---

## API設計（バックエンド）

全エンドポイントは `/api/v1/` プレフィックスで統一する（既存規約に準拠）。

### 認証要件

- 場所・ルート・Place検索の全エンドポイント: **Firebase認証必須**（編集モードのユーザーのみ）
- 閲覧系エンドポイント（ブロック取得時にlocation/route情報を含む）: 認証不要（既存のブロック取得APIと同じ）

### 場所関連

| メソッド | パス | 認証 | 説明 |
|---|---|---|---|
| POST | `/api/v1/locations` | 必須 | 場所の作成（google_place_idで重複チェック） |
| GET | `/api/v1/locations/{id}` | 不要 | 場所の取得 |
| PUT | `/api/v1/blocks/{block_id}/location` | 必須 | ブロックに場所を紐づけ |
| DELETE | `/api/v1/blocks/{block_id}/location` | 必須 | ブロックから場所の紐づけを解除 |

### ルート関連

| メソッド | パス | 認証 | 説明 |
|---|---|---|---|
| POST | `/api/v1/routes/search` | 必須 | ルート検索（キャッシュ確認 → API呼び出し） |
| GET | `/api/v1/routes/{id}` | 不要 | ルートの取得 |
| PUT | `/api/v1/blocks/{block_id}/route` | 必須 | ブロックにルートを紐づけ |
| DELETE | `/api/v1/blocks/{block_id}/route` | 必須 | ブロックからルートの紐づけを解除 |

### Place検索（プロキシ）

| メソッド | パス | 認証 | 説明 |
|---|---|---|---|
| GET | `/api/v1/places/autocomplete?query=xxx` | 必須 | Place Autocomplete プロキシ |
| GET | `/api/v1/places/{place_id}` | 必須 | Place Details（キャッシュ付きプロキシ） |

### APIレスポンス設計

ブロック取得API（既存）のレスポンスに、紐づくlocation/routeオブジェクトをネストして含める。

```json
// 予定ブロックの例
{
  "id": 1,
  "title": "草津温泉",
  "block_type": "event",
  "location_id": 10,
  "location": {
    "id": 10,
    "google_place_id": "ChIJ...",
    "name": "草津温泉",
    "address": "群馬県吾妻郡草津町...",
    "latitude": 36.6213,
    "longitude": 138.5960
  },
  ...
}

// 移動ブロックの例
{
  "id": 2,
  "title": "移動",
  "block_type": "move",
  "route_id": 5,
  "route": {
    "id": 5,
    "origin_location_id": 10,
    "destination_location_id": 11,
    "distance_meters": 45000,
    "duration_seconds": 3600,
    "transportation_mode": "car"
  },
  ...
}
```

これにより、フロントエンドはブロック取得時に追加のAPI呼び出しなしでlocation/route情報を表示できる。

### フロントエンド型定義の拡張

既存のZodスキーマ + 型分離パターンに準拠して拡張する。

```typescript
// Location型（新規）
type Location = {
  id: number;
  googlePlaceId: string | null;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
};

// Route型（新規）
type Route = {
  id: number;
  originLocationId: number;
  destinationLocationId: number;
  distanceMeters: number | null;
  durationSeconds: number | null;
  transportationMode: string;
};

// ScheduleBlock に追加
type ScheduleBlock = {
  ...既存フィールド,
  locationId: number | null;
  location: Location | null;
};

// TransportationBlock に追加
type TransportationBlock = {
  ...既存フィールド,
  routeId: number | null;
  route: Route | null;
};
```

Google Maps APIキーはバックエンドで管理し、フロントエンドには公開しない。
ただしMaps JavaScript APIキーはフロントエンドで使用するため、HTTPリファラー制限で保護する。

---

## UX仕様

### 地図ダイアログ（Phase A: 場所検索）

- PC: 通常のダイアログ（中〜大サイズ）
- モバイル: フルスクリーンシート
- 既存のEditBlockDialog / AddBlockDialog とは別ダイアログとして開く
- ダイアログ内での操作はローカルstate → 「決定」で実データに反映

### ルート検索パネル（Phase B: ルート検索）

- EditBlockDialog内のセクション展開として表示（別ダイアログは不要）
- 地図は表示しない。出発地・目的地入力、検索ボタン、結果テキスト、Google Mapsリンクで構成
- 検索結果はローカルstate → 「決定」で実データに反映

### ボタンの表示ルール

- 予定ブロック（schedule）: 「場所を設定」/「場所を変更」ボタン
- 移動ブロック（transportation）: 「ルートを検索」ボタン
  - `flight`（飛行機）の場合はボタン非表示

### エラーハンドリング

- API呼び出し失敗時: トースト通知でエラー表示、リトライ可能
- オフライン時: 地図ダイアログの起動を無効化（既存のオフライン検出を活用）
- 月間API使用量が閾値に近づいた場合: ログ通知（管理者向け）

---

## セキュリティ

### Google Maps APIキーの構成

用途別に4つのキーを作成し、環境変数で管理する。

| キー種別 | 対象環境 | 環境変数 | アプリケーション制限 |
|---|---|---|---|
| フロントエンド開発用 | ローカル開発 + staging | `VITE_GOOGLE_MAPS_API_KEY`（`.env` / `.env.stg`） | HTTPリファラー（localhost + staging URL） |
| バックエンド開発用 | ローカル開発 + staging | `GOOGLE_MAPS_API_KEY`（`.env` / `.env.stg`） | なし（サーバー間通信のため） |
| フロントエンド本番用 | 本番 | `VITE_GOOGLE_MAPS_API_KEY`（`.env.prod`） | HTTPリファラー（本番ドメインのみ） |
| バックエンド本番用 | 本番 | `GOOGLE_MAPS_API_KEY`（`.env.prod`） | なし（サーバー間通信のため） |

### 有効化するAPI（全キー共通）

| API | 用途 |
|---|---|
| Maps JavaScript API | 地図表示（フロントエンドで使用） |
| Places API (New) | 場所検索Autocomplete（フロントエンドで使用） |
| Places UI Kit | POI情報表示用Web Component（`<gmp-place-details-compact>`、フロントエンドで使用） |
| Maps Embed API | 地図埋め込み（将来の拡張用） |
| Routes API | ルート検索・所要時間計算（バックエンドで使用、Phase B） |

**重要**: 「Places API (New)」と「Places UI Kit」は別のAPIなので、両方有効化が必要。Places UI Kitのエンドポイントは`placewidgets.googleapis.com`。

**補足**:
- フロントエンドキーとバックエンドキーで利用APIは重複するが、アプリケーション制限の違いにより用途を分離する
- バックエンドキーのIPアドレス制限は本番インフラ（Railway）のIP固定化状況に応じて将来的に導入検討

### その他のセキュリティ要件

- APIキーはdotenvxで暗号化された`.env` / `.env.stg` / `.env.prod`に保存し、リポジトリにコミットしない
- 場所・ルート・Place検索の全変更系エンドポイント: Firebase認証必須
- 閲覧画面はAPI呼び出しなし（Googleマップリンクのみ）

---

## 技術スタック追加

### フロントエンド

- `@vis.gl/react-google-maps`: Google Maps JavaScript API の React バインディング（Google公式サポート、deck.glチーム管理）
  - Phase A（場所検索ダイアログ）でのみ使用。Phase B（ルート検索）では地図を表示しないため不要

### バックエンド

- `googlemaps`: Google Maps Platform の Python クライアントライブラリ

### 環境変数追加

| 変数名 | 用途 | 設定ファイル |
|---|---|---|
| `GOOGLE_MAPS_API_KEY` | バックエンド用 Google Maps APIキー | `.env` / `.env.stg` / `.env.prod` |
| `VITE_GOOGLE_MAPS_API_KEY` | フロントエンド用 Google Maps APIキー（HTTPリファラー制限付き） | `.env` / `.env.stg` / `.env.prod` |

**設定方法**: dotenvxで暗号化された状態で保存する。

```bash
# ローカル開発 + staging（共通キー）
npx dotenvx set VITE_GOOGLE_MAPS_API_KEY <dev-frontend-key>
npx dotenvx set GOOGLE_MAPS_API_KEY <dev-backend-key>
npx dotenvx set VITE_GOOGLE_MAPS_API_KEY <dev-frontend-key> -f .env.stg
npx dotenvx set GOOGLE_MAPS_API_KEY <dev-backend-key> -f .env.stg

# 本番
npx dotenvx set VITE_GOOGLE_MAPS_API_KEY <prod-frontend-key> -f .env.prod
npx dotenvx set GOOGLE_MAPS_API_KEY <prod-backend-key> -f .env.prod
```

---

## 今後の検討事項

- 旅程全体の地図（全スポットをマップ上にプロット）は将来的に検討
- お気に入りスポットの管理・再利用機能
- API使用量のモニタリングダッシュボード
- コスト増加時のレート制限実装
- 孤立したlocations/routesレコードの定期クリーンアップバッチ
