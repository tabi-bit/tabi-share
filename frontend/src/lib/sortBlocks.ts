import type { Block } from '@/types/block';

/**
 * Block を startTime 昇順 → endTime 昇順（null 先頭）で並び替える。
 *
 * サーバー返却順はソート保証がないため、サービス層（useBlocks）と表示層で
 * 一貫した時系列順を担保するために使用する。
 */
export const sortBlocks = (blocks: Block[]): Block[] =>
  [...blocks].sort((a, b) => {
    const startDiff = a.startTime.getTime() - b.startTime.getTime();
    if (startDiff !== 0) return startDiff;
    // startTime が同じ場合: endTime 昇順（null 先頭）
    if (a.endTime === null && b.endTime === null) return 0;
    if (a.endTime === null) return -1;
    if (b.endTime === null) return 1;
    return a.endTime.getTime() - b.endTime.getTime();
  });
