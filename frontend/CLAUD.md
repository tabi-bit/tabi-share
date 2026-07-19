# フロントエンド規約

## 技術スタック

- React 19.x + TypeScript 5.8.x + Vite 6.x
- Tailwind CSS 4.x + SCSS
- Shadcn/ui, ESLint + Biome

## ディレクトリ構成

```text
src/
├── components/     # 再利用可能なコンポーネント
├── pages/         # ページコンポーネント
├── hooks/         # カスタムフック
├── services/      # API通信
├── types/         # TypeScript型定義
└── lib/         # ユーティリティ関数
```

## 命名規則

- **コンポーネント**: PascalCase (`UserProfile`)
- **関数・変数**: camelCase (`getUserData`)
- **定数**: UPPER_SNAKE_CASE (`API_BASE_URL`)
- **ファイル名**: kebab-case (`user-profile.tsx`)

## コンポーネント設計

### 基本パターン

```typescript
const useUser = (userId: string) => {
  const { data } = useSWR(`/users/${userId}`, fetcher, {
    suspense: true
  });
  return data as User;
};

interface Props {
  userId: string;
  onUpdate?: (user: User) => void;
}

export const UserProfile: React.FC<Props> = ({ userId, onUpdate }) => {
  const user = useUser(userId);

  // React Compiler が自動でメモ化するため useCallback は不要
  const handleUpdate = (updatedUser: User) => {
    // キャッシュ更新やサーバー同期はライブラリが管理
    onUpdate?.(updatedUser);
  };

  return <div>{/* JSX */}</div>;
};

// 使用側
<Suspense fallback={<div>読み込み中...</div>}>
  <UserProfile userId="123" />
</Suspense>
```

### Props規約

- 必須props: `?`なし
- オプション: `?`付き
- イベント: `on`プレフィックス
- boolean: `is`/`has`プレフィックス

## スタイリング

### カラーパレット
- **Primary**: teal系（`bg-teal-500`, `text-teal-600`）
- **Secondary**: sky系（`bg-sky-500`, `text-sky-600`）
- **Tertiary**: natural系（`bg-neutral-500`, `text-neutral-600`）
- **Destructive**: red系（`bg-red-500`, `text-red-600`）

### Tailwind CSS

```html
<div className="flex flex-col items-center p-4 bg-white rounded-lg shadow-md md:flex-row md:p-6">
  <h2 className="text-lg font-semibold text-gray-900 md:text-xl">タイトル</h2>
  <button className="bg-teal-500 text-white px-4 py-2 rounded hover:bg-teal-600">
    Primary Button
  </button>
</div>
```

### カスタムフォントサイズ
- **text-*px**: 指定されたpx値を--spacingでremに変換
- **利用可能サイズ**: 10, 11, 12, 13, 14, 15, 16, 18, 20, 24, 28, 32, 40, 48, 56, 64, 128px
- **例**: `text-16px`, `text-24px`, `text-32px`

```html
<h1 className="text-32px font-bold">大見出し</h1>
<h2 className="text-24px font-semibold">中見出し</h2>
<p className="text-16px">本文テキスト</p>
<small className="text-12px text-gray-600">キャプション</small>
```

## パフォーマンス最適化

React Compiler が有効化されているため、`React.memo` / `useMemo` / `useCallback` は原則書かない。
コンパイラが自動でメモ化するため、素直に関数コンポーネントとして書けばよい。

```typescript
const TripBlock = ({ block, onUpdate }: Props) => {
  const handleUpdate = (newData: BlockData) => {
    onUpdate(block.id, newData);
  };

  return <div>{/* コンポーネント内容 */}</div>;
};
```

参照同一性が仕様上必須な escape hatch（外部ライブラリが厳格な同一性を要求する等）でのみ手動メモ化を許可する。
