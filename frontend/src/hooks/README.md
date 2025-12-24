# Hooks (`src/hooks`)

このディレクトリには、アプリケーション全体で再利用可能なカスタムフックを配置します。
特に、API通信や状態管理に関連するロジックをカプセル化することを目的としています。

## 開発上の注意点と規則

このプロジェクトのカスタムフックを実装する際は、以下の点に注意してください。

### 1. データ取得と状態管理

データ取得とそれに伴う状態管理には、 **SWR** ライブラリを全面的に採用しています。

- **データ取得 (`GET`)**: `useSWR` を使用します。
- **データ作成・更新・削除 (`POST`, `PUT`, `DELETE`)**: `useSWRMutation` を使用します。

これにより、キャッシュ管理、再検証、ローディング状態の管理などを SWR に一任し、効率的で一貫性のあるデータフローを実現します。

### 2. APIクライアント

APIリクエストは、`@/lib/apiClient` で定義されている共通の `apiClient` (axiosインスタンス) と `fetcher` を使用してください。

```typescript
import { apiClient, fetcher } from '@/lib/apiClient';
import useSWR from 'swr';

// GETリクエストの例
const { data, error, isLoading } = useSWR('/api/path', fetcher);
```

これにより、リクエストヘッダー、ベースURL、タイムアウト、エラーハンドリングなどの設定を一元管理します。

### 3. Mutation（データ更新処理）の実装パターン

`useSWRMutation` を使用したデータ作成・更新・削除処理は、以下のパターンで実装します。

#### 楽観的更新 (Optimistic UI)

ユーザー体験を向上させるため、更新・削除処理では楽観的更新を積極的に採用します。サーバーからのレスポンスを待たずにUIを即時更新し、処理が失敗した場合は元の状態にロールバックします。

- `optimisticData` オプションで、mutation実行前のキャッシュデータを元に新しい状態を生成します。
- `rollbackOnError: true` を設定し、エラー発生時にキャッシュを自動的にロールバックさせます。
- `revalidate: true` を設定し、mutation成功後に最新のデータを再取得してキャッシュを更新します。

#### キャッシュの手動更新

mutation成功後、関連する他のキャッシュ（例: 一覧表示用のキャッシュと詳細表示用のキャッシュ）の一貫性を保つために、`onSuccess` コールバック内で `mutate` 関数を呼び出して手動で更新します。

`mutate` 関数は `useSWRConfig` フックから取得します。

```typescript
import { useSWRConfig } from 'swr';

// 更新処理フック内
const { mutate } = useSWRConfig();

// mutationのオプション内
onSuccess: (updatedData) => {
  // 詳細ページのキャッシュを更新
  mutate(`/api/items/${updatedData.id}`, updatedData, false);
  // 一覧ページのキャッシュも再検証するなど、必要に応じた処理
}
```

### 4. 型定義

APIから取得するデータやフックの引数などに関連する型は、`@/types` ディレクトリで一元管理します。フック内ではこれらの型をインポートして使用し、型安全性を確保してください。

```typescript
import type { Trip } from '@/types/trip';

type UpdateTripArg = { id: string; data: Omit<Trip, 'id'> };
```

### 5. フックの命名

Reactの規則に従い、カスタムフックの関数名は必ず `use` から始めてください（例: `useTrips`, `useUpdateTrip`）。

### 参考実装

これらの規則の具体的な実装例として、`useTrips.ts` を参照してください。基本的なCRUDS操作（Read, Create, Update, Delete）におけるSWRのベストプラクティスが網羅されています。
