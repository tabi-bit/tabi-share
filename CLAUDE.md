# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

国内車旅行（主に温泉地巡り）の旅程計画を効率的に作成・共有・管理するWebアプリケーションです。ブロック式のUIを使用して、友人・家族との旅程を協力して編集できます。

### 主要機能
- ドラッグ&ドロップによるブロック式旅程作成
- WebSocketによるリアルタイム協調編集
- Firebase Authenticationによるパスワードレス認証
- Google Maps API連携による移動時間自動取得
- 複数ルート案の比較・管理機能

## 技術構成

### 技術スタック
- **フロントエンド**: React + TypeScript + Vite + Shadcn/ui + Tailwind CSS
- **バックエンド**: Python + FastAPI
- **データベース**: MySQL (Railway)
- **認証**: Firebase Authentication
- **リアルタイム通信**: WebSocket (Socket.io)
- **デプロイ**: Firebase Hosting (フロントエンド), Railway (バックエンド)

### 開発環境
- devcontainerでPython 3.13とNode.js 22が設定済み
- 開発用PostgreSQL 16が利用可能（本番はMySQL）
- ポート: 3000 (フロントエンド), 8000 (バックエンド), 5432 (データベース)

## プロジェクト構造

`front/`ディレクトリにReactフロントエンド、`server/`ディレクトリにFastAPIバックエンドが配置されています。

## 開発フェーズ

### Phase 1 (MVP)
- ドラッグ&ドロップ対応のブロック式UI
- Firebase認証と共有権限機能
- 複数ルート管理機能

### Phase 2
- Google Maps API連携による移動時間取得
- WebSocketによるリアルタイム協調編集
- モバイル対応

### Phase 3
- 外部URL管理（Walica等の割り勘サービス）
- AI機能による観光スポット提案
- 旅行メタ情報の高度な管理

## データモデル

コアエンティティ：
- Trip: 旅行全体の情報と複数のルート案を格納
- Route: 特定のルート案とブロックの順序を管理
- Block: スポット訪問または移動時間を表現
- セキュアハッシュIDによる共有（閲覧はログイン不要）

## API制約

- Google Maps APIは無料枠内での運用
- Firebase Hosting・認証は無料枠を使用
- Railwayバックエンドは月額3-5ドル程度の予算

## メモリ管理パターン

### .claudeフォルダ構成
- `.claude/local/`: 現在の作業内容、個人的なメモ、一時的な情報（gitignore対象）
- `.claude/shared/`: プロジェクト全体のルール、開発ガイドライン、チーム共有情報（リポジトリで共有）

### インデックスファイルの確認
Claude Codeセッション開始時は必ず以下のインデックスファイルを確認してください：
@.claude/local/index.md
@.claude/shared/index.md

## 開発上の注意点

- ブロック式旅程管理がコアUXパターン
- 閲覧はログイン不要、編集はFirebase認証が必要
- リアルタイム協調編集は後勝ちルールで競合解決
- UIテキストと仕様書は日本語で記述