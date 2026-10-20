# データベース (Supabase)

stg / prod とも Supabase の PostgreSQL (Free プラン、東京 `ap-northeast-1`) を使う。
プロジェクトは環境ごとに分け、Free プランの利用制限が org 単位でかかるため org も分ける。

## 接続

Cloud Run からは Supavisor の transaction mode (6543 番ポート) で接続する。
Secret Manager の `DATABASE_URL_STAGING` / `DATABASE_URL_PROD` の形式:

```text
postgresql://postgres.<project_ref>:<password>@aws-<n>-ap-northeast-1.pooler.supabase.com:6543/postgres?sslmode=verify-full&sslrootcert=certs/supabase-prod-ca-2021.crt
```

- transaction mode は prepared statement を保持できないため、asyncpg / SQLAlchemy のキャッシュを無効にしている (`server/app/db_connection.py` の `get_connect_args()`)
- 直接接続 (`db.<project_ref>.supabase.co`) は IPv6 のみのため Cloud Run からは使わない
- `pg_dump` / `psql` は session mode (5432 番ポート) で接続する

## SSL

Supabase の証明書は Supabase 独自の CA が発行しているため、ルート CA (`server/certs/supabase-prod-ca-2021.crt`) を同梱し、証明書チェーンとホスト名を検証する。
中間 CA に Key Usage 拡張が無く Python 3.13 既定の `VERIFY_X509_STRICT` で拒否されるため、strict 検証だけを外している。

ルート CA の期限は **2031-04-26**。差し替えるときはダッシュボード (Database Settings → SSL Configuration) から取得し、フィンガープリントを確認する:

```bash
openssl x509 -in server/certs/supabase-prod-ca-2021.crt -noout -fingerprint -sha256
# 80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA
```

## プロジェクト設定

| 設定 | 値 | 理由 |
|---|---|---|
| Data API | 無効 | アプリは Postgres に直接接続し RLS を使っていない。有効だと公開前提の publishable key で全テーブルを読み書きできる |
| SSL enforcement | 有効 | 既定では TLS なしの接続も受け付けるため |

## Free プランの制約

- DB が 500 MB を超えると read-only になる
- 自動バックアップ・PITR が無い
- アクティビティが少ない状態が 7 日続くと一時停止される。再開はダッシュボードから手動
- egress は 5 GB/月
