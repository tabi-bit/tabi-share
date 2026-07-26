# DBの論理設計図

```mermaid
erDiagram
  Users {
    bigint id PK
    varchar firebase_uid UK "nullable、Firebase Auth UID（匿名 user は NULL）"
    timestamp created_at
  }
  Sessions {
    varchar id PK "Cookie に載る session_id（不透明トークン）"
    bigint user_id FK
    timestamp created_at
    timestamp last_seen_at
  }
  UserTripAccess {
    bigint id PK
    bigint user_id FK "(user_id, trip_id) の UNIQUE 制約に含まれる"
    bigint trip_id FK "(user_id, trip_id) の UNIQUE 制約に含まれる"
    bool archived "一覧からアーカイブされたか"
    timestamp granted_at
  }
  Trips {
    bigint id PK
    varchar url_id UK "URLに含めるハッシュ値"
    varchar title
    text detail "nullable"
    date start_date "nullable"
    date end_date "nullable"
    timestamp created_at
    timestamp updated_at
    timestamp last_edited_at "配下 Page/Block の変更も含む"
  }
  Pages {
    bigint id PK
    bigint trip_id FK
    varchar title
    date date "nullable、ページの単日程"
  }
  Blocks {
    bigint id PK
    varchar title
    timestamp start_time "UTC"
    timestamp end_time "nullable、UTC"
    bigint page_id FK
    text detail "nullable"
    varchar block_type "schedule / move"
    varchar transportation_type "nullable、move のみ"
    bigint location_id FK "nullable、schedule=この場所 / move=出発地"
    bigint destination_location_id FK "nullable、move の目的地"
  }
  Locations {
    bigint id PK
    varchar google_place_id "nullable、Google Places の place_id"
    varchar name
    text address "nullable"
    float latitude "nullable"
    float longitude "nullable"
    varchar website_uri "nullable"
    timestamp created_at
    timestamp updated_at
  }
  DeviceSubscriptions {
    bigint id PK
    varchar fcm_token "FCM registration token"
    bigint trip_id FK "購読対象 Trip"
    smallint minutes_before "通知先行分（1-120）"
    varchar timezone "IANA TZ"
    varchar user_agent "nullable、デバッグ用"
    timestamp created_at
    timestamp last_seen_at
  }
  SentNotifications {
    bigint block_id PK,FK
    varchar fcm_token PK
    varchar kind PK "現状 before_5min 固定"
    timestamp sent_at "送信ロック取得時刻"
  }

  Users ||--o{ Sessions : "1 user に複数デバイス"
  Users ||--o{ UserTripAccess : ""
  Trips ||--o{ UserTripAccess : ""
  Trips ||--o{ Pages : ""
  Pages ||--o{ Blocks : ""
  Locations ||--o{ Blocks : "location_id"
  Locations ||--o{ Blocks : "destination_location_id"
  Trips ||--o{ DeviceSubscriptions : ""
  Blocks ||--o{ SentNotifications : ""
```

## 認可モデルの補足

- 認可判定は常に `UserTripAccess` を参照する（認証・未認証で分岐しない）
- Cookie 発行時に匿名 `User` レコード (`firebase_uid IS NULL`) を自動作成
- Firebase Auth 認証時、匿名 user の `firebase_uid` を埋めて昇格、または既存 user へマージ
- `UserTripAccess.(user_id, trip_id)` の UNIQUE 制約と `INSERT ... ON CONFLICT DO NOTHING` により、並列付与の race を idempotent 化
