---
description: "shadcn/uiコンポーネントを追加し、基本的なStorybookファイルも自動生成する"
argument-hint: "<componentName> (例: card, select, dropdown-menu)"
allowed-tools: ["Bash", "Read", "Write", "Edit", "MultiEdit", "Glob"]
---

# create-shadcn-component

shadcn/uiコンポーネント「$ARGUMENTS」を追加し、包括的なStorybookファイルも生成してください。

## 実行手順

1. **コンポーネントの追加**:
   - `npx shadcn@latest add $ARGUMENTS --cwd frontend` を実行してコンポーネントを追加
   - `--cwd frontend`でディレクトリの指定を忘れないこと

2. **Storybookファイルの生成**:
   - 既存のStorybook構造（frontend/src/components/ui/button.stories.tsx等）を参考に、$ARGUMENTS.stories.tsxファイルを作成
   - 基本的なUIパターン（variants、sizes、states等）を網羅したストーリーを生成
   - コンポーネントのプロパティに応じてargTypes設定を調整
   - AllVariantsストーリーで全パターンを一覧表示する形式で作成

3. **コード品質の確保**:
   - `npm run format:fix` を実行してフォーマットを修正
   - `npm run lint:fix` を実行してリンターエラーを修正
   - コマンドはプロジェクトルートディレクトリから実行する

## 既存のStorybookパターンの踏襲

- タイトル形式: `title: 'UI/ComponentName'`
- 基本的なargTypes設定（variant、size、disabled等）
- AllVariants ストーリーでの一覧表示
- 日本語コメント対応

## 注意事項

- コンポーネントの型定義を正確に解析してStorybook設定を最適化すること
- 既存のStorybookファイル（button.stories.tsx、accordion.stories.tsx等）のパターンに合わせてコード生成すること
- frontendディレクトリ内で作業を行うこと
