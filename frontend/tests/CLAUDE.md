# テスト環境 ナレッジベース

## テスト環境構成

### 使用技術

- **Vitest**: テストフレームワーク
- **@testing-library/react**: Reactコンポーネントテスト
- **@testing-library/jest-dom**: DOM要素のマッチャー
- **@testing-library/user-event**: ユーザーイベントシミュレーション
- **jsdom**: ブラウザ環境のシミュレーション

### 設定ファイル

- `vite.config.ts`: Vitestの基本設定
- `tests/setup.ts`: テスト環境のセットアップ

## ディレクトリ構造

```text
tests/
├── setup.ts                    # テスト環境セットアップ
├── components/                 # コンポーネントテスト
│   └── ui/                    # UIコンポーネント
│       └── button.test.tsx    # Buttonコンポーネントのテスト
└── CLAUDE.md                  # このファイル
```

## テスト記述規約

### 命名規則

- テストファイル: `*.test.tsx` または `*.spec.tsx`
- テストスイート: `describe('コンポーネント名', () => {})`
- テストケース: `it('説明文（日本語）', () => {})`

### テストパターン

#### 1. 基本レンダリングテスト

```typescript
it('コンポーネントがレンダリングされる', () => {
  render(<Component />);
  expect(screen.getByRole('button')).toBeInTheDocument();
});
```

#### 2. ユーザーイベントテスト

```typescript
it('クリックイベントが正しく動作する', async () => {
  const user = userEvent.setup();
  const handleClick = vi.fn();

  render(<Button onClick={handleClick}>クリック</Button>);
  await user.click(screen.getByRole('button'));

  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

#### 3. プロパティのテスト

```typescript
describe('variant プロパティ', () => {
  it('default variant のスタイルが適用される', () => {
    render(<Button variant="default">ボタン</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-primary');
  });
});
```

#### 4. 状態のテスト

```typescript
it('disabled状態で動作しない', async () => {
  const handleClick = vi.fn();
  render(<Button onClick={handleClick} disabled>ボタン</Button>);

  const button = screen.getByRole('button');
  expect(button).toBeDisabled();

  await userEvent.click(button);
  expect(handleClick).not.toHaveBeenCalled();
});
```

#### 5. パラメータライズドテスト

複数の似たようなテストケースを効率的にテストする場合は`it.each`を使用します。

```typescript
describe('variant プロパティ', () => {
  it.each([
    {
      variant: 'default',
      expectedClasses: ['bg-primary', 'text-primary-foreground'],
    },
    {
      variant: 'destructive',
      expectedClasses: ['bg-destructive', 'text-white'],
    },
    {
      variant: 'outline',
      expectedClasses: ['border', 'bg-background'],
    },
  ] as const)('$variant variant のスタイルが適用される', ({ variant, expectedClasses }) => {
    render(<Button variant={variant}>{variant}</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass(...expectedClasses);
  });
});
```

**利点**:

- コードの重複を削減
- テストケースの追加が容易
- テスト名に変数を含められる（`$variant`）
- 型安全性を保持（`as const`の使用）

### モック

#### 関数のモック

```typescript
import { vi } from 'vitest';

const mockFunction = vi.fn();
mockFunction.mockReturnValue('戻り値');
```

#### モジュールのモック

```typescript
vi.mock('@/lib/utils', () => ({
  cn: vi.fn((...classes) => classes.join(' ')),
}));
```

### テスト実行コマンド

```bash
# テスト実行
npm run test

# ウォッチモードでテスト実行
npm run test:watch

# UIモードでテスト実行
npm run test:ui
```

## 注意事項

### async/await の使用

- ユーザーイベントは必ず `await` を使用
- `userEvent.setup()` を各テストで初期化

### アクセシビリティ

- `getByRole` を優先的に使用
- `aria-label` や `data-testid` は最小限に

### テストの独立性

- 各テストは独立して実行可能
- 他のテストに依存しない

### カバレッジ

- 全ての主要な機能をテスト
- エッジケースも考慮
- 100%カバレッジを目指すが、品質を重視
