import { z } from 'zod';

// --- アプリケーション層のスキーマ ---

/**
 * アプリケーション内で利用するPageのスキーマ
 */
export const PageSchema = z.object({
  id: z.number(),
  title: z.string(),
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
export const AppResponsePageSchema = ApiPageSchema.transform(
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
export const AppRequestPageSchema = PageSchema.transform(
  (appData): ApiPage => ({
    id: appData.id,
    title: appData.title,
    detail: appData.detail,
    trip_id: appData.tripId,
  })
);
