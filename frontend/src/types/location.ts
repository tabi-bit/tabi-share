import { z } from 'zod';

// --- アプリケーション層のスキーマ ---

/**
 * アプリケーション内で利用するLocationのスキーマ
 */
export const LocationSchema = z.object({
  id: z.number(),
  googlePlaceId: z.string().nullable(),
  name: z.string(),
  address: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  websiteUri: z.string().nullable(),
});

export type Location = z.infer<typeof LocationSchema>;

// --- API層のスキーマ ---

/**
 * APIから返ってくる生のデータ形式を表すスキーマ
 */
export const ApiLocationSchema = z.object({
  id: z.number(),
  google_place_id: z.string().nullable(),
  name: z.string(),
  address: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  website_uri: z.string().nullable(),
});

export type ApiLocation = z.infer<typeof ApiLocationSchema>;

// --- 変換スキーマ (API -> アプリケーション) ---

/**
 * APIレスポンスをアプリケーション層のLocationに変換するスキーマ
 */
export const locationFromApi = ApiLocationSchema.transform(
  (apiData): Location => ({
    id: apiData.id,
    googlePlaceId: apiData.google_place_id,
    name: apiData.name,
    address: apiData.address,
    latitude: apiData.latitude,
    longitude: apiData.longitude,
    websiteUri: apiData.website_uri,
  })
);

// --- 作成用のスキーマ ---

/**
 * 作成リクエスト用のアプリケーション層スキーマ
 * idはサーバーで管理されるため除外
 */
export const LocationCreateSchema = LocationSchema.omit({ id: true });
export type LocationCreate = z.infer<typeof LocationCreateSchema>;

/**
 * アプリケーション層の作成データをAPI送信用に変換するスキーマ
 */
export const locationCreateToApi = LocationCreateSchema.transform(
  (appData): Omit<ApiLocation, 'id'> => ({
    google_place_id: appData.googlePlaceId,
    name: appData.name,
    address: appData.address,
    latitude: appData.latitude,
    longitude: appData.longitude,
    website_uri: appData.websiteUri,
  })
);

// --- 更新用のスキーマ（PUT 埋め込み） ---

/**
 * ブロック更新 PUT ペイロードに埋め込む場所情報
 *
 * - id が現在の block.location_id と一致: 既存行を維持
 * - id が undefined / 異なる id: 旧行削除 + 新規作成
 *
 * 新規選択直後は id 未確定で格納され、PUT 送信後にサーバが払い出した id 付きで返ってくる。
 */
export const LocationUpdateSchema = LocationSchema.extend({
  id: z.number().optional(),
});
export type LocationUpdate = z.infer<typeof LocationUpdateSchema>;

/**
 * アプリケーション層の更新データをAPI送信用に変換するスキーマ
 */
export const locationUpdateToApi = LocationUpdateSchema.transform(
  (appData): Partial<ApiLocation> & Omit<ApiLocation, 'id'> => ({
    ...(appData.id !== undefined ? { id: appData.id } : {}),
    google_place_id: appData.googlePlaceId,
    name: appData.name,
    address: appData.address,
    latitude: appData.latitude,
    longitude: appData.longitude,
    website_uri: appData.websiteUri,
  })
);
