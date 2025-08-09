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
npm run dev
```

### 3. 各サービスのURL

- **フロントエンド**: http://localhost:3000
- **バックエンドAPI**: http://localhost:8000
- **Storybook**: http://localhost:6006

## アーキテクチャ

本アプリケーションは、フロントエンドとバックエンドが分離した構成を採用しています。

-   **フロントエンド**: `frontend/`
    -   React (Vite) を使用したSPA（Single Page Application）です。
    -   UIコンポーネントは `shadcn/ui` と Storybook で管理されています。
    -   詳細は [frontend/README.md](frontend/README.md) を参照してください。
-   **バックエンド**: `server/`
    -   Python (FastAPI) を使用したAPIサーバーです。
    -   詳細は [server/README.md](server/README.md) を参照してください。

## ドキュメント

-   [**要件定義書** (docs/requirements.md)](docs/requirements.md): アプリケーションの機能要件や技術選定について記載しています。
-   [**コーディング規約** (docs/coding_standards.md)](docs/coding_standards.md): コードの品質を保つための規約です。

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
