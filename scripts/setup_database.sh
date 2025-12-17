#!/bin/bash
# PostgreSQLデータベースの初期セットアップを行うスクリプト
set -e # エラーが発生した場合はスクリプトを停止する

# --- 関数定義 ---
# データベースとロール（ユーザー）が存在しない場合に作成する関数
# 引数1: DB名, 引数2: ユーザー名, 引数3: パスワード
create_database_and_role_if_not_exist() {
  local db_name=$1
  local db_user=$2
  local db_password=$3

  echo "--- Processing setup for database: '$db_name' ---"

  # 1. ロール（ユーザー）の作成
  echo "🔧 Checking for role '$db_user'..."
  if sudo -u postgres psql -tAc "SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='$db_user'" | grep -q 1; then
    echo "✅ Role '$db_user' already exists."
  else
    echo "✨ Creating role '$db_user'..."
    sudo -u postgres psql -c "CREATE ROLE \"$db_user\" LOGIN PASSWORD '$db_password'"
  fi

  # 2. データベースの作成
  echo "🔧 Checking for database '$db_name'..."
  if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$db_name"; then
    echo "✅ Database '$db_name' already exists."
  else
    echo "✨ Creating database '$db_name' with owner '$db_user'..."
    sudo -u postgres psql -c "CREATE DATABASE \"$db_name\" WITH OWNER \"$db_user\""
  fi

  # 3. デフォルト権限の設定
  echo "🔧 Setting default privileges for user '$db_user' in database '$db_name'..."
  # --- ここの "PRIVILEGES" のタイプミスを修正しました ---
  sudo -u postgres psql -d "$db_name" -c "
    ALTER DEFAULT PRIVILEGES FOR USER postgres IN SCHEMA public GRANT ALL ON TABLES TO \"$db_user\";
    ALTER DEFAULT PRIVILEGES FOR USER postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO \"$db_user\";
  "
  echo "--- Setup for '$db_name' is complete. ---"
  echo "" # 改行
}


# --- メイン処理 ---
echo "🐘 Starting PostgreSQL service..."
sudo service postgresql start

# 開発用データベースのセットアップを実行
create_database_and_role_if_not_exist "$POSTGRES_DB" "$POSTGRES_USER" "$POSTGRES_PASSWORD"

# テスト用データベースのセットアップを実行
create_database_and_role_if_not_exist "$TEST_POSTGRES_DB" "$TEST_POSTGRES_USER" "$TEST_POSTGRES_PASSWORD"


# --- データベースマイグレーション ---
# Alembicを使用してデータベースを最新バージョンにマイグレーションする

# データベースのマイグレーション用のヘルパー関数
run_migration() {
  local db_name=$1
  local db_type=$2
  echo "📦 Migrating ${db_type} database..."
  if npx dotenvx run --env-file ../.env -- alembic -n "${db_name}" upgrade head; then
    echo "✅ ${db_type} database migration completed successfully!"
    return 0
  else
    echo "❌ Error: ${db_type} database migration failed!"
    echo "Please check the migration files and database connection."
    return 1
  fi
}

# 開発用とテスト用のデータベースのマイグレーションの実行
echo "🔄 Running database migrations..."
cd server
run_migration "devdb" "development" || { cd ..; exit 1; }
run_migration "testdb" "test" || { cd ..; exit 1; }
cd ..
echo "✅ database migrations completed."

echo "🐘 All database setups are complete."
