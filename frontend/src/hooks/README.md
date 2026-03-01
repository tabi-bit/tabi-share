# Hooks (`src/hooks`)

このディレクトリには、アプリケーション全体で再利用可能なカスタムフックを配置します。
特に、API通信や状態管理に関連するロジックをカプセル化することを目的としています。

## 開発上の注意点と規則

このプロジェクトのカスタムフックを実装する際は、以下の点に注意してください。

### 1. データ取得と状態管理（SWR）

データ取得とそれに伴う状態管理には、 **SWR** ライブラリを全面的に採用しています。

- **データ取得 (`GET`)**: `useSWR` を使用します。
- **データ作成・更新・削除 (`POST`, `PUT`, `DELETE`)**: `useSWRMutation` を使用します。

これにより、キャッシュ管理、再検証、ローディング状態の管理などを SWR に一任し、効率的で一貫性のあるデータフローを実現します。

#### SWRキーの管理

- **基本**: SWRのキャッシュキーには、APIのエンドポイントURLをそのまま使用します。
- **親子関係**: `tripId`に紐づくPage一覧（`/trips/:tripId/pages`）のように、他のデータに依存する場合は、親IDが`null`の間はリクエストが実行されないよう、キーを `null` に設定します。
- **複数キーでの同一データアクセス**: `useTrip(id)`と`useTripByUrlId(urlId)`のように、異なるキーで同一リソースにアクセスする可能性があります。この場合、片方のフックでデータを取得した際に、もう一方のキーのキャッシュも`mutate`関数で手動更新し、キャッシュの同期を保ちます（`useTrips.ts`参照）。

### 2. APIクライアントとバリデーション

- **APIクライアント**: APIリクエストは、`@/lib/apiClient` で定義されている共通の `apiClient` (axiosインスタンス) と `fetcher` を使用してください。
- **レスポンスのバリデーション**: APIからのレスポンスは、必ず`zod`スキーマを用いてパース・バリデーションを行ってください。これにより、予期しないデータ構造による実行時エラーを防ぎます。
- **APIエンドポイント**: 各フックファイル内で、関連するAPIのベースパスを`const TRIPS_BASE_PATH = '/trips';`のように定数として定義してください。

### 3. Mutation（データ更新処理）の実装パターン

`useSWRMutation` を使用したデータ作成・更新・削除処理は、ユーザー体験向上のため、楽観的更新（Optimistic UI）を基本パターンとします。

#### a. 作成 (Create)

作成処理では、APIが成功した後にリストのキャッシュを更新します。

- `useSWRMutation` の `onSuccess` コールバック内で `mutate` を呼び出し、現在のリストキャッシュに新しいデータを追加します。この際、リストの再検証は不要なため `revalidate: false` を設定します。

```typescript
// useCreatePage.ts の例
onSuccess: (newPage: Page) =>
  mutate(
    listKey,
    (currentPages: Page[] | undefined) => {
      if (currentPages == null) return [newPage];
      return [...currentPages, newPage];
    },
    { revalidate: false }
  ),
```

#### b. 更新 (Update)

更新処理では、UIの即時反映とデータ整合性の確保を両立させます。

1. `useSWRMutation` をラップした `updateXXX` 関数をコンポーネントに提供します。
2. `updateXXX` 関数内で、まず更新対象の**個別データ**のキャッシュ（例: `/pages/:id`）を楽観的に更新します。
3. 次に `trigger` を呼び出し、**リストデータ**のキャッシュ（例: `/trips/:tripId/pages`）を楽観的に更新します (`optimisticData`)。
4. `trigger` の `onSuccess` コールバックで、サーバーからのレスポンスに基づき**個別データ**のキャッシュを確定させます。
5. エラー発生時は `rollbackOnError: true` と `onError` コールバックで、両方のキャッシュをロールバックします。

```typescript
// useUpdatePage.ts の updatePage 関数の流れを参考にしてください。
```

#### c. 削除 (Delete)

削除処理も更新と同様のパターンで、個別データとリストデータの両方を楽観的に更新します。

1. `useSWRMutation` をラップした `deleteXXX` 関数を提供します。
2. `deleteXXX` 関数内で、まず**個別データ**のキャッシュを `undefined` に設定して楽観的に削除します。
3. 次に `trigger` を呼び出し、**リストデータ**のキャッシュから対象データをフィルタリングして楽観的に更新します。
4. `trigger` の `onSuccess` で、個別キャッシュの削除を確定させます。

### 4. 型定義

APIから取得するデータやフックの引数などに関連する型は、`@/types` ディレクトリで一元管理します。フック内ではこれらの型をインポートして使用し、型安全性を確保してください。

### 5. フックの命名

Reactの規則に従い、カスタムフックの関数名は必ず `use` から始めてください（例: `useTrips`, `useUpdateTrip`）。

### 参考実装

これらの規則の具体的な実装例として、以下のファイルを参照してください。それぞれのファイルが異なるパターンのベストプラクティスを網羅しています。

- **`useTrips.ts`**:
  - 基本的なCRUDS操作。
  - `useTrip` と `useTripByUrlId` における複数キーでのキャッシュ同期。
  - `useUpdateTrip` における `populateCache` を利用したリスト更新。
- **`usePages.ts`**:
  - 親子関係（Trip -> Page）を持つデータのCRUDS操作。
  - `updatePage` / `deletePage` における、個別・リスト両キャッシュの楽観的更新パターン。
- **`useBlocks.ts`**:
  - `usePages.ts` と同様、親子関係（Page -> Block）のデータ操作における実践的な実装例。
