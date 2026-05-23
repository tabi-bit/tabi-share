#!/usr/bin/env bash
# =============================================================================
# GCP インフラ初回セットアップスクリプト
# 実行: bash scripts/setup-gcp.sh
# 前提:
#   - gcloud CLI がインストール済みで認証済みであること
#   - 環境変数 GCP_PROJECT_ID をセット済みであること
#   - DB は外部マネージド (Neon) を使用する前提。事前に Neon Project を作成し、
#     DATABASE_URL_PROD / DATABASE_URL_STAGING Secret を手動で登録しておくこと。
#     DB のリージョン移行手順は docs/db-migration.md を参照。
# =============================================================================
set -euo pipefail

# =============================================================================
# Section 1: 変数定義
# =============================================================================
PROJECT_ID="${GCP_PROJECT_ID:-your-project-id}"
REGION="asia-northeast1"

# PROJECT_ID が未設定の場合は早期終了
if [[ "${PROJECT_ID}" == "your-project-id" || -z "${PROJECT_ID}" ]]; then
  echo "エラー: GCP_PROJECT_ID 環境変数を設定するか、スクリプト内の PROJECT_ID を編集してください。" >&2
  exit 1
fi

REPO_NAME="tabi-share"
ARTIFACT_REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}"

RUNTIME_SA_NAME="tabi-share-api-runtime"
RUNTIME_SA="${RUNTIME_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

GITHUB_SA_NAME="tabi-share-github-actions"
GITHUB_SA="${GITHUB_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

GITHUB_REPO="${GITHUB_REPO:-tabi-bit/tabi-share}"   # GitHub リポジトリ (owner/repo)
# GITHUB_REPO の形式を検証 (インジェクション対策)
if [[ ! "${GITHUB_REPO}" =~ ^[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+$ ]]; then
  echo "エラー: GITHUB_REPO の形式が不正です (正しい例: owner/repo): ${GITHUB_REPO}" >&2
  exit 1
fi
WIF_POOL_NAME="github-actions-pool"
WIF_PROVIDER_NAME="github-actions-provider"

# DB は外部マネージド (Neon) を使用するため、Cloud SQL 関連の変数は使用しない。
# 過去に Cloud SQL を使う想定だった名残として INSTANCE_NAME 等の変数は残してあるが、
# 本スクリプトでは参照していない。GCP 内 DB に切替える場合の参考は git log で辿れる。

CLOUD_RUN_PROD="tabi-share-api-prod"
CLOUD_RUN_STAGING="tabi-share-api-staging"

# =============================================================================
# Section 2: GCP API 有効化
# =============================================================================
echo "==> GCP API を有効化しています..."
# sqladmin.googleapis.com は外部マネージド DB (Neon) を使うため有効化していない。
# GCP 内 Cloud SQL に切り替える場合は sqladmin.googleapis.com を追加すること。
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  --project="${PROJECT_ID}"

echo "API 有効化完了"

# =============================================================================
# Section 3: Artifact Registry リポジトリ作成
# =============================================================================
echo "==> Artifact Registry リポジトリを作成しています..."
if ! gcloud artifacts repositories describe "${REPO_NAME}" \
    --location="${REGION}" --project="${PROJECT_ID}" &>/dev/null; then
  gcloud artifacts repositories create "${REPO_NAME}" \
    --repository-format=docker \
    --location="${REGION}" \
    --description="Tabi Share API イメージリポジトリ" \
    --project="${PROJECT_ID}"
  echo "Artifact Registry 作成完了: ${ARTIFACT_REGISTRY}"
else
  echo "Artifact Registry は既に存在します: ${ARTIFACT_REGISTRY}"
fi

# =============================================================================
# Section 4: Cloud Run 用サービスアカウント (runtime SA)
# =============================================================================
echo "==> Cloud Run ランタイム用サービスアカウントを作成しています..."
if ! gcloud iam service-accounts describe "${RUNTIME_SA}" \
    --project="${PROJECT_ID}" &>/dev/null; then
  gcloud iam service-accounts create "${RUNTIME_SA_NAME}" \
    --display-name="Tabi Share API Runtime" \
    --project="${PROJECT_ID}"
fi

# 外部マネージド DB (Neon) を TCP/SSL で叩くため、Cloud SQL クライアント権限は不要。
# GCP 内 Cloud SQL に切り替える場合は roles/cloudsql.client を付与すること。

echo "ランタイム SA 設定完了: ${RUNTIME_SA}"
# Note: Secret Manager の読み取り権限は Section 7 で個別シークレットに対して付与する。
# プロジェクト全体への付与は最小権限の原則に反するため行わない。

# =============================================================================
# Section 5: GitHub Actions 用サービスアカウント + Workload Identity Federation
# =============================================================================
echo "==> GitHub Actions 用サービスアカウントを作成しています..."
if ! gcloud iam service-accounts describe "${GITHUB_SA}" \
    --project="${PROJECT_ID}" &>/dev/null; then
  gcloud iam service-accounts create "${GITHUB_SA_NAME}" \
    --display-name="Tabi Share GitHub Actions" \
    --project="${PROJECT_ID}"
fi

# Cloud Run 管理権限
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${GITHUB_SA}" \
  --role="roles/run.admin"

# Artifact Registry 書き込み権限
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${GITHUB_SA}" \
  --role="roles/artifactregistry.writer"

# ランタイム SA を利用する権限
gcloud iam service-accounts add-iam-policy-binding "${RUNTIME_SA}" \
  --member="serviceAccount:${GITHUB_SA}" \
  --role="roles/iam.serviceAccountUser" \
  --project="${PROJECT_ID}"

# Cloud Run Jobs 実行権限 (マイグレーション用)
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${GITHUB_SA}" \
  --role="roles/run.developer"

echo "==> Workload Identity Federation を設定しています..."

# WIF プール作成
if ! gcloud iam workload-identity-pools describe "${WIF_POOL_NAME}" \
    --location=global --project="${PROJECT_ID}" &>/dev/null; then
  gcloud iam workload-identity-pools create "${WIF_POOL_NAME}" \
    --location=global \
    --display-name="GitHub Actions Pool" \
    --project="${PROJECT_ID}"
fi

# WIF プロバイダー作成
if ! gcloud iam workload-identity-pools providers describe "${WIF_PROVIDER_NAME}" \
    --workload-identity-pool="${WIF_POOL_NAME}" \
    --location=global --project="${PROJECT_ID}" &>/dev/null; then
  gcloud iam workload-identity-pools providers create-oidc "${WIF_PROVIDER_NAME}" \
    --workload-identity-pool="${WIF_POOL_NAME}" \
    --location=global \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.actor=assertion.actor,attribute.ref=assertion.ref" \
    --attribute-condition="assertion.repository=='${GITHUB_REPO}'" \
    --project="${PROJECT_ID}"
fi

# WIF を通じた SA 借用を許可
WIF_POOL_ID=$(gcloud iam workload-identity-pools describe "${WIF_POOL_NAME}" \
  --location=global --project="${PROJECT_ID}" \
  --format="value(name)")

gcloud iam service-accounts add-iam-policy-binding "${GITHUB_SA}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${WIF_POOL_ID}/attribute.repository/${GITHUB_REPO}" \
  --project="${PROJECT_ID}"

WIF_PROVIDER_FULL="${WIF_POOL_ID}/providers/${WIF_PROVIDER_NAME}"
echo ""
echo "=== GitHub Secrets に以下を設定してください ==="
echo "GCP_PROJECT_ID                : ${PROJECT_ID}"
echo "GCP_WORKLOAD_IDENTITY_PROVIDER: ${WIF_PROVIDER_FULL}"
echo "GCP_SERVICE_ACCOUNT           : ${GITHUB_SA}"
echo "================================================"
echo ""

# =============================================================================
# Section 6: DB (Neon) は外部で作成する
# =============================================================================
# このプロジェクトでは Cloud SQL ではなく Neon (外部マネージド Postgres) を使用する。
# Neon Project の作成とリージョン移行手順は docs/db-migration.md を参照。
# 本スクリプトでは Cloud Run から DB に繋ぐための Secret (DATABASE_URL_*) が
# 既に登録済みであることを前提とし、IAM 権限の付与のみ行う。

# =============================================================================
# Section 7: DATABASE_URL Secret の存在チェックと IAM 設定
# =============================================================================
echo "==> DATABASE_URL_* Secret の存在を確認しています..."
for SECRET_NAME in "DATABASE_URL_PROD" "DATABASE_URL_STAGING"; do
  if ! gcloud secrets describe "${SECRET_NAME}" \
      --project="${PROJECT_ID}" &>/dev/null; then
    echo "エラー: Secret '${SECRET_NAME}' が存在しません。" >&2
    echo "  先に Neon の接続文字列を取得し、以下のように登録してください:" >&2
    echo "    printf '%s' '<DATABASE_URL>' | gcloud secrets versions add ${SECRET_NAME} --data-file=- --project=${PROJECT_ID}" >&2
    echo "  Secret 自体が無ければ versions add の代わりに create を使用してください。" >&2
    exit 1
  fi
done

# ランタイム SA と GitHub Actions SA に Secret 読み取り権限を付与。
# 後者はマイグレーション実行 (Cloud Run Jobs) で DATABASE_URL を参照するため必要。
for SECRET_NAME in "DATABASE_URL_PROD" "DATABASE_URL_STAGING"; do
  gcloud secrets add-iam-policy-binding "${SECRET_NAME}" \
    --member="serviceAccount:${RUNTIME_SA}" \
    --role="roles/secretmanager.secretAccessor" \
    --project="${PROJECT_ID}"
  gcloud secrets add-iam-policy-binding "${SECRET_NAME}" \
    --member="serviceAccount:${GITHUB_SA}" \
    --role="roles/secretmanager.secretAccessor" \
    --project="${PROJECT_ID}"
done

# =============================================================================
# Section 8: Cloud Run サービス (placeholder) 作成
# =============================================================================
echo "==> Cloud Run サービス (placeholder) を作成しています..."

PLACEHOLDER_IMAGE="us-docker.pkg.dev/cloudrun/container/hello"

for SERVICE_NAME in "${CLOUD_RUN_PROD}" "${CLOUD_RUN_STAGING}"; do
  if [ "${SERVICE_NAME}" = "${CLOUD_RUN_PROD}" ]; then
    SECRET_NAME="DATABASE_URL_PROD"
  else
    SECRET_NAME="DATABASE_URL_STAGING"
  fi

  if ! gcloud run services describe "${SERVICE_NAME}" \
      --region="${REGION}" --project="${PROJECT_ID}" &>/dev/null; then
    # --allow-unauthenticated: 旅程の閲覧はログイン不要の設計仕様のため Cloud Run レベルは公開。
    # 書き込み操作はアプリケーションレベルの Firebase Authentication で認可を行う。
    gcloud run deploy "${SERVICE_NAME}" \
      --image="${PLACEHOLDER_IMAGE}" \
      --region="${REGION}" \
      --service-account="${RUNTIME_SA}" \
      --set-secrets="DATABASE_URL=${SECRET_NAME}:latest" \
      --allow-unauthenticated \
      --port=8080 \
      --project="${PROJECT_ID}"
    echo "Cloud Run サービス作成完了: ${SERVICE_NAME}"
  else
    echo "Cloud Run サービスは既に存在します: ${SERVICE_NAME}"
  fi
done

echo ""
echo "=== セットアップ完了 ==="
echo "次のステップ:"
echo "1. 上記の GitHub Secrets を GitHub リポジトリに設定してください"
echo "2. develop ブランチに push して staging への自動デプロイを確認してください"
echo "3. main ブランチに push して production への自動デプロイを確認してください"
echo "========================"
