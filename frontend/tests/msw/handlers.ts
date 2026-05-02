import type { HttpHandler } from 'msw';

/**
 * 全テスト共通で適用するデフォルトハンドラ。
 * ケース別のレスポンスは各テストファイルで `server.use(...)` を呼んで上書きする。
 */
export const handlers: HttpHandler[] = [];
