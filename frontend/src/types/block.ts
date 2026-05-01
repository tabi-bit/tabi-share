import { z } from 'zod';
import { ApiLocationSchema, LocationUpdateSchema, locationFromApi, locationUpdateToApi } from './location';

// --- 共通の型定義 ---

export const BLOCK_TITLE_MAX_LENGTH = 64;

/**
 * 交通手段の列挙型スキーマ
 */
export const TransportationTypeEnum = z.enum([
  'car',
  'bicycle',
  'walk',
  'ship',
  'train',
  'bus',
  'flight',
  'shinkansen',
]);
/**
 * 交通手段の型
 */
export type TransportationType = z.infer<typeof TransportationTypeEnum>;

/**
 * 交通手段の選択肢
 */
export const TRANSPORTATION_OPTIONS = [
  { value: 'car', label: '車' },
  { value: 'train', label: '電車' },
  { value: 'shinkansen', label: '新幹線' },
  { value: 'bus', label: 'バス' },
  { value: 'walk', label: '徒歩' },
  { value: 'bicycle', label: '自転車' },
  { value: 'ship', label: '船' },
  { value: 'flight', label: '飛行機' },
] as const satisfies readonly { value: TransportationType; label: string }[];

// --- アプリケーション層のスキーマ ---

/**
 * アプリケーション内で利用するブロックのベーススキーマ
 *
 * location は `LocationUpdate`（id optional）を持つ。新規選択直後は id 未確定、
 * サーバから返った後は id 付き。PUT 時はそのまま埋め込んで後勝ちで送る。
 */
const AppBaseBlockSchema = z.object({
  id: z.number(),
  title: z
    .string()
    .min(1)
    .max(BLOCK_TITLE_MAX_LENGTH, { message: `ブロックタイトルは最大${BLOCK_TITLE_MAX_LENGTH}文字です` }),
  startTime: z.date(),
  endTime: z.date().nullable(),
  detail: z.string().nullish(),
  pageId: z.number(),
  location: LocationUpdateSchema.nullable().default(null),
});

export const ScheduleBlockSchema = AppBaseBlockSchema.extend({
  type: z.literal('schedule'),
});
export type ScheduleBlock = z.infer<typeof ScheduleBlockSchema>;

export const TransportationBlockSchema = AppBaseBlockSchema.extend({
  type: z.literal('transportation'),
  transportationType: TransportationTypeEnum,
  destinationLocation: LocationUpdateSchema.nullable().default(null),
});
export type TransportationBlock = z.infer<typeof TransportationBlockSchema>;

/**
 * アプリケーション内部で利用するブロックのスキーマ
 */
export const BlockSchema = z.discriminatedUnion('type', [ScheduleBlockSchema, TransportationBlockSchema]);
export type Block = z.infer<typeof BlockSchema>;
export type BlockType = Block['type'];

// --- API層のスキーマ ---

const ApiDefinitionSchema = z.object({
  id: z.number(),
  page_id: z.number(),
  start_time: z.string(), // APIからは文字列で返却
  end_time: z.string().nullable(), // nullish() -> nullable() に変更して undefined を排除し明確化
  detail: z.string().nullish(),
  title: z.string(),
  location_id: z.number().nullable().default(null),
  location: ApiLocationSchema.nullable().default(null),
});

const ApiMoveSchema = ApiDefinitionSchema.extend({
  block_type: z.literal('move'),
  transportation_type: TransportationTypeEnum,
  destination_location_id: z.number().nullable().default(null),
  destination_location: ApiLocationSchema.nullable().default(null),
});

const ApiEventSchema = ApiDefinitionSchema.extend({
  block_type: z.literal('event'),
});

const ApiStaySchema = ApiDefinitionSchema.extend({
  block_type: z.literal('stay'),
});

/**
 * APIから返ってくる生のデータ形式を表すスキーマユニオン
 */
const ApiBlockSchema = z.discriminatedUnion('block_type', [ApiMoveSchema, ApiEventSchema, ApiStaySchema]);
// API送信用の型定義もエクスポートしておく（必要であれば）
export type ApiBlock = z.infer<typeof ApiBlockSchema>;

// --- 変換スキーマ (API -> アプリケーション) ---
// ApiBlockSchemaをBlockSchemaに変換するロジック

/**
 * サーバーから返ってきた日時文字列をUTCとして解釈してDateオブジェクトに変換
 * サーバーが naive datetime を使用しているため、レスポンスに Z が付かない場合がある
 * その場合はローカルタイムゾーンとして解釈されてしまうため、Z を付けてUTCとして扱う
 */
const parseUtcDate = (dateStr: string): Date => {
  // すでに Z が付いている、またはタイムゾーン情報がある場合はそのまま
  if (dateStr.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(dateStr)) {
    return new Date(dateStr);
  }
  // Z がない場合は UTC として扱う
  return new Date(`${dateStr}Z`);
};

export const blockFromApi = ApiBlockSchema.transform(apiData => {
  const { start_time, end_time, page_id, block_type, location_id: _location_id, location, ...rest } = apiData;
  const common = {
    ...rest,
    startTime: parseUtcDate(start_time),
    endTime: end_time != null ? parseUtcDate(end_time) : null,
    pageId: page_id,
    location: location != null ? locationFromApi.parse(location) : null,
  };

  if (block_type === 'move') {
    const { destination_location_id: _dest_id, destination_location } = apiData;
    return {
      ...common,
      type: 'transportation' as const,
      transportationType: apiData.transportation_type,
      destinationLocation: destination_location != null ? locationFromApi.parse(destination_location) : null,
    };
  }

  return {
    ...common,
    type: 'schedule' as const,
  };
}) as z.ZodType<Block, unknown>;

// --- 変換スキーマ (アプリケーション -> API / PUT・POST 共通) ---
//
// サーバ側は後勝ち PUT セマンティクス。location / destination_location を
// 埋め込んだ全データを送ると、サーバ側で id 一致判定により行維持/新規作成される。
export const blockToApi = BlockSchema.transform(appData => {
  const { startTime, endTime, pageId, type, location, ...rest } = appData;

  const common = {
    ...rest,
    start_time: startTime.toISOString(),
    end_time: endTime?.toISOString() ?? null,
    page_id: pageId,
    detail: appData.detail ?? '',
    location: location != null ? locationUpdateToApi.parse(location) : null,
  };

  if (type === 'transportation') {
    return {
      ...common,
      block_type: 'move' as const,
      transportation_type: appData.transportationType,
      destination_location:
        appData.destinationLocation != null ? locationUpdateToApi.parse(appData.destinationLocation) : null,
    };
  }

  // schedule の場合は一律 event として扱う
  return {
    ...common,
    block_type: 'event' as const,
  };
});
