#!/usr/bin/env bash
#
# リファクタリング用の検証ハーネス。
# DB を起動せずに「壊れていないか」「スタイル規約を満たすか」を高速に確認する。
# 全項目 (ruff check / ruff format / mypy / smoke) はゲート = 失敗したら非0で終了する。
#
# 実行内容:
#   1. ruff check   … lint。FAST002 により非-Annotated な依存/パラメータを検出する
#   2. ruff format  … フォーマット差分の有無 (--check)
#   3. mypy         … 型チェック
#   4. smoke        … ダミー DB URL でアプリを import し OpenAPI を生成できるか
#                     (FastAPI は依存注入グラフとシグネチャを登録/スキーマ生成時に検証するため、
#                      Annotated の誤りや引数順の破綻はここで必ず落ちる。DB 接続は不要)
#
# 使い方:  server/ ディレクトリで `./scripts/verify.sh`
# 終了コード: いずれか失敗で非0 (CI にそのまま組み込める)

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

fail=0

# ゲート: ベースラインでクリーンな項目。失敗したら非0で終了する。
gate() {
  local label="$1"; shift
  echo "=== [gate] ${label} ==="
  if "$@"; then
    echo "  ✓ ${label}"
  else
    echo "  ✗ ${label} FAILED"
    fail=1
  fi
  echo ""
}

gate "ruff check (FAST002 で Annotated 強制)" uv run ruff check app/
gate "ruff format --check"                    uv run ruff format --check app/
gate "mypy"                                    uv run mypy app/

echo "=== smoke: import + OpenAPI 生成 ==="
if DATABASE_URL="postgresql://u:p@localhost:5432/dummy" \
   NOTIFICATIONS_ENABLED=false \
   COOKIE_SECRET_KEY=dummy \
   API_DOCS_USERNAME=dummy \
   API_DOCS_PASSWORD=dummy \
   uv run python -c "from app.main import app; n=len(app.openapi()['paths']); assert n>0; print(f'  OpenAPI OK: {n} paths')"; then
  echo "  ✓ smoke"
else
  echo "  ✗ smoke FAILED"
  fail=1
fi
echo ""

if [ "$fail" -eq 0 ]; then
  echo "✅ すべての検証をパスしました"
else
  echo "❌ 検証に失敗した項目があります"
fi
exit "$fail"
