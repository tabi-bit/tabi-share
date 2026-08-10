#!/usr/bin/env bash
# =============================================================================
# Cloud Logging から計装ログ (jsonPayload.type="request") を取得して
# JSONL を stdout に出力するスクリプト (#124)
#
# 使い方:
#   GCP_PROJECT_ID=<id> ./scripts/fetch_latency_logs.sh staging \
#       "2026-05-23T12:00:00Z" "2026-05-23T13:00:00Z" \
#       > /tmp/staging_latency_logs.jsonl
#
# 前提: gcloud CLI がインストール済みで `gcloud auth login` 済み、
#       jq がインストール済み。
# =============================================================================
set -euo pipefail

ENV="${1:?第 1 引数に環境名 (staging|prod) を指定してください}"
SINCE="${2:?第 2 引数に開始 ISO8601 (例: 2026-05-23T12:00:00Z) を指定してください}"
UNTIL="${3:?第 3 引数に終了 ISO8601 (例: 2026-05-23T13:00:00Z) を指定してください}"
LIMIT="${LIMIT:-2000}"

case "${ENV}" in
  staging) SERVICE="tabi-share-api-staging" ;;
  prod|production) SERVICE="tabi-share-api-prod" ;;
  *)
    echo "エラー: 環境名は staging または prod を指定してください (受け取った値: ${ENV})" >&2
    exit 1
    ;;
esac

if [[ -z "${GCP_PROJECT_ID:-}" ]]; then
  echo "エラー: GCP_PROJECT_ID 環境変数を設定してください" >&2
  exit 1
fi

FILTER="resource.type=\"cloud_run_revision\"
AND resource.labels.service_name=\"${SERVICE}\"
AND jsonPayload.type=\"request\"
AND timestamp>=\"${SINCE}\"
AND timestamp<=\"${UNTIL}\""

gcloud logging read "${FILTER}" \
  --project="${GCP_PROJECT_ID}" \
  --format=json \
  --limit="${LIMIT}" \
  --order=asc \
  | jq -c '.[] | {
      ts: .timestamp,
      method: .jsonPayload.method,
      path: .jsonPayload.path,
      route: .jsonPayload.route,
      status: .jsonPayload.status,
      total_ms: .jsonPayload.total_ms,
      db_query_count: .jsonPayload.db_query_count,
      db_total_ms: .jsonPayload.db_total_ms,
      db_max_ms: .jsonPayload.db_max_ms,
      db_slowest_sql: .jsonPayload.db_slowest_sql
    }'
