# tabishare

国内車旅行の旅程計画を作成・共有・管理するWebアプリケーション

## 開発環境

- **フロントエンド**: React + TypeScript (`frontend/`)
- **バックエンド**: Python + FastAPI (`server/`)
- **開発環境**: devcontainer対応

## セットアップ

### 1. 依存関係のインストール

```bash
./scripts/setup.sh
```

### 2. 開発サーバーの起動

```bash
pnpm run dev
```

### 3. 各サービスのURL

- **フロントエンド**: http://localhost:3000
- **バックエンドAPI**: http://localhost:8000
- **Storybook**: http://localhost:6006

## モバイルでの確認

モバイル端末から開発サーバーにアクセスして動作確認を行う方法については、以下を参照してください：

- [モバイル端末での動作確認](docs/mobile_dev.md)

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

## Claude Code

### 使用状況の確認

```bash
cmonitor
```

Claude Codeの使用状況（トークン使用量、API呼び出し回数など）を確認できます。

## 開発時の注意

### IndexedDB のクリアが効かないとき

フロントエンドは SWR のキャッシュを IndexedDB（`AppOfflineDB`）に write-through 永続化しています。ページを実行中の状態で DevTools から IndexedDB をクリアしても、SWR が直後にキャッシュ状態を更新した瞬間に同じデータを書き戻すため、クリアが無効になることがあります。

回避策:

- DevTools → Sources タブで実行を **Pause**（F8）してから IndexedDB をクリアしてリロードする
- もしくは対象タブを **閉じてから** 別タブで開き直す
