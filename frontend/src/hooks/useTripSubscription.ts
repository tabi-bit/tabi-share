import { useCallback, useState } from 'react';

/**
 * Trip 単位の通知購読状態を管理するフック。
 *
 * TODO(#148 α マージ後): SWR で以下 API を叩く形に置き換える:
 *   - GET  /api/v1/trips/{tripId}/subscription?fcm_token=... で購読状態取得
 *   - POST /api/v1/trips/{tripId}/subscription で購読作成
 *   - DELETE /api/v1/trips/{tripId}/subscription?fcm_token=... で解除
 *   - POST /api/v1/trips/{tripId}/subscription/test でテスト送信 (5 秒 rate limit)
 *
 * 現在はローカル state のみで UI 骨組みを検証するための stub 実装。
 */
export type UseTripSubscriptionResult = {
  isSubscribed: boolean;
  isLoading: boolean;
  subscribe: (params: { fcmToken: string; timezone: string; userAgent?: string }) => Promise<void>;
  unsubscribe: (params: { fcmToken: string }) => Promise<void>;
  sendTest: (params: { fcmToken: string }) => Promise<void>;
};

export const useTripSubscription = (_tripId: number | null): UseTripSubscriptionResult => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const subscribe = useCallback<UseTripSubscriptionResult['subscribe']>(async _params => {
    setIsLoading(true);
    try {
      // TODO(#148): apiClient.post(`/api/v1/trips/${tripId}/subscription`, { fcmToken, timezone, userAgent })
      await new Promise(resolve => setTimeout(resolve, 200));
      setIsSubscribed(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const unsubscribe = useCallback<UseTripSubscriptionResult['unsubscribe']>(async _params => {
    setIsLoading(true);
    try {
      // TODO(#148): apiClient.delete(`/api/v1/trips/${tripId}/subscription`, { params: { fcm_token: ... } })
      await new Promise(resolve => setTimeout(resolve, 200));
      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendTest = useCallback<UseTripSubscriptionResult['sendTest']>(async _params => {
    // TODO(#148): apiClient.post(`/api/v1/trips/${tripId}/subscription/test`, { fcm_token: ... })
    await new Promise(resolve => setTimeout(resolve, 200));
  }, []);

  return { isSubscribed, isLoading, subscribe, unsubscribe, sendTest };
};
