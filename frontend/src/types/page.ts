import { z } from 'zod';

// --- アプリケーション層のスキーマ ---

export const PAGE_TITLE_MAX_LENGTH = 32;

/**
 * アプリケーション内で利用するPageのスキーマ
 */
export const PageSchema = z.object({
  id: z.number(),
  title: z
    .string()
    .min(1)
    .max(PAGE_TITLE_MAX_LENGTH, { message: `ページ名は最大${PAGE_TITLE_MAX_LENGTH}文字です` }),
  detail: z.string().nullish(),
  tripId: z.number(),
});

export type Page = z.infer<typeof PageSchema>;

// --- API層のスキーマ ---

/**
 * APIから返ってくる生のデータ形式を表すスキーマ
 */
const ApiPageSchema = z.object({
  id: z.number(),
  title: z.string(),
  detail: z.string().nullish(),
  trip_id: z.number(),
});

export type ApiPage = z.infer<typeof ApiPageSchema>;

// --- 変換スキーマ (API -> アプリケーション) ---

/**
 * APIレスポンスをアプリケーション層のPageに変換するスキーマ
 */
export const pageFromApi = ApiPageSchema.transform(
  (apiData): Page => ({
    id: apiData.id,
    title: apiData.title,
    detail: apiData.detail,
    tripId: apiData.trip_id,
  })
);

// --- 変換スキーマ (アプリケーション -> API) ---

/**
 * アプリケーション層のPageをAPI送信用の形式に変換するスキーマ
 */
export const pageToApi = PageSchema.transform(
  (appData): ApiPage => ({
    id: appData.id,
    title: appData.title,
    detail: appData.detail,
    trip_id: appData.tripId,
  })
);

// --- 作成/更新用スキーマ ---

/**
 * 作成/更新リクエスト用のアプリケーション層スキーマ
 * idはサーバーで管理されるため除外
 */
export const PageMutationSchema = PageSchema.omit({ id: true });
export type PageMutation = z.infer<typeof PageMutationSchema>;

/**
 * アプリケーション層の作成/更新データをAPI送信用に変換するスキーマ
 */
export const pageMutationToApi = PageMutationSchema.transform(
  (appData): Omit<ApiPage, 'id'> => ({
    title: appData.title,
    detail: appData.detail,
    trip_id: appData.tripId,
  })
);
