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

## ダイアログ（Dialog）

- Shadcn/uiの`Dialog`を使用し、`Dialog > DialogContent > DialogHeader + DialogBody + DialogFooter`で構成
- 親が`open`/`onOpenChange`で開閉を制御する（制御コンポーネントパターン）
- `useEffect`で`open === true`時にフォームを初期化する
- 削除は`AlertDialog`で確認を挟む
- **楽観更新（`optimisticData`）を使うupdate/delete操作**: ローディング表示せず即座にダイアログを閉じる（fire-and-forget）。送信中の閉じ防止ガードも不要
- **新規作成（create）操作**: サーバーからのID確定が必要なため楽観更新を行わない。ダイアログでローディングを表示し、送信中の閉じ防止（`onOpenChange`・`onInteractOutside`・`onEscapeKeyDown`の3箇所でガード）を行う

## PWA

- Service WorkerとPWAインストールはHTTPS（またはlocalhost）が必須
- モバイル実機でPWA動作確認する場合は `npm run dev:https` を使用
- `vite.config.ts` の HTTPS設定は `.dev-key.pem` / `.dev-cert.pem` の存在で自動切り替え（証明書がなければHTTP）
- PWAマニフェストは `vite.config.ts` 内にインラインで定義（`vite-plugin-pwa` が管理）
