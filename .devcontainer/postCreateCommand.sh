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


# --- データベースのセットアップ ---
# データベースの起動、ユーザー作成、データベース作成を行うスクリプトを実行する
echo "🚀 Starting database setup..."
sh .devcontainer/setup_database.sh


# --- アプリケーションのセットアップ ---
# アプリケーション固有のセットアップ（依存関係のインストール、マイグレーションなど）を実行する
echo "🚀 Starting application setup..."
./scripts/setup.sh


# --- データベースマイグレーション ---
# Alembicを使用してデータベースを最新バージョンにマイグレーションする
echo "🔄 Running database migrations..."
cd server

# 開発用データベースのマイグレーション
echo "📦 Migrating development database..."
if npx dotenvx run --env-file ../.env -- alembic -n devdb upgrade head; then
  echo "✅ Development database migration completed successfully!"
else
  echo "❌ Error: Development database migration failed!"
  echo "Please check the migration files and database connection."
  cd ..
  exit 1
fi

# テスト用データベースのマイグレーション
echo "📦 Migrating test database..."
if npx dotenvx run --env-file ../.env -- alembic -n testdb upgrade head; then
  echo "✅ Test database migration completed successfully!"
else
  echo "❌ Error: Test database migration failed!"
  echo "Please check the migration files and database connection."
  cd ..
  exit 1
fi

cd ..


# Claude Code
npm install -g @anthropic-ai/claude-code
uv tool install claude-monitor
claude mcp add serena -- uvx --from git+https://github.com/oraios/serena serena start-mcp-server --context ide-assistant --project $(pwd)

# Gemini CLI
npm install -g @google/gemini-cli
echo "🎉 All setup steps completed successfully!"

# Firebase CLI Tools
npm install -g firebase-tools
