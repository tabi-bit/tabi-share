import type { AxiosError } from 'axios';
import axios from 'axios';
import { ZodError, z } from 'zod';

/** APIエラーの統一型 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(message: string, statusCode: number, code: string = 'unknown_error') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/** HTTPステータスコード → 日本語フォールバック */
const STATUS_MESSAGE_MAP: Record<number, string> = {
  400: '入力内容に誤りがあります',
  401: '認証が必要です',
  403: 'この操作は許可されていません',
  404: 'データが見つかりませんでした',
  422: '入力値の形式が正しくありません',
  500: 'サーバーエラーが発生しました。しばらくしてから再度お試しください。',
};

/**
 * AxiosError → AppError 変換
 *
 * バックエンドの2種類のエラー形式に対応:
 * - ErrorResponseException: { message, code, detail } → messageを優先使用
 * - HTTPException: { detail: "..." } → STATUS_MESSAGE_MAPのフォールバックを使用
 */
export const toAppError = (err: AxiosError): AppError => {
  const status = err.response?.status ?? 0;
  const data = err.response?.data as Record<string, unknown> | undefined;

  if (data) {
    // ErrorResponseException形式: { message, code, detail }
    if (typeof data.message === 'string' && data.message.length > 0) {
      const code = typeof data.code === 'string' ? data.code : 'unknown_error';
      return new AppError(data.message, status, code);
    }
  }

  // HTTPException形式 or レスポンスなし → フォールバック日本語メッセージ
  const fallback = STATUS_MESSAGE_MAP[status] ?? 'エラーが発生しました';
  return new AppError(fallback, status);
};

/** unknown → 表示用メッセージ抽出 */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof AppError) return error.message;
  if (error instanceof ZodError) {
    console.error(`[ZodError] スキーマ検証に失敗しました:\n${z.prettifyError(error)}`);
    const flat = z.flattenError(error);
    const fieldMessages =
      '\n' +
      Object.values(flat.fieldErrors)
        .map(msgs => `${(msgs as string[]).join('・')}`)
        .join('・');
    const base = 'データの形式が正しくありません';
    return fieldMessages ? `${base} （${fieldMessages}）` : base;
  }
  if (error instanceof Error) return error.message;
  return '不明なエラーが発生しました';
};

/** axios の型ガード（インターセプターから使用） */
export const isAxiosError = axios.isAxiosError;
