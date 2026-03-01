#!/usr/bin/env bash
# =============================================================================
# GCP インフラ初回セットアップスクリプト
# 実行: bash scripts/setup-gcp.sh
# 前提: gcloud CLI がインストール済みで認証済みであること
# =============================================================================
set -euo pipefail

# =============================================================================
# Section 1: 変数定義
# =============================================================================
PROJECT_ID="${GCP_PROJECT_ID:-your-project-id}"   # 実行前に設定すること
REGION="asia-northeast1"
INSTANCE_NAME="tabi-share-db"
DB_VERSION="POSTGRES_16"
DB_TIER="db-f1-micro"

REPO_NAME="tabi-share"
ARTIFACT_REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}"

RUNTIME_SA_NAME="tabi-share-api-runtime"
RUNTIME_SA="${RUNTIME_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

GITHUB_SA_NAME="tabi-share-github-actions"
GITHUB_SA="${GITHUB_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

GITHUB_REPO="${GITHUB_REPO:-tabi-bit/tabi-share}"   # GitHub リポジトリ (owner/repo)
WIF_POOL_NAME="github-actions-pool"
WIF_PROVIDER_NAME="github-actions-provider"

DB_USER="tabi_share"
PROD_DB="prod_db"
STAGING_DB="staging_db"

CLOUD_RUN_PROD="tabi-share-api-prod"
CLOUD_RUN_STAGING="tabi-share-api-staging"

# =============================================================================
# Section 2: GCP API 有効化
# =============================================================================
echo "==> GCP API を有効化しています..."
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
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

# Cloud SQL クライアント権限
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/cloudsql.client"

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
# Section 6: Cloud SQL インスタンス・DB・ユーザー作成
# =============================================================================
echo "==> Cloud SQL インスタンスを作成しています (数分かかります)..."
if ! gcloud sql instances describe "${INSTANCE_NAME}" \
    --project="${PROJECT_ID}" &>/dev/null; then
  gcloud sql instances create "${INSTANCE_NAME}" \
    --database-version="${DB_VERSION}" \
    --edition=ENTERPRISE \
    --tier="${DB_TIER}" \
    --region="${REGION}" \
    --storage-type=SSD \
    --storage-size=10GB \
    --storage-auto-increase \
    --backup-start-time=03:00 \
    --require-ssl \
    --project="${PROJECT_ID}"
  echo "Cloud SQL インスタンス作成完了"
else
  echo "Cloud SQL インスタンスは既に存在します"
fi

# データベース作成
for DB_NAME in "${PROD_DB}" "${STAGING_DB}"; do
  if ! gcloud sql databases describe "${DB_NAME}" \
      --instance="${INSTANCE_NAME}" --project="${PROJECT_ID}" &>/dev/null; then
    gcloud sql databases create "${DB_NAME}" \
      --instance="${INSTANCE_NAME}" \
      --project="${PROJECT_ID}"
    echo "DB 作成完了: ${DB_NAME}"
  else
    echo "DB は既に存在します: ${DB_NAME}"
  fi
done

# Cloud SQL ユーザー作成
echo "==> Cloud SQL ユーザーを作成しています..."
DB_PASSWORD=$(openssl rand -base64 24)
if ! gcloud sql users describe "${DB_USER}" \
    --instance="${INSTANCE_NAME}" --project="${PROJECT_ID}" &>/dev/null; then
  gcloud sql users create "${DB_USER}" \
    --instance="${INSTANCE_NAME}" \
    --password="${DB_PASSWORD}" \
    --project="${PROJECT_ID}"
  echo "DB ユーザー作成完了: ${DB_USER}"
  echo "パスワードは Secret Manager (DATABASE_URL_PROD / DATABASE_URL_STAGING) に保存されます。"
else
  echo "DB ユーザーは既に存在します: ${DB_USER}"
  echo "このスクリプトでは既存のパスワードを取得できないため、処理を中断します。"
  echo "Secret Manager の DATABASE_URL_PROD と DATABASE_URL_STAGING は手動で設定してください:"
  echo "  postgresql://${DB_USER}:<パスワード>@/<DB名>?host=/cloudsql/${PROJECT_ID}:${REGION}:${INSTANCE_NAME}"
  echo "パスワードをリセットする場合: gcloud sql users set-password ${DB_USER} --instance=${INSTANCE_NAME} --project=${PROJECT_ID}"
  exit 1
fi

# =============================================================================
# Section 7: DATABASE_URL を Secret Manager に登録
# =============================================================================
# Cloud SQL Auth Proxy (Unix ソケット) 経由で接続する形式を使用。
# Public IP は不要なため取得しない。
for ENV in prod staging; do
  if [ "${ENV}" = "prod" ]; then
    DB_NAME="${PROD_DB}"
    SECRET_NAME="DATABASE_URL_PROD"
  else
    DB_NAME="${STAGING_DB}"
    SECRET_NAME="DATABASE_URL_STAGING"
  fi

  DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@/${DB_NAME}?host=/cloudsql/${PROJECT_ID}:${REGION}:${INSTANCE_NAME}"

  if gcloud secrets describe "${SECRET_NAME}" \
      --project="${PROJECT_ID}" &>/dev/null; then
    echo "${DATABASE_URL}" | gcloud secrets versions add "${SECRET_NAME}" \
      --data-file=- --project="${PROJECT_ID}"
    echo "Secret 更新完了: ${SECRET_NAME}"
  else
    echo "${DATABASE_URL}" | gcloud secrets create "${SECRET_NAME}" \
      --data-file=- --project="${PROJECT_ID}"
    echo "Secret 作成完了: ${SECRET_NAME}"
  fi

  # ランタイム SA に Secret アクセス権を付与
  gcloud secrets add-iam-policy-binding "${SECRET_NAME}" \
    --member="serviceAccount:${RUNTIME_SA}" \
    --role="roles/secretmanager.secretAccessor" \
    --project="${PROJECT_ID}"
done

# GitHub Actions SA にも Secret 読み取り権限を付与 (マイグレーション実行用)
for SECRET_NAME in "DATABASE_URL_PROD" "DATABASE_URL_STAGING"; do
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
