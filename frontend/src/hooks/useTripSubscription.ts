import { useCallback, useEffect, useState } from 'react';
import useSWR from 'swr';
import { z } from 'zod';
import { apiClient } from '@/lib/apiClient';
import { fetchFcmToken as getFcmToken } from '@/lib/messaging';

const DeviceSubscriptionSchema = z.object({
  id: z.number(),
  trip_id: z.number(),
  fcm_token: z.string(),
  timezone: z.string(),
  minutes_before: z.number(),
  user_agent: z.string().nullable(),
  created_at: z.string(),
  last_seen_at: z.string(),
});

const SubscriptionResponseSchema = DeviceSubscriptionSchema.nullable();

export type UseTripSubscriptionResult = {
  isSubscribed: boolean;
  isLoading: boolean;
  subscribe: (params: { fcmToken: string; timezone: string; userAgent?: string }) => Promise<void>;
  unsubscribe: (params: { fcmToken: string }) => Promise<void>;
  sendTest: (params: { fcmToken: string }) => Promise<void>;
};

const FCM_TOKEN_HEADER = 'X-FCM-Token';

// hash fragment (#) は request に含まれないため、SWR cache identity 用に token prefix を付けても
// アクセスログには残らない。fcm_token を URL query に載せないための仕掛け。
const buildSubscriptionKey = (tripId: number, fcmTokenPrefix: string) =>
  `/trips/${tripId}/subscription#${fcmTokenPrefix}`;

export const useTripSubscription = (tripId: number | null): UseTripSubscriptionResult => {
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;

    let cancelled = false;
    getFcmToken()
      .then(token => {
        if (!cancelled && token) setFcmToken(token);
      })
      .catch(() => {
        // token 取得に失敗しても isSubscribed=false のまま UI は動くので握り潰す
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const swrKey = tripId != null && fcmToken != null ? buildSubscriptionKey(tripId, fcmToken.slice(0, 8)) : null;
  const { data, isLoading, mutate } = useSWR(swrKey, async () => {
    if (tripId == null || fcmToken == null) return null;
    const res = await apiClient.get(`/trips/${tripId}/subscription`, {
      headers: { [FCM_TOKEN_HEADER]: fcmToken },
    });
    return SubscriptionResponseSchema.parse(res.data);
  });

  const isSubscribed = data != null;

  const subscribe = useCallback<UseTripSubscriptionResult['subscribe']>(
    async params => {
      if (tripId == null) return;
      const res = await apiClient.post(`/trips/${tripId}/subscription`, {
        fcm_token: params.fcmToken,
        timezone: params.timezone,
        user_agent: params.userAgent,
      });
      const parsed = DeviceSubscriptionSchema.parse(res.data);
      setFcmToken(params.fcmToken);
      await mutate(parsed, { revalidate: false });
    },
    [tripId, mutate]
  );

  const unsubscribe = useCallback<UseTripSubscriptionResult['unsubscribe']>(
    async params => {
      if (tripId == null) return;
      await apiClient.delete(`/trips/${tripId}/subscription`, {
        headers: { [FCM_TOKEN_HEADER]: params.fcmToken },
      });
      await mutate(null, { revalidate: false });
    },
    [tripId, mutate]
  );

  const sendTest = useCallback<UseTripSubscriptionResult['sendTest']>(
    async params => {
      if (tripId == null) return;
      await apiClient.post(`/trips/${tripId}/subscription/test`, null, {
        headers: { [FCM_TOKEN_HEADER]: params.fcmToken },
      });
    },
    [tripId]
  );

  return { isSubscribed, isLoading, subscribe, unsubscribe, sendTest };
};
