# CLAUDE.md

このファイルは、このリポジトリでコードを操作する際にClaude Code (claude.ai/code) にガイダンスを提供します。
日本語で回答するように設定してください。

## プロジェクト概要

国内車旅行（主に温泉地巡り）の旅程計画を効率的に作成・共有・管理するWebアプリケーションです。ブロック式のUIを使用して、友人・家族との旅程を協力して編集できます。

## 要件定義書

[@docs/requirements.md](docs/requirements.md)

## 開発上の注意点

- ブロック式旅程管理がコアUXパターン
- 閲覧はログイン不要、編集はFirebase認証が必要
- リアルタイム協調編集は後勝ちルールで競合解決
- UIテキストと仕様書は日本語で記述

## 共通コーディング規約

[@docs/coding_standards.md](docs/coding_standards.md)

## 開発コマンド

### リンター・フォーマッター

```bash
# リンターチェック
npm run lint:check

# リンターエラーの自動修正
npm run lint:fix

# フォーマットチェック
npm run format:check

# フォーマットの自動修正
npm run format:fix
```
