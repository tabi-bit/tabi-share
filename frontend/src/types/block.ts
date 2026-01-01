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
  endTime: z.date(),
  details: z.string().nullish(),
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
  endTime: z.string(),
  details: z.string().nullish(),
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

// --- 変換スキーマ (API -> アプリケーション) ---
// ApiBlockSchemaをBlockSchemaに変換するロジック

export const AppDataSchema = ApiBlockSchema.transform(apiData => {
  const { startTime, endTime, ...rest } = apiData;
  const common = {
    ...rest,
    startTime: new Date(startTime),
    endTime: new Date(endTime),
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
