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
