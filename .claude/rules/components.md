---
paths:
  - "frontend/src/components/**/*"
---

# コンポーネント構成規約

## 1コンポーネント1ファイル原則

- 各コンポーネントは独立したファイルで管理
- 関連する複数コンポーネントはディレクトリにまとめる
- index.tsでまとめてExport

## ページタイトル

- ページタイトルの設定には `<Title>` コンポーネント (`@/components/Title`) を使用する
- `<Title>旅行名</Title>` のように使用すると、環境プレフィックス付きで `[local]旅行名 | たびしぇあ` のようなタイトルが設定される
- `document.title` を直接操作しない

## Storybookファイル

- 各コンポーネントに対応する`.stories.tsx`ファイルを同ディレクトリに作成
- ディレクトリごとに統合した`.stories.tsx`ファイル作成も可能

## テストファイル

- テストファイルはテスト対象と同ディレクトリに `*.test.ts` / `*.test.tsx` として配置（コロケーション方式）
- テスト名（describe/itの説明文）は日本語で記述
- テストファイル内では非nullアサーション (`!`) を許可（`biome.json` の overrides で `noNonNullAssertion` を off 設定）。`querySelector` の結果に対し `expect(...).not.toBeNull()` の直後で `!` を使う形が標準
