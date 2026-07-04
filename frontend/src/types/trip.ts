import { z } from 'zod';
import { formatDateOnly, parseDateOnly } from '@/lib/date';

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
  startDate: z.date().nullish(),
  endDate: z.date().nullish(),
  createdAt: z.date(),
  lastEditedAt: z.date(),
});

export type Trip = z.infer<typeof TripSchema>;

// --- API層のスキーマ ---

export const TRIP_TITLE_MAX_LENGTH = 32;

/**
 * APIから返ってくる生のデータ形式を表すスキーマ
 */
const ApiTripSchema = z.object({
  id: z.number(),
  title: z
    .string()
    .min(1)
    .max(TRIP_TITLE_MAX_LENGTH, { message: `タイトルは最大${TRIP_TITLE_MAX_LENGTH}文字です` }),
  detail: z.string().nullish(),
  people_num: z.number().nullish(),
  url_id: z.string().max(100),
  start_date: z.string().date().nullish(),
  end_date: z.string().date().nullish(),
  created_at: z.string().datetime({ offset: true }),
  last_edited_at: z.string().datetime({ offset: true }),
});

export type ApiTrip = z.infer<typeof ApiTripSchema>;

// --- 変換スキーマ (API -> アプリケーション) ---

/**
 * APIレスポンスをアプリケーション層のTripに変換するスキーマ
 */
export const tripFromApi = ApiTripSchema.transform(
  (apiData): Trip => ({
    id: apiData.id,
    title: apiData.title,
    detail: apiData.detail,
    peopleNum: apiData.people_num,
    urlId: apiData.url_id,
    startDate: apiData.start_date ? parseDateOnly(apiData.start_date) : null,
    endDate: apiData.end_date ? parseDateOnly(apiData.end_date) : null,
    createdAt: new Date(apiData.created_at),
    lastEditedAt: new Date(apiData.last_edited_at),
  })
);

/**
 * APIからの新規作成レスポンスをアプリケーション層の形式に変換するスキーマ
 * 作成時はidとurlIdのみが返ってくる想定
 */
export const createTripFromApi = ApiTripSchema.pick({ id: true, url_id: true }).transform(
  (apiData): Pick<Trip, 'id' | 'urlId'> => ({
    id: apiData.id,
    urlId: apiData.url_id,
  })
);

export type CreateTripFromApi = z.infer<typeof createTripFromApi>;

// --- 作成/更新用のスキーマ ---

/**
 * 作成/更新リクエスト用のアプリケーション層スキーマ
 * id, urlId, createdAt, lastEditedAt はサーバーで管理されるため除外
 */
export const TripMutationSchema = TripSchema.omit({
  id: true,
  urlId: true,
  createdAt: true,
  lastEditedAt: true,
});
export type TripMutation = z.infer<typeof TripMutationSchema>;

/**
 * アプリケーション層の作成/更新データをAPI送信用に変換するスキーマ
 */
export const tripMutationToApi = TripMutationSchema.transform(
  (appData): Omit<ApiTrip, 'id' | 'url_id' | 'created_at' | 'last_edited_at'> => ({
    title: appData.title,
    detail: appData.detail ?? '',
    people_num: appData.peopleNum,
    start_date: appData.startDate ? formatDateOnly(appData.startDate) : null,
    end_date: appData.endDate ? formatDateOnly(appData.endDate) : null,
  })
);
