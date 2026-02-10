import { z } from 'zod';

// --- アプリケーション層のスキーマ ---

/**
 * アプリケーション内で利用するTripのスキーマ
 */
export const TripSchema = z.object({
  id: z.number(),
  title: z.string(),
  detail: z.string().nullish(),
  peopleNum: z.number().nullish(),
  urlId: z.string(),
});

export type Trip = z.infer<typeof TripSchema>;

// --- API層のスキーマ ---

/**
 * APIから返ってくる生のデータ形式を表すスキーマ
 */
const ApiTripSchema = z.object({
  id: z.number(),
  title: z.string(),
  detail: z.string().nullish(),
  people_num: z.number().nullish(),
  url_id: z.string(),
});

export type ApiTrip = z.infer<typeof ApiTripSchema>;

// --- 変換スキーマ (API -> アプリケーション) ---

/**
 * APIレスポンスをアプリケーション層のTripに変換するスキーマ
 */
export const AppResponseTripSchema = ApiTripSchema.transform(
  (apiData): Trip => ({
    id: apiData.id,
    title: apiData.title,
    detail: apiData.detail,
    peopleNum: apiData.people_num,
    urlId: apiData.url_id,
  })
);

// --- 変換スキーマ (アプリケーション -> API) ---

/**
 * アプリケーション層のTripをAPI送信用の形式に変換するスキーマ
 */
export const AppRequestTripSchema = TripSchema.transform(
  (appData): ApiTrip => ({
    id: appData.id,
    title: appData.title,
    detail: appData.detail,
    people_num: appData.peopleNum,
    url_id: appData.urlId,
  })
);

// --- 作成/更新用のスキーマ ---

/**
 * 作成/更新リクエスト用のアプリケーション層スキーマ
 * id, urlIdはサーバーで管理されるため除外
 */
export const TripMutationSchema = TripSchema.omit({ id: true, urlId: true });
export type TripMutation = z.infer<typeof TripMutationSchema>;

/**
 * 作成/更新リクエスト用のAPI層スキーマ
 */
const ApiTripMutationSchema = ApiTripSchema.omit({ id: true, url_id: true });
export type ApiTripMutation = z.infer<typeof ApiTripMutationSchema>;

/**
 * アプリケーション層の作成/更新データをAPI送信用に変換するスキーマ
 */
export const AppRequestTripMutationSchema = TripMutationSchema.transform(
  (appData): ApiTripMutation => ({
    title: appData.title,
    detail: appData.detail,
    people_num: appData.peopleNum,
  })
);
