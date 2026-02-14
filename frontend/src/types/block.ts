import { z } from 'zod';

// --- 共通の型定義 ---

/**
 * 交通手段の列挙型スキーマ
 */
export const TransportationTypeEnum = z.enum(['car', 'bicycle', 'walk', 'ship', 'train', 'bus', 'flight']);
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
  { value: 'bus', label: 'バス' },
  { value: 'walk', label: '徒歩' },
  { value: 'bicycle', label: '自転車' },
  { value: 'ship', label: '船' },
  { value: 'flight', label: '飛行機' },
] as const satisfies readonly { value: TransportationType; label: string }[];

// --- アプリケーション層のスキーマ ---

/**
 * アプリケーション内で利用するブロックのベーススキーマ
 * 各ブロックに共通するプロパティを定義します。
 */
const AppBaseBlockSchema = z.object({
  id: z.number(),
  title: z.string(),
  startTime: z.date(),
  endTime: z.date().nullable(),
  detail: z.string().nullish(),
  pageId: z.number(),
});

export const ScheduleBlockSchema = AppBaseBlockSchema.extend({
  type: z.literal('schedule'),
});
export type ScheduleBlock = z.infer<typeof ScheduleBlockSchema>;

export const TransportationBlockSchema = AppBaseBlockSchema.extend({
  type: z.literal('transportation'),
  transportationType: TransportationTypeEnum,
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
});

const ApiMoveSchema = ApiDefinitionSchema.extend({
  block_type: z.literal('move'),
  transportation_type: TransportationTypeEnum,
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

export const AppResponseBlockSchema = ApiBlockSchema.transform(apiData => {
  const { start_time, end_time, page_id, block_type, ...rest } = apiData;
  const common = {
    ...rest,
    startTime: parseUtcDate(start_time),
    endTime: end_time != null ? parseUtcDate(end_time) : null,
    pageId: page_id,
  };

  if (block_type === 'move') {
    return {
      ...common,
      type: 'transportation' as const,
      transportationType: apiData.transportation_type,
    };
  }

  return {
    ...common,
    type: 'schedule' as const,
  };
}).pipe(BlockSchema);

// --- 変換スキーマ (アプリケーション -> API) ---
// BlockSchemaをApiBlockSchemaの形に変換するロジック
export const AppRequestBlockSchema = BlockSchema.transform((appData): ApiBlock => {
  const { startTime, endTime, pageId, type, ...rest } = appData;

  const common = {
    ...rest,
    start_time: startTime.toISOString(),
    end_time: endTime?.toISOString() ?? null,
    page_id: pageId,
    detail: appData.detail ?? '',
  };

  if (type === 'transportation') {
    return {
      ...common,
      block_type: 'move',
      transportation_type: (appData as TransportationBlock).transportationType,
    };
  }

  // schedule の場合は一律 event として扱う
  return {
    ...common,
    block_type: 'event',
  };
});

/**
 * API送信時に一部プロパティを省略したApiBlockスキーマを生成します。
 * 主に新規作成時のペイロード生成に利用されます。
 * @template K 省略するキーの型
 * @param keys 省略するキーの配列
 * @returns プロパティが省略されたApiBlockスキーマ
 */
export const createOmittedApiBlockSchema = <K extends keyof ScheduleBlock | keyof TransportationBlock>(keys: K[]) => {
  const omitOptions = Object.fromEntries(keys.map(k => [k, true as true]));
  return z.discriminatedUnion(
    'blockType',
    ApiBlockSchema.options.map((schema: z.ZodObject) => schema.omit(omitOptions)) as [z.ZodObject, ...z.ZodObject[]]
  );
};
