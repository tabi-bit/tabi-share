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
  pageId: z.number(),
  startTime: z.string(), // APIからは文字列で返却
  endTime: z.string().nullable(), // nullish() -> nullable() に変更して undefined を排除し明確化
  detail: z.string().nullish(),
  title: z.string(),
});

const ApiMoveSchema = ApiDefinitionSchema.extend({
  blockType: z.literal('move'),
  transportationType: TransportationTypeEnum,
});

const ApiEventSchema = ApiDefinitionSchema.extend({
  blockType: z.literal('event'),
});

const ApiStaySchema = ApiDefinitionSchema.extend({
  blockType: z.literal('stay'),
});

/**
 * APIから返ってくる生のデータ形式を表すスキーマユニオン
 */
const ApiBlockSchema = z.discriminatedUnion('blockType', [ApiMoveSchema, ApiEventSchema, ApiStaySchema]);
// API送信用の型定義もエクスポートしておく（必要であれば）
export type ApiBlock = z.infer<typeof ApiBlockSchema>;

// --- 変換スキーマ (API -> アプリケーション) ---
// ApiBlockSchemaをBlockSchemaに変換するロジック

export const AppResponseBlockSchema = ApiBlockSchema.transform(apiData => {
  const { startTime, endTime, ...rest } = apiData;
  const common = {
    ...rest,
    startTime: new Date(startTime),
    endTime: endTime != null ? new Date(endTime) : null,
  };

  if (common.blockType === 'move') {
    // biome-ignore lint/correctness/noUnusedVariables: delete key
    const { blockType, ...moveData } = common;
    return {
      ...moveData,
      type: 'transportation' as const,
    };
  }

  // biome-ignore lint/correctness/noUnusedVariables: delete key
  const { blockType, ...scheduleData } = common;
  return {
    ...scheduleData,
    type: 'schedule' as const,
  };
}).pipe(BlockSchema);

// --- 変換スキーマ (アプリケーション -> API) ---
// BlockSchemaをApiBlockSchemaの形に変換するロジック
export const AppRequestBlockSchema = BlockSchema.transform((appData): ApiBlock => {
  const { startTime, endTime, type, ...rest } = appData;

  const common = {
    ...rest,
    startTime: startTime.toISOString(),
    endTime: endTime?.toISOString() ?? null,
  };

  if (type === 'transportation') {
    return {
      ...common,
      blockType: 'move',
      transportationType: (appData as TransportationBlock).transportationType,
    };
  }

  // schedule の場合は一律 event として扱う
  return {
    ...common,
    blockType: 'event',
  };
}).pipe(ApiBlockSchema);

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
