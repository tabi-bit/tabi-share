---
paths:
  - "frontend/src/**/*.ts"
  - "frontend/src/**/*.tsx"
  - "src/**/*.ts"
  - "src/**/*.tsx"
---

# フロントエンド開発規約

## コンポーネント

- React関数コンポーネントを使用（クラスコンポーネント禁止）
- named exportを推奨（default exportは設定ファイルやライブラリ慣習のみ）

## パフォーマンス

- useMemo/useCallbackで不要な再レンダリングを防止
- useEffectには必ずクリーンアップ関数を実装

## 型

- TypeScript型注釈を明示的に記述
- any型は原則禁止

## スタイル

- Tailwind CSSを使用
- Shadcn/uiコンポーネントを活用
