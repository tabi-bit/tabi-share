# DB 運用 Runbook

通常運用では発生しないが、年に数回〜数年に 1 度発生する **DB に対する破壊的・大規模な変更** の進め方をまとめる。Alembic で完結する無停止スキーマ変更は対象外（`server/README.md` の Alembic 手順を参照）。

## 想定するユースケース

| ケース | 例 |
|---|---|
| リージョン移行 | Neon `us-east-1` → `ap-southeast-1` 等 |
| プロバイダ移行 | Neon → Cloud SQL on `asia-northeast1` 等 |
| メジャーバージョン更新 | Postgres 16 → 17 等で in-place アップグレードが不可能なとき |
| 大規模データ再構築 | 設計変更で `pg_dump` → 変換 → リストアが必要なとき |

これらは「読み書き双方が止まるダウンタイム」「Secret 切替」「データ移行」を伴うため、通常マイグレーションとは分けて扱う。

## 共通フロー

```
[1] 計画 (スコープ・所要時間・ロールバック条件)
        ↓
[2] 切替先 DB の準備
        ↓
[3] ローカル準備 (psql/pg_dump、環境変数)
        ↓
[4] メンテナンスモード ON   ※書き込みを止める必要があるケースのみ
        ↓
[5] 旧 DB から pg_dump
        ↓
[6] 新 DB へ psql でリストア (もしくは変換適用)
        ↓
[7] 件数 / スキーマの整合性確認
        ↓
[8] Secret Manager の DATABASE_URL_* を新 URL に差し替え
        ↓
[9] Cloud Run を新リビジョンで再デプロイ
        ↓
[10] 疎通確認 + レイテンシー計測
        ↓
[11] メンテナンスモード OFF
        ↓
[12] 旧 DB をしばらく保持 → 問題なければ削除
```

## 手順

### 1. 計画

事前に決めておくこと:

- **対象環境**: staging だけか、production も含むか
- **所要時間の見積もり**: ダンプサイズと回線速度から計算（経験的に数十件規模の Trip データなら 5-10 分）
- **メンテナンス枠の調整**: production の場合はユーザー告知の要不要を判断
- **ロールバック条件**: 「リストア後の件数が不一致」「疎通確認で 500 系」など中断ラインを明確に
- **作業者と立会い**: 1 人作業はミスのコストが高い。可能なら 2 人 (作業者 + チェッカー) で

### 2. 切替先 DB の準備

ケースに応じて新 DB を立てる。Neon の場合の例:

1. Neon Console > **New Project**
2. Region / Postgres version を選択（旧と同じバージョンが基本。`pg_dump` の出力をそのままリストアできる）
3. Database name は旧と同じ名前（`neondb` 等）にするとリストア時のリネームが不要
4. 作成後、Project Dashboard > **Connect** → **Connection pooling: ON** で pooled connection string をコピー
   - 形: `postgresql://<user>:<password>@ep-<...>-pooler.c-<n>.<region>.aws.neon.tech/<db>?sslmode=require&channel_binding=require`

Cloud SQL に切り替える場合は `scripts/setup-gcp.sh` で削除した Cloud SQL セクションを参考に手動でセットアップ（または別途 Terraform 化）。

### 3. ローカル準備

```bash
# macOS の場合、PostgreSQL クライアントを入れる
brew install libpq
brew link --force libpq
psql --version  # 旧 DB と同じメジャーバージョン以上であることを確認

# 旧 DB と新 DB の接続文字列を環境変数に入れる
export OLD_DB_URL='postgresql://...@ep-<...>.<old-region>.aws.neon.tech/neondb?sslmode=require'
export NEW_DB_URL='postgresql://...@ep-<...>.<new-region>.aws.neon.tech/neondb?sslmode=require'
```

- `*-pooler` ホストは PgBouncer 経由。`pg_dump` / `psql` には pooler ではない方（Neon Console で「Connection pooling: OFF」の URL）を使う。pooler 経由だとプリペアドステートメント関連の制約で失敗するケースがある
- Cloud Run からのアプリ接続は逆に pooler を使う（短命接続を効率化するため）

### 4. メンテナンスモード ON

書き込みを止める必要があるケース（production）のみ実施。最も手軽なのは Cloud Run のトラフィックを 0% に切ること:

```bash
gcloud run services update-traffic <SERVICE_NAME> \
    --region=asia-northeast1 \
    --to-revisions=<現リビジョン名>=0 \
    --project=<GCP_PROJECT_ID>
```

クライアントには 503 が返るので、フロントエンド側で「メンテナンス中」表示に切り替えるか、事前告知だけで運用する。staging は呼び出しが少なければスキップ可能。

### 5. 旧 DB から pg_dump

```bash
pg_dump --no-owner --no-acl --clean --if-exists \
    --file=/tmp/tabi-share-$(date +%Y%m%d-%H%M).sql \
    "${OLD_DB_URL}"
```

オプションの意味:

- `--no-owner` / `--no-acl`: 新 DB のロール構成と整合させるため所有者・権限情報を除外
- `--clean --if-exists`: リストア時に既存テーブルを `DROP IF EXISTS` する SQL を仕込む（新 DB が空でなくても再リストアできる）

ダンプ後の sanity check:

```bash
ls -lh /tmp/tabi-share-*.sql
head -5 /tmp/tabi-share-*.sql  # 冒頭が "-- PostgreSQL database dump" で始まる
```

### 6. 新 DB へリストア

```bash
psql "${NEW_DB_URL}" --single-transaction --set ON_ERROR_STOP=on -f /tmp/tabi-share-*.sql
```

- `--single-transaction`: 全体を 1 トランザクションで実行。途中失敗時は完全ロールバック
- `--set ON_ERROR_STOP=on`: 最初のエラーで即停止 (`--single-transaction` と組み合わせて使う)

### 7. 整合性確認

```bash
psql "${NEW_DB_URL}" -c "
  SELECT 'trips'     AS t, count(*) FROM trips
  UNION ALL SELECT 'pages',     count(*) FROM pages
  UNION ALL SELECT 'blocks',    count(*) FROM blocks
  UNION ALL SELECT 'locations', count(*) FROM locations;
"
```

旧 DB と件数が一致することを確認する。スキーマ差分が懸念される場合は `pg_dump --schema-only` を両 DB で取得して `diff` する。

### 8. Secret 切替

新 DB の **pooler 付き**接続文字列を Secret に新 version として登録:

```bash
printf '%s' "${NEW_DB_URL_POOLER}" \
    | gcloud secrets versions add DATABASE_URL_<ENV> \
        --data-file=- --project=<GCP_PROJECT_ID>
```

旧 version は即削除せず `disabled` で残すとロールバックが速い:

```bash
gcloud secrets versions list DATABASE_URL_<ENV> --project=<GCP_PROJECT_ID>
gcloud secrets versions disable <旧バージョン番号> \
    --secret=DATABASE_URL_<ENV> --project=<GCP_PROJECT_ID>
```

> **ロールバック注意**: `latest` は単に最新の version 番号を指すので、旧 version を `enable` し直しただけでは `latest` が新 version を指したまま。旧 version の内容を新しい version として再 add するか、Cloud Run の `--update-secrets=DATABASE_URL=DATABASE_URL_<ENV>:N` で番号を明示する。前者の方が運用は素直。

### 9. Cloud Run を新リビジョンで再デプロイ

Cloud Run は Secret を起動時に解決するので、新 Secret 反映には新リビジョンの作成が必要。`--update-secrets` を同値で再指定すれば新リビジョンが作られる:

```bash
gcloud run services update <SERVICE_NAME> \
    --region=asia-northeast1 \
    --project=<GCP_PROJECT_ID> \
    --update-secrets=DATABASE_URL=DATABASE_URL_<ENV>:latest
```

### 10. 疎通確認 + 計測

```bash
# 200 が返るか
curl -s "https://<service-url>/health"
curl -s "https://<service-url>/trips/url/<既存の url_id>" | head -c 200
```

`scripts/measure_staging.py` で前後比較が取れる:

```bash
uv run --with httpx --no-project scripts/measure_staging.py \
    --base-url https://<service-url> \
    --url-id <既存 trip の url_id> \
    --warmup 5 --iters 30 \
    --jsonl /tmp/post-change.jsonl
```

Cloud Logging 側の計装ログは `scripts/fetch_latency_logs.sh` で取得。

### 11. メンテナンスモード OFF

production の場合、トラフィックを新リビジョンに戻す:

```bash
gcloud run services update-traffic <SERVICE_NAME> \
    --region=asia-northeast1 \
    --to-latest \
    --project=<GCP_PROJECT_ID>
```

### 12. 旧 DB の保持と削除

最低 1 週間程度は旧 DB を残し、不具合発生時のロールバック先を確保する。問題なく動いていることを確認できたら旧 Project / インスタンスを削除する。

## ロールバック

切替後に問題が見つかった場合:

1. 旧 DB URL の内容を Secret に新 version として add（または旧 version の内容を再 add）
2. Cloud Run を再デプロイ (`--update-secrets=DATABASE_URL=DATABASE_URL_<ENV>:latest`)
3. 整合性確認: メンテナンスモードを正しく敷いていれば、切替後に新 DB に書き込まれたデータは無いはずなのでロスは無い

メンテナンスを敷かずに切替えたケース（staging の動作確認時など）で新 DB に書き込みが入っていれば、その差分は失われる。production では必ずメンテナンスを敷くこと。

## 注意点

- **Pooler vs Direct**: アプリ (Cloud Run) からは pooler、`pg_dump` / `psql` は direct ホストを使う
- **Postgres バージョン差**: メジャーバージョンが違うと `pg_dump` 出力が直接通らないことがある。新 DB 作成時に旧と同じバージョンを選ぶ
- **`alembic_version` テーブル**: ダンプに含まれるので新 DB も自動的に同じマイグレーションヘッドを指す。新 DB に `alembic upgrade head` を別途実行する必要は無い
- **`channel_binding=require`**: Neon の接続文字列に付いている。`asyncpg` 経由では `connect_args` から除去している (`server/app/config.py`)。`psql` から直接接続する場合はそのまま使える
- **Free プラン制限**: Neon Free は Compute が 5 分アイドルでサスペンドされる。最初の 1 リクエストでウェイクアップ待ちが入るため、計測時は十分なウォームアップを取ること

## Case Study: Issue #124 リージョン移行 (2026-05-23)

本 Runbook は Issue #124 のレイテンシー改善で実施した検証作業から起こしたものなので、最初のケーススタディとして残しておく。

### 背景

- 旧構成: Cloud Run (asia-northeast1) ⇄ Neon (us-east-1) のクロスリージョン
- 1 RTT ≈ 160-180ms。1 リクエストで 3-5 ラウンドトリップ取られ、p50 1.5sec / p95 1.6-1.7sec
- 改善目標: p95 < 500ms (Issue #124)

### 実施した手順

本 Runbook の手順 1 〜 11 のうち、staging に対して 2 〜 11 を実施した（事前計画と post-mortem は別途実施）。

- **メンテナンスモードはスキップ**: staging は呼び出しが少なく書き込み損失を許容できると判断
- **データ移行もスキップ**: staging はテスト用 Trip 1 件しか無いため、新 DB は空のまま起動し、計測スクリプトから新 Trip を作成して計測した。production 移行時はステップ 5-7 を必ず実施する
- 切替後に `scripts/measure_staging.py` で 30 サンプル取得、Cloud Logging の計装ログと突き合わせ

### 検証結果

| route | tot_p50 us-east1 | tot_p50 sg | tot_p95 us-east1 | tot_p95 sg | 削減率 (p50) |
|---|---|---|---|---|---|
| `/trips/url/{url_id}` | 1477ms | 727ms | 1607ms | 821ms | -49% |
| `/trips/{trip_id}` | 1481ms | 728ms | 1651ms | 808ms | -51% |
| `/trips/{trip_id}/pages` | 1313ms | 647ms | 1473ms | 725ms | -51% |
| `/pages/{page_id}/blocks` | 1310ms | 646ms | 1630ms | 725ms | -56% |
| `/blocks/{block_id}` | 1147ms | 644ms | 1478ms | 723ms | -44% |

内訳:

- PK SELECT 1 本の `db_max_ms` p50: 325.7ms → 159.6ms（≒ RTT 半減）
- `total_ms - db_total_ms` p50 も 660ms → 325ms と半減。middleware で測れていない部分（`pool_pre_ping` の SELECT 1、接続確立、prepare phase など）も RTT 律速だったことが判明

### 学び / Runbook へのフィードバック

- `pg_dump` を pooler URL に対して実行するとエラーになる → 「Pooler vs Direct」セクションで明示
- Secret v6 (Singapore) を disable しても `latest` が v6 のままで失敗する → 「ロールバック注意」セクションで明示
- Cloud Run の Secret 再注入は `--update-secrets` を同値で再指定するだけで OK → 手順 9 に反映済み
