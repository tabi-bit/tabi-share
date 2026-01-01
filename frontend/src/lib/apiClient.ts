import axios from 'axios';
import _ from 'lodash';

// スネークケースのキーをローワーキャメルケースに変換するヘルパー関数
const keysToCamel = (obj: any): any => {
  if (_.isObject(obj) && !_.isArray(obj)) {
    return _.reduce(
      obj,
      (acc, value, key) => {
        acc[_.camelCase(key)] = keysToCamel(value);
        return acc;
      },
      {} as any
    );
  }
  if (_.isArray(obj)) {
    return _.map(obj, (item: any) => keysToCamel(item));
  }
  return obj;
};

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.response.use(
  response => {
    // 応答データがオブジェクトまたは配列の場合にキーを変換
    if (response.data && (typeof response.data === 'object' || Array.isArray(response.data))) {
      response.data = keysToCamel(response.data);
    }
    return response;
  },
  error => {
    return Promise.reject(error);
  }
);

export const fetcher = (url: string) => apiClient.get(url).then(res => res.data);

// --- Mock API Implementation ---
// NOTE: バックエンドが実装され次第、この部分は削除してください。
const appEnv = import.meta.env.VITE_APP_ENV;
if (appEnv !== 'local') {
  const mockDelay = 500; // 疑似的なネットワーク遅延

  apiClient.interceptors.request.use(async config => {
    // config.urlからbaseURLを削除してパスのみを取得
    const path = config.url?.replace(apiClient.defaults.baseURL ?? '', '');
    if (!path) return config;

    console.log(`[Mock] Intercepting: ${config.method?.toUpperCase()} ${path}`);

    // --- GETリクエストのモック ---
    if (config.method === 'get') {
      let data: any = null;

      // TODO: 必要に応じてモックデータを追加・修正してください
      // --- Trip ---
      if (path.startsWith('/trips/url/')) {
        const urlId = path.split('/')[3];
        data = { id: 1, urlId, title: `(Mock)の旅` };
      } else if (path.match(/^\/trips\/\d+$/)) {
        const id = Number(path.split('/')[2]);
        data = { id, urlId: `mock-trip-${id}`, title: `(Mock) ID:${id}の旅` };
      } else if (path === '/trips') {
        data = [{ id: 1, urlId: 'mock-trip-1', title: '(Mock) はじめての旅行' }];
      }
      // --- Page ---
      else if (path.match(/^\/trips\/\d+\/pages$/)) {
        const tripId = Number(path.split('/')[2]);
        data = [{ id: 1, tripId, title: `(Mock) ${tripId}の旅-1日目` }];
      }
      // --- Block ---
      else if (path.match(/^\/pages\/\d+\/blocks$/)) {
        const pageId = Number(path.split('/')[2]);
        data = [
          {
            id: 1,
            pageId,
            blockType: 'event',
            title: '架空のイベント',
            start_time: '2024-01-01T08:00:00.000Z',
            end_time: '2024-01-01T09:00:00.000Z',
            detail: '(Mock) テキストブロック',
            transportation_type: 'car',
          },
          {
            id: 2,
            pageId,
            blockType: 'move',
            title: '車移動',
            start_time: '2024-01-01T10:00:00.000Z',
            end_time: '2024-01-01T12:00:00.000Z',
            detail: '(Mock) テキストブロック',
            transportation_type: 'car',
          },
        ];
      }

      if (data) {
        console.log(`[Mock] Responding for GET ${path}`, data);
        // adapterを上書きしてモックレスポンスを返す
        config.adapter = adapterConfig => {
          return new Promise(resolve => {
            setTimeout(() => {
              resolve({
                data,
                status: 200,
                statusText: 'OK',
                headers: {},
                config: adapterConfig,
              });
            }, mockDelay);
          });
        };
        return config;
      }
    }

    console.warn(`[Mock] No mock definition for ${config.method?.toUpperCase()} ${path}. Passing through.`);
    return config;
  });
}
