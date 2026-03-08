---
paths:
  - "frontend/src/types/**"
---

# 型定義（frontend/src/types）方針

## Zodスキーマによる型定義

- 型は `z.infer<typeof Schema>` で導出する（手動でinterfaceを書かない）
- スキーマ名は `{Entity}Schema`、型名は `{Entity}`

## レイヤー分離

アプリケーション層（camelCase）とAPI層（snake_case）のスキーマを分離し、変換スキーマで橋渡しする。

## ファイル内のセクション構成（この順序で定義）

1. **共通の型定義** - enum等（必要な場合のみ）
2. **アプリケーション層のスキーマ** - `{Entity}Schema` / `type {Entity}`
3. **API層のスキーマ** - `Api{Entity}Schema` / `type Api{Entity}`
4. **変換（API → アプリ）** - `{entity}FromApi`
5. **変換（アプリ → API）** - `{entity}ToApi`
6. **作成/更新用スキーマ** - `{Entity}MutationSchema` / `{entity}MutationToApi`

## 命名規則

- 型定義スキーマは PascalCase + `Schema` 接尾辞: `TripSchema`, `BlockSchema`
- 変換スキーマは camelCase の関数的命名（`Schema` を付けない）:

| 用途 | 名前 | 例 |
|------|------|-----|
| アプリ層スキーマ | `{Entity}Schema` | `TripSchema` |
| API層スキーマ | `Api{Entity}Schema` | `ApiTripSchema` |
| API→アプリ変換 | `{entity}FromApi` | `tripFromApi` |
| アプリ→API変換 | `{entity}ToApi` | `pageToApi` |
| Mutation（アプリ層） | `{Entity}MutationSchema` | `TripMutationSchema` |
| Mutation（変換） | `{entity}MutationToApi` | `tripMutationToApi` |
| 特殊変換 | `{operation}{Entity}FromApi` | `createTripFromApi` |

## エクスポート方針

- API層スキーマは `const`（非公開）が基本。型（`Api{Entity}`）のみexportする
- アプリ層スキーマ・変換スキーマはexportする
- `transform()`後のスキーマは`ZodEffects`になり`.omit()`等が使えないため、Mutation用は`transform()`前に`.omit()`してから`transform()`する
