# CLAUDE.md

このファイルは、このリポジトリでコードを操作する際にClaude Code (claude.ai/code) にガイダンスを提供します。
日本語で回答するように設定してください。

## 他のエージェント向けドキュメント

- [AGENTS.md](AGENTS.md) - AIコーディングエージェント向けのガイダンス

## プロジェクト概要

国内車旅行（主に温泉地巡り）の旅程計画を効率的に作成・共有・管理するWebアプリケーションです。ブロック式のUIを使用して、友人・家族との旅程を協力して編集できます。

## 要件定義書

[@docs/requirements.md](docs/requirements.md)

## 開発上の注意点

- ブロック式旅程管理がコアUXパターン
- 閲覧はログイン不要、編集はFirebase認証が必要
- リアルタイム協調編集は後勝ちルールで競合解決
- UIテキストと仕様書は日本語で記述

## ブランチ運用

- **メインブランチは `develop`**。通常の feature / fix / chore PR はすべて `develop` を base にする
- `main` はリリース専用。`develop` → `main` のリリース PR でのみ使用する（緊急時は `hotfix/*` から直接 `main` も可）
- GitHub のデフォルトブランチも `develop` に設定されている
- Claude Code が起動時に `Main branch: main` と表示することがあるが、それは GitHub の "main" 概念のことではなく、運用上のメインブランチとは別物。実態は `gh repo view --json defaultBranchRef` か既存 PR の base で確認すること

## 共通コーディング規約

[@docs/coding_standards.md](docs/coding_standards.md)

## 開発コマンド

### 環境変数の管理（dotenvx）

```bash
# デフォルト(.env)を使用してコマンド実行
pnpm dotenvx run -- <コマンド>

# 特定の環境ファイルを指定して実行
pnpm dotenvx run --env-file .env.stg -- <コマンド>

# 例: .env.stgを使ってフロントエンド開発サーバーを起動
pnpm dotenvx run --env-file .env.stg -- sh -c 'cd frontend && pnpm run dev'

# 特定の環境ファイルに環境変数をセットする
pnpm dotenvx set KEY value -f .env.stg

# 例: .env.stgにAPIのURLをセット
pnpm dotenvx set VITE_API_BASE_URL https://api.example.com -f .env.stg
```

### PWA開発（HTTPS）

モバイル端末からプライベートIPでPWAのスタンドアロン動作を確認する場合、HTTPSが必要です。

```bash
# HTTPS有効で開発サーバーを起動（初回は証明書を自動生成）
cd frontend && pnpm run dev:https
```

- 通常の `pnpm run dev` はHTTPで起動（証明書ファイルがなければHTTPSは無効）
- `pnpm run dev:https` は `scripts/setup-https.sh` で mkcert 証明書を生成してHTTPS起動
- Service WorkerとPWAインストールはHTTPS（またはlocalhost）が必須

### リンター・フォーマッター・型チェック

```bash
# 型チェック
pnpm run type-check

# リンターチェック
pnpm run lint:check

# リンターエラーの自動修正
pnpm run lint:fix

# フォーマットチェック
pnpm run format:check

# フォーマットの自動修正
pnpm run format:fix
```

## Claude専用ルール

- コードを移動する場合はできるだけコマンドで移動すること
  - `git mv`でコピーしてgitの追跡を切らないこと
  - できるだけ移動してからコードを改変する形を取ることでコードの整合性を保つ
