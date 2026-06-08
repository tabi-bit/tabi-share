#!/bin/bash


# TabiShare開発環境セットアップスクリプト
echo "🚀 TabiShare開発環境をセットアップしています..."

# 現在のディレクトリを取得
CURRENT_DIR=$(pwd)

# プロジェクトルートディレクトリに移動
SCRIPT_DIR=$(cd $(dirname $0) && pwd)
cd "$SCRIPT_DIR"
cd ..
ROOT_DIR=$(pwd)

# パッケージ依存関係をインストール
echo "📦 パッケージをインストール中..."
cd "$ROOT_DIR"
pnpm run sync

# --- データベースのセットアップ ---
# データベースの起動、ユーザー作成、データベース作成、マイグレーションを行うスクリプトを実行する
# setup_database.sh の失敗を握り潰さず、ここでセットアップ全体を中断する
echo "🚀 Starting database setup..."
if ! sh ./scripts/setup_database.sh; then
  echo "❌ Error: database setup failed. Aborting setup." >&2
  cd "$CURRENT_DIR"
  exit 1
fi

# Claude Code
curl -fsSL https://claude.ai/install.sh | bash
uv tool install claude-monitor

# Firebase CLI Tools
pnpm add -g firebase-tools

# PWA開発用のmkcertをインストール
curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64"
chmod +x mkcert-v*-linux-amd64
sudo cp mkcert-v*-linux-amd64 /usr/local/bin/mkcert
rm -f mkcert-v*-linux-amd64
mkcert -install
echo "🔒 mkcert installed for local HTTPS development."

echo "✅ セットアップが完了しました！"
echo ""
echo "🎯 開発サーバーを起動するには:"
echo "  pnpm run dev"
echo ""
echo "🌐 各サービスのURL:"
echo "  フロントエンド: http://localhost:3000"
echo "  バックエンドAPI: http://localhost:8000"
echo "  Storybook: http://localhost:6006"

cd "$CURRENT_DIR"
