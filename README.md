# tabishare

国内車旅行の旅程計画を作成・共有・管理するWebアプリケーション

## 開発環境

- **フロントエンド**: React + TypeScript (`front/`)
- **バックエンド**: Python + FastAPI (`server/`)
- **開発環境**: devcontainer対応

## Windows/WSL環境でのSSH設定

GitへのSSH接続ができない場合は、以下のスクリプトを実行してください：

```bash
./scripts/wsl_git_ssh_setup.sh
```

### 実行後の手順

1. **GitHubに公開鍵を登録**
   - [GitHub Settings > SSH and GPG keys](https://github.com/settings/keys)
   - クリップボードにコピーされた公開鍵を貼り付け

2. **設定を再読み込み**

   ```bash
   source ~/.bashrc  # または ~/.zshrc
   ```

3. **接続テスト**

   ```bash
   ssh -T git@github.com
   ```

### スクリプトの機能

- Ed25519 SSH鍵の自動生成
- 公開鍵のクリップボードコピー
- SSH-Agent自動管理設定（bash/zsh対応）
