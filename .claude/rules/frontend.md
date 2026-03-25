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
- フォントサイズは基本 **10, 12, 14, 16, 18, 24px** の6種類で構成する
- レスポンシブ対応: `sm`ブレイクポイントを起点に、モバイルではデスクトップ/タブレットから **-2px** を基本とする（例: `text-14px sm:text-16px`）
- 高さに `h-screen` や `h-[100vh]` は使わず、`h-dvh` を使用する（モバイルブラウザのアドレスバー対応）

## PWA

- Service WorkerとPWAインストールはHTTPS（またはlocalhost）が必須
- モバイル実機でPWA動作確認する場合は `npm run dev:https` を使用
- `vite.config.ts` の HTTPS設定は `.dev-key.pem` / `.dev-cert.pem` の存在で自動切り替え（証明書がなければHTTP）
- PWAマニフェストは `vite.config.ts` 内にインラインで定義（`vite-plugin-pwa` が管理）
