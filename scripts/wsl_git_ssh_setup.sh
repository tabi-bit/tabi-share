#!/bin/bash

# SSH鍵自動生成・管理スクリプト
# 目的：
# 1. Ed25519 SSH鍵ペアの自動生成
# 2. SSH鍵のクリップボードへの自動コピー
# 3. ssh-agentとkeychainによる鍵の自動管理設定
# 4. ログイン時の鍵自動ロード設定（bash/zsh両対応）
# 利点：
# - GitHubやサーバーへのSSH接続が簡単になる
# - パスフレーズの再入力が不要
# - セキュアなEd25519暗号化方式を採用

KEY_NAME=ed25519

# 必要パッケージのインストール
sudo apt update
sudo apt install -y \
  openssh-client \
  keychain \
  socat \
  xsel &&
  sudo apt clean &&
  sudo rm -rf /var/lib/apt/lists/*

# SSH鍵が存在しない場合は生成
if [ ! -f $HOME/.ssh/id_${KEY_NAME} ]; then
  echo "SSH鍵を生成しています..."
  ssh-keygen -t ${KEY_NAME}
  echo "公開鍵をクリップボードにコピーしました: id_${KEY_NAME}.pub"
  cat $HOME/.ssh/id_${KEY_NAME}.pub | xsel -bi
fi

# 使用中のシェルを判定
CURRENT_SHELL=$(basename "$SHELL")

# SSH-Agent自動起動設定を各シェルの設定ファイルに追加
SSH_AGENT_CONFIG="# SSH-Agent自動起動設定
if [ -z \"\$SSH_AUTH_SOCK\" ]; then
  RUNNING_AGENT=\"\`ps -ax | grep 'ssh-agent -s' | grep -v grep | wc -l | tr -d '[:space:]'\`\"
  if [ \"\$RUNNING_AGENT\" = \"0\" ]; then
    ssh-agent -s &> \$HOME/.ssh/ssh-agent
    eval \`cat \$HOME/.ssh/ssh-agent\` > /dev/null
    ssh-add \$HOME/.ssh/id_${KEY_NAME} 2> /dev/null
  fi
fi"

# Keychain設定
KEYCHAIN_CONFIG="# Keychain設定（SSH鍵自動管理）
if command -v keychain >/dev/null 2>&1; then
  /usr/bin/keychain -q --nogui \$HOME/.ssh/id_${KEY_NAME}
  [ -f \$HOME/.keychain/\$(hostname)-sh ] && source \$HOME/.keychain/\$(hostname)-sh
fi"

# bashの設定
if [ -f $HOME/.bash_profile ] || [ "$CURRENT_SHELL" = "bash" ]; then
  echo "bash用の設定を追加しています..."
  echo "$SSH_AGENT_CONFIG" >> $HOME/.bash_profile
fi

if [ -f $HOME/.bashrc ] || [ "$CURRENT_SHELL" = "bash" ]; then
  echo "$KEYCHAIN_CONFIG" >> $HOME/.bashrc
fi

# zshの設定
if [ -f $HOME/.zshrc ] || [ "$CURRENT_SHELL" = "zsh" ]; then
  echo "zsh用の設定を追加しています..."
  echo "$SSH_AGENT_CONFIG" >> $HOME/.zshrc
  echo "$KEYCHAIN_CONFIG" >> $HOME/.zshrc
fi

# zshでzprofileが存在する場合も対応
if [ -f $HOME/.zprofile ] || [ "$CURRENT_SHELL" = "zsh" ]; then
  echo "$SSH_AGENT_CONFIG" >> $HOME/.zprofile
fi

echo ""
echo "=== 設定完了 ==="
echo "使用中のシェル: $CURRENT_SHELL"
echo "SSH鍵: $HOME/.ssh/id_${KEY_NAME}"
echo ""
echo "次の手順:"
echo "1. クリップボードにコピーされた公開鍵をGitHubなどに登録"
echo "2. 新しいターミナルセッションを開始するか、以下を実行:"
echo "   source ~/.${CURRENT_SHELL}rc"
echo ""
