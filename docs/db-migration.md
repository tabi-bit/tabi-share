# DB 移行 SOP

Neon DB のリージョン切替を実施するときの作業手順書。Issue #124 のレイテンシー改善を契機に、`us-east-1` → `ap-southeast-1 (Singapore)` の切替を行うことを想定して書かれている。将来同じ要領で別リージョンへ移すときも同じ手順を使う。

## 背景

Cloud Run は `asia-northeast1` (東京)、DB は Neon の `us-east-1` (バージニア) という構成で長らく運用していたため、太平洋越え RTT (約 160-180ms) が 1 リクエストあたり数往復積み上がり、`db_total_ms` が 800ms 級、p50 1.5 sec というレイテンシーを生んでいた。

実測値:

| 環境 | PK SELECT 1 本 `db_max_ms` p50 | 1 クエリ平均 | `total_ms - db_total_ms` p50 | `/trips/{id}` p50 |
|---|---|---|---|---|
| us-east-1 | 325.7ms | 210ms | 660ms | 1481ms |
| ap-southeast-1 | 159.6ms | 108ms | 325ms | 728ms |

差分はほぼ RTT 半減に一致する。詳細は Issue #124。

## 前提

- Neon Console と GCP プロジェクトの管理権限を持っていること
- ローカルに `gcloud` (認証済み) と PostgreSQL クライアント (`psql` / `pg_dump`) があること
  - macOS: `brew install libpq && brew link --force libpq`
- 切替対象環境 (staging / production) を事前に決めていること
- production の場合は事前にメンテナンスを告知していること

## 全体フロー

```
[1] 新 Neon Project 作成
        ↓
[2] PostgreSQL クライアント準備
        ↓
[3] (production のみ) メンテナンスモード ON
        ↓
[4] 旧 DB から pg_dump
        ↓
[5] 新 DB へ psql -f でリストア
        ↓
[6] Secret Manager の DATABASE_URL_* を新 URL に差し替え
        ↓
[7] Cloud Run を新リビジョンで再デプロイ
        ↓
[8] 疎通確認 + レイテンシー計測
        ↓
[9] (production のみ) メンテナンス解除
        ↓
[10] 旧 Neon Project をしばらく保持 → 問題なければ削除
```

## 手順

### 1. 新 Neon Project 作成

1. Neon Console > **New Project**
2. Region: 切替先（例: `AWS Asia Pacific 1 (Singapore)` = `ap-southeast-1`）
3. Postgres version: 旧 DB と同じバージョン (例: 16)
4. Database name: `neondb` (旧と同じ名前にすると `pg_dump` の出力をそのままリストアできる)
5. 作成後、Project Dashboard > **Connect** → **Connection pooling: ON** → 接続文字列をコピー
   - `postgresql://<user>:<password>@ep-<...>-pooler.c-<n>.<region>.aws.neon.tech/<db>?sslmode=require&channel_binding=require` の形

### 2. PostgreSQL クライアント準備

```bash
# macOS の場合
brew install libpq
brew link --force libpq
psql --version  # ≥ 16 を確認
```

旧 Neon と新 Neon の双方の接続文字列を環境変数に入れておくとミスを減らせる:

```bash
export OLD_DB_URL='postgresql://...@ep-<...>.<old-region>.aws.neon.tech/neondb?sslmode=require'
export NEW_DB_URL='postgresql://...@ep-<...>.<new-region>.aws.neon.tech/neondb?sslmode=require'
```

- `*-pooler` ホストは PgBouncer 経由。`pg_dump` は **pooler ではない方** (`-pooler` を含まないホスト) を使うこと。Neon Console の「Connection pooling: OFF」で表示される URL を使う
- リストア時の `psql` も同様に pooler ではない方が無難（プリペアドステートメント関連の制約があるため）

### 3. (production のみ) メンテナンスモード ON

ユーザーの書き込みが入ると新 DB に取りこぼされるため、production では切替中の書き込みを止める必要がある。最も手軽なのは Cloud Run のトラフィックを 0% に切ること:

```bash
gcloud run services update-traffic tabi-share-api-prod \
    --region=asia-northeast1 \
    --to-revisions=<現リビジョン名>=0 \
    --project=<GCP_PROJECT_ID>
```

クライアントには 503 が返るので、フロントエンド側で「メンテナンス中」表示に切り替えるか、事前告知だけで運用する。

### 4. 旧 DB から pg_dump

```bash
pg_dump --no-owner --no-acl --clean --if-exists \
    --file=/tmp/tabi-share-$(date +%Y%m%d-%H%M).sql \
    "${OLD_DB_URL}"
```

オプションの意味:

- `--no-owner` / `--no-acl`: 新 DB のロール構成と整合させるため所有者・権限情報を除外
- `--clean --if-exists`: リストア時に既存テーブルを `DROP IF EXISTS` する SQL を仕込む（新 DB が空でなくても再リストアできる）

ダンプ後、ファイルサイズが極端に小さくないか・冒頭が `-- PostgreSQL database dump` で始まるかを確認:

```bash
ls -lh /tmp/tabi-share-*.sql
head -5 /tmp/tabi-share-*.sql
```

### 5. 新 DB へリストア

```bash
psql "${NEW_DB_URL}" --single-transaction --set ON_ERROR_STOP=on -f /tmp/tabi-share-*.sql
```

- `--single-transaction`: 全体を 1 トランザクションで実行。途中失敗時は完全ロールバック
- `--set ON_ERROR_STOP=on`: 最初のエラーで即停止 (`--single-transaction` と組み合わせて使う)

リストア後に件数確認:

```bash
psql "${NEW_DB_URL}" -c "SELECT 'trips' AS t, count(*) FROM trips UNION ALL SELECT 'pages', count(*) FROM pages UNION ALL SELECT 'blocks', count(*) FROM blocks UNION ALL SELECT 'locations', count(*) FROM locations;"
```

旧 DB と件数が一致することを確認する。

### 6. Secret 切替

新 DB の接続文字列 (pooler ホスト) を Secret に新 version として登録:

```bash
# staging を切り替える例
printf '%s' "${NEW_DB_URL_POOLER}" \
    | gcloud secrets versions add DATABASE_URL_STAGING \
        --data-file=- --project=<GCP_PROJECT_ID>
```

`NEW_DB_URL_POOLER` は手順 1 で取得した **`-pooler` 付き**の接続文字列（Cloud Run からは常に pooler 経由で接続する）。

旧 version は即削除せず `disabled` 状態で残すと、不具合時のロールバックが速い:

```bash
# 直前のバージョン番号を確認
gcloud secrets versions list DATABASE_URL_STAGING --project=<GCP_PROJECT_ID>
# 必要なら旧 version を disable
gcloud secrets versions disable <旧バージョン番号> \
    --secret=DATABASE_URL_STAGING --project=<GCP_PROJECT_ID>
```

> **ロールバック手段**: 旧 version を再 `enable` しただけでは `latest` が新 version を指したままなので、旧 version の内容をコピーして新 version として再 add するか、Cloud Run の `--update-secrets` で `:N` を明示指定する。前者の方が運用は素直。

### 7. Cloud Run を新リビジョンで再デプロイ

Cloud Run は Secret を起動時に解決するので、新 Secret 反映には新リビジョンの作成が必要。`--update-secrets` を同値で再指定すれば new revision が作られる:

```bash
gcloud run services update tabi-share-api-staging \
    --region=asia-northeast1 \
    --project=<GCP_PROJECT_ID> \
    --update-secrets=DATABASE_URL=DATABASE_URL_STAGING:latest
```

### 8. 疎通確認 + レイテンシー計測

代表エンドポイントで 200 が返ることをまず確認:

```bash
curl -s "https://<service-url>/health"
curl -s "https://<service-url>/trips/url/<既存の url_id>" | head -c 200
```

そのうえで `scripts/measure_staging.py` で再計測すると、切替前後の `total_ms` / `db_total_ms` 差分を数値で押さえられる:

```bash
uv run --with httpx --no-project scripts/measure_staging.py \
    --base-url https://<service-url> \
    --url-id <既存 trip の url_id> \
    --warmup 5 --iters 30 \
    --jsonl /tmp/post-migration.jsonl
```

Cloud Logging 側のログ取得は `scripts/fetch_latency_logs.sh` を使う。

### 9. (production のみ) メンテナンス解除

Cloud Run のトラフィックを新リビジョンに戻す:

```bash
gcloud run services update-traffic tabi-share-api-prod \
    --region=asia-northeast1 \
    --to-latest \
    --project=<GCP_PROJECT_ID>
```

### 10. 旧 Neon Project の保持と削除

最低 1 週間程度は旧 Project を残し、不具合発生時のロールバック先を確保する。問題なく動いていることが確認できたら Neon Console の Project Settings > Delete から削除する。

## ロールバック手順

切替後に問題が見つかった場合の手戻り手順:

1. 旧 DB URL を Secret に新 version として add（または旧 version の内容を再 add）
2. Cloud Run を再デプロイ (`--update-secrets=DATABASE_URL=DATABASE_URL_*:latest`)
3. ロールバック後の整合性確認: 切替後に新 DB に書き込まれたデータがあれば失われる。production の場合は手順 3 でメンテナンス中に書き込みを止めているのでロスは無いはず

## 注意点

- **Pooler vs Direct**: Cloud Run からは pooler ホストを使うが、`pg_dump` / `psql` は直接ホスト (pooler でない方) で行う。pooler 経由だとプリペアドステートメントの扱いで失敗するケースがある
- **Postgres バージョン差**: メジャーバージョンが違うと `pg_dump` の出力が直接通らない。新 Project 作成時に旧と同じバージョンを選ぶ
- **`alembic_version` テーブル**: ダンプに含まれるので新 DB も自動的に同じマイグレーションヘッドを指す。新 DB に対して別途 `alembic upgrade head` を実行する必要は無い
- **`channel_binding=require`**: Neon の接続文字列には付いているが、`asyncpg` 経由では `connect_args` から除去している (`server/app/config.py`)。`psql` から直接接続する場合はそのまま使える
- **Free プラン制限**: Compute は 5 分アイドルでサスペンドされる。最初の 1 リクエストでウェイクアップ待ちが入るため計測時はウォームアップ必須
