#!/bin/bash
# PWA開発用のローカルHTTPS証明書をセットアップするスクリプト
# モバイル端末からプライベートIPでPWAスタンドアロン動作を確認する際に必要
set -e

CERT_FILE=".dev-cert.pem"
KEY_FILE=".dev-key.pem"

# 証明書が既に存在する場合はスキップ
if [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ]; then
  echo "証明書は既に存在します: $CERT_FILE, $KEY_FILE"
  exit 0
fi

# mkcertの存在確認（devcontainerのビルド時にインストール済み）
if ! command -v mkcert &> /dev/null; then
  echo "エラー: mkcert がインストールされていません"
  echo "devcontainerを再ビルド、またはmkcertをインストールしてください"
  exit 1
fi

# プライベートIPを取得
LOCAL_IP=$(hostname -I | awk '{print $1}')

echo "証明書を生成しています (localhost, 127.0.0.1, $LOCAL_IP)..."
mkcert -key-file "$KEY_FILE" -cert-file "$CERT_FILE" localhost 127.0.0.1 ::1 "$LOCAL_IP"

echo ""
echo "セットアップ完了！"
echo "  https://$LOCAL_IP:5173 でアクセスできます"
echo ""
echo "※ モバイル端末では証明書警告が出ますが「続行」で利用できます"
