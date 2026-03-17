#!/bin/bash
# Devcontainer作成後に実行されるセットアップスクリプト

# --- 権限設定 ---
# ホームディレクトリ全体の所有権をコンテナ内の 'vscode' ユーザーに設定する
echo "🔧 Setting ownership of home directory..."
sudo chown -R vscode:vscode ~

# 'vscode' ユーザーがパスワード入力なしで 'sudo' コマンドを実行できるように設定する
# これにより、コンテナ内でのパッケージインストールなどが対話なしで実行可能になる
echo "🔧 Configuring sudo access for vscode user..."
echo "vscode ALL=(ALL) NOPASSWD: ALL" | sudo tee /etc/sudoers.d/vscode > /dev/null


# --- 環境変数の読み込み ---
ENV_FILE=".env"
echo "🔍 Checking for .env file..."

if [ -f "$ENV_FILE" ]; then
  # `dotenvx` を使い、.envファイルの情報を環境変数として読み込む
  echo "✅ Found .env file. Loading environment variables..."
  export $(npx dotenvx get --format=shell)
else
  # .envファイルが見つからない場合は、処理を中断する
  echo "❌ Error: .env file not found at project root!"
  echo "Please create .env from the example and rebuild the container."
  exit 1
fi


# --- アプリケーションのセットアップ ---
# アプリケーション固有のセットアップ（依存関係のインストール、マイグレーションなど）を実行する
echo "🚀 Starting application setup..."
./scripts/setup.sh


# --- データベースのセットアップ ---
# データベースの起動、ユーザー作成、データベース作成、マイグレーションを行うスクリプトを実行する
echo "🚀 Starting database setup..."
sh ./scripts/setup_database.sh

# Claude Code
npm install -g @anthropic-ai/claude-code
uv tool install claude-monitor

# Gemini CLI
npm install -g @google/gemini-cli
echo "🎉 All setup steps completed successfully!"

# Firebase CLI Tools
npm install -g firebase-tools

# AI検索用にripgrepをインストール
sudo apt-get update
sudo apt-get install -y ripgrep libnss3-tools
echo "🔍 ripgrep installed for AI search functionality."

# PWA開発用のmkcertをインストール
curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64"
chmod +x mkcert-v*-linux-amd64
sudo cp mkcert-v*-linux-amd64 /usr/local/bin/mkcert
mkcert -install
echo "🔒 mkcert installed for local HTTPS development."
