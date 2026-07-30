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

- **React Compiler が有効化されているため、`useMemo` / `useCallback` は原則書かない**
  - 参照安定性が仕様上必須な escape hatch（外部ライブラリが厳格な同一性を要求する等）でのみ許可
  - `React.memo` / `memo()` も同様に不要
  - コンパイラの動作確認: React DevTools 上でコンポーネントに「Memo ✨」バッジが付く
- useEffect には必ずクリーンアップ関数を実装

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

### 使い分け

用途によって 2 系統を使い分ける。

| 種類 | 用途 | 実装 |
|---|---|---|
| **確認ダイアログ** (yes/no) | 削除確認、破壊的操作の警告、実行前の意思確認、進行中フローへの割り込み等、結果が boolean で表現できるもの | `useConfirm()` フック (`@/lib/confirm`) を使い、`await confirm({...})` の Promise で受け取る |
| **フォームダイアログ** | 入力フォームやカスタム UI を持つもの (作成/編集ダイアログ等) | Shadcn/ui の `Dialog` を個別コンポーネントとして実装 (下記) |

### 確認ダイアログ (`useConfirm`)

- `window.confirm` / `window.alert` / `window.prompt` は **原則禁止**。デザインシステム外の見た目になり、モバイルや一部 PWA コンテキストで挙動が不安定
- 呼び出し側は state を持たず、`await` で結果を待つ
- 破壊的操作は `variant: 'destructive'` を指定 (Cancel/Action の色を制御)

```tsx
const confirm = useConfirm();
const ok = await confirm({
  title: '削除しますか?',
  description: 'この操作は取り消せません',
  confirmText: '削除する',
  variant: 'destructive',
});
if (!ok) return;
```

### フォームダイアログ (Shadcn/ui `Dialog`)

- Shadcn/uiの`Dialog`を使用し、`Dialog > DialogContent > DialogHeader + DialogBody + DialogFooter`で構成
- 親が`open`/`onOpenChange`で開閉を制御する（制御コンポーネントパターン）
- `useEffect`で`open === true`時にフォームを初期化する
- 「削除実行」の直前確認は `useConfirm` を使う (この場合フォームダイアログ内から呼び出す)
- **楽観更新（`optimisticData`）を使うupdate/delete操作**: ローディング表示せず即座にダイアログを閉じる（fire-and-forget）。送信中の閉じ防止ガードも不要
- **新規作成（create）操作**: サーバーからのID確定が必要なため楽観更新を行わない。ダイアログでローディングを表示し、送信中の閉じ防止（`onOpenChange`・`onInteractOutside`・`onEscapeKeyDown`の3箇所でガード）を行う

## PWA

- Service WorkerとPWAインストールはHTTPS（またはlocalhost）が必須
- モバイル実機でPWA動作確認する場合は `pnpm dev:https` を使用
- `vite.config.ts` の HTTPS設定は `.dev-key.pem` / `.dev-cert.pem` の存在で自動切り替え（証明書がなければHTTP）
- PWAマニフェストは `vite.config.ts` 内にインラインで定義（`vite-plugin-pwa` が管理）
