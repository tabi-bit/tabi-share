#!/bin/bash

# TabiShare開発環境セットアップスクリプト
echo "🚀 TabiShare開発環境をセットアップしています..."

# 現在のディレクトリを取得
CURRENT_DIR=$(pwd)

# このスクリプトの実行ディレクトリを取得
SCRIPT_DIR=$(cd $(dirname $0) && pwd)
cd "$SCRIPT_DIR"

# ルートディレクトリのNode.js依存関係をインストール
echo "📦 ルートディレクトリのパッケージをインストール中..."
cd ../
npm ci

# フロントエンドディレクトリのNode.js依存関係をインストール
echo "📦 フロントエンドのパッケージをインストール中..."
cd front
npm ci

# バックエンドディレクトリのPython依存関係をインストール
echo "🐍 バックエンドのPython依存関係をインストール中..."
cd ../server
pip install -r requirements.txt

echo "✅ セットアップが完了しました！"
echo ""
echo "🎯 開発サーバーを起動するには:"
echo "  npm run dev"
echo ""
echo "🌐 各サービスのURL:"
echo "  フロントエンド: http://localhost:3000"
echo "  バックエンドAPI: http://localhost:8000"
echo "  Storybook: http://localhost:6006"

cd "$CURRENT_DIR"