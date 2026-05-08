import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * Vitest (Node 環境) 用の MSW サーバ。
 * `tests/setup.ts` で listen / resetHandlers / close を実行する。
 */
export const server = setupServer(...handlers);
