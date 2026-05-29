import { z } from 'zod';

// --- アプリケーション層のスキーマ ---

export const TRIP_URL_TITLE_MAX_LENGTH = 200;
export const TRIP_URL_MEMO_MAX_LENGTH = 4000;
export const TRIP_URL_FORMAT_SOURCE_MAX_LENGTH = 20_000;
export const TRIP_URL_FORMAT_INTENT_MAX_LENGTH = 200;

/**
 * アプリケーション内で利用する TripUrl のスキーマ
 */
export const TripUrlSchema = z.object({
  id: z.number(),
  tripId: z.number(),
  url: z.string().url(),
  title: z
    .string()
    .max(TRIP_URL_TITLE_MAX_LENGTH, { message: `タイトルは最大${TRIP_URL_TITLE_MAX_LENGTH}文字です` })
    .nullish(),
  thumbnailUrl: z.string().url().nullish(),
  memo: z.string().max(TRIP_URL_MEMO_MAX_LENGTH).nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type TripUrl = z.infer<typeof TripUrlSchema>;

// --- API 層のスキーマ ---

const ApiTripUrlSchema = z.object({
  id: z.number(),
  trip_id: z.number(),
  url: z.string(),
  title: z.string().nullish(),
  thumbnail_url: z.string().nullish(),
  memo: z.string().nullish(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type ApiTripUrl = z.infer<typeof ApiTripUrlSchema>;

// --- 変換スキーマ (API -> アプリケーション) ---

export const tripUrlFromApi = ApiTripUrlSchema.transform(
  (apiData): TripUrl => ({
    id: apiData.id,
    tripId: apiData.trip_id,
    url: apiData.url,
    title: apiData.title ?? null,
    thumbnailUrl: apiData.thumbnail_url ?? null,
    memo: apiData.memo ?? null,
    createdAt: apiData.created_at,
    updatedAt: apiData.updated_at,
  })
);

// --- 変換スキーマ (アプリケーション -> API) ---

export const tripUrlToApi = TripUrlSchema.transform(
  (appData): ApiTripUrl => ({
    id: appData.id,
    trip_id: appData.tripId,
    url: appData.url,
    title: appData.title ?? null,
    thumbnail_url: appData.thumbnailUrl ?? null,
    memo: appData.memo ?? null,
    created_at: appData.createdAt,
    updated_at: appData.updatedAt,
  })
);

// --- 作成/更新用スキーマ ---

export const TripUrlMutationSchema = TripUrlSchema.omit({
  id: true,
  tripId: true,
  createdAt: true,
  updatedAt: true,
});
export type TripUrlMutation = z.infer<typeof TripUrlMutationSchema>;

export const tripUrlMutationToApi = TripUrlMutationSchema.transform(appData => ({
  url: appData.url,
  title: appData.title ?? null,
  thumbnail_url: appData.thumbnailUrl ?? null,
  memo: appData.memo ?? null,
}));

// --- プレビュー（メタデータ取得） ---

export const TripUrlPreviewSchema = z.object({
  title: z.string().nullish(),
  thumbnailUrl: z.string().nullish(),
});

export type TripUrlPreview = z.infer<typeof TripUrlPreviewSchema>;

const ApiTripUrlPreviewSchema = z.object({
  title: z.string().nullish(),
  thumbnail_url: z.string().nullish(),
});

export const tripUrlPreviewFromApi = ApiTripUrlPreviewSchema.transform(
  (apiData): TripUrlPreview => ({
    title: apiData.title ?? null,
    thumbnailUrl: apiData.thumbnail_url ?? null,
  })
);

// --- AI 整形 ---

export const TripUrlFormatRequestSchema = z.object({
  sourceText: z
    .string()
    .min(1, { message: '整形対象テキストを入力してください' })
    .max(TRIP_URL_FORMAT_SOURCE_MAX_LENGTH, {
      message: `整形対象テキストは最大${TRIP_URL_FORMAT_SOURCE_MAX_LENGTH}文字です`,
    }),
  intent: z.string().max(TRIP_URL_FORMAT_INTENT_MAX_LENGTH).nullish(),
});

export type TripUrlFormatRequest = z.infer<typeof TripUrlFormatRequestSchema>;

export const tripUrlFormatRequestToApi = TripUrlFormatRequestSchema.transform(appData => ({
  source_text: appData.sourceText,
  intent: appData.intent ?? null,
}));

export const TripUrlFormatResponseSchema = z.object({
  markdown: z.string(),
});

export type TripUrlFormatResponse = z.infer<typeof TripUrlFormatResponseSchema>;

const ApiTripUrlFormatResponseSchema = z.object({
  markdown: z.string(),
});

export const tripUrlFormatResponseFromApi = ApiTripUrlFormatResponseSchema.transform(
  (apiData): TripUrlFormatResponse => ({
    markdown: apiData.markdown,
  })
);
