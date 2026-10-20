import { useAtomValue } from 'jotai';
import useSWR, { useSWRConfig } from 'swr';
import { tripAtom } from '@/atoms/tripPage';
import { apiClient, fetcher } from '@/lib/apiClient';
import type {
  Candidate,
  ExtractedReservation,
  Member,
  ParsedStayUrl,
  PlaceSearchResult,
  Recruitment,
  SpotCandidate,
  StayCandidate,
  StayDecision,
  Suggestion,
  SuggestRequest,
  Vote,
} from './types';

export const ME = 'me';

const candidatesKey = (tripId: number) => `/trips/${tripId}/candidates`;
const membersKey = (tripId: number) => `/trips/${tripId}/members`;
const recruitmentKey = (tripId: number) => `/trips/${tripId}/recruitment`;
const stayDecisionsKey = (tripId: number) => `/trips/${tripId}/stay-decisions`;

/** TripPage 配下では tripAtom、単独ページでは URL から取った trip の id を使う */
export const useCurrentTripId = (fallback?: number | null): number | null => {
  const trip = useAtomValue(tripAtom);
  return fallback ?? trip?.id ?? null;
};

export const useCandidates = (tripId: number | null) => {
  const { data, error, isLoading } = useSWR<Candidate[]>(tripId ? candidatesKey(tripId) : null, fetcher);
  const spots = (data ?? []).filter((c): c is SpotCandidate => c.kind === 'spot');
  const stays = (data ?? []).filter((c): c is StayCandidate => c.kind === 'stay');
  return { candidates: data, spots, stays, error, isLoading };
};

export const useMembers = (tripId: number | null) => {
  const { data } = useSWR<Member[]>(tripId ? membersKey(tripId) : null, fetcher);
  const members = data ?? [];
  const me = members.find(m => m.isMe) ?? null;
  return { members, me };
};

export const useRecruitment = (tripId: number | null) => {
  const { data } = useSWR<Recruitment>(tripId ? recruitmentKey(tripId) : null, fetcher);
  return { recruitment: data };
};

export const useStayDecisions = (tripId: number | null) => {
  const { data } = useSWR<StayDecision[]>(tripId ? stayDecisionsKey(tripId) : null, fetcher);
  return { decisions: data ?? [] };
};

/** 候補の作成・更新・削除。♥ / パスは楽観更新する */
export const useCandidateMutations = (tripId: number | null) => {
  const { mutate } = useSWRConfig();
  const key = tripId ? candidatesKey(tripId) : null;

  const patchLocal = (id: number, patch: (c: Candidate) => Candidate) =>
    mutate<Candidate[]>(key, list => list?.map(c => (c.id === id ? patch(c) : c)), { revalidate: false });

  const vote = async (candidate: Candidate, myVote: Vote | null) => {
    await patchLocal(candidate.id, c => {
      const { [ME]: _, ...others } = c.votes;
      return { ...c, votes: myVote ? { ...others, [ME]: myVote } : others };
    });
    await apiClient.patch(`/candidates/${candidate.id}`, { myVote });
  };

  const update = async (id: number, data: Partial<Candidate>) => {
    await patchLocal(id, c => ({ ...c, ...data }) as Candidate);
    await apiClient.patch(`/candidates/${id}`, data);
    await mutate(key);
  };

  const remove = async (id: number) => {
    await mutate<Candidate[]>(key, list => list?.filter(c => c.id !== id), { revalidate: false });
    await apiClient.delete(`/candidates/${id}`);
  };

  const restore = async (id: number) => {
    await apiClient.post(`/candidates/${id}/restore`);
    await mutate(key);
  };

  const create = async (data: Partial<Candidate> & { kind: Candidate['kind'] }): Promise<Candidate> => {
    const res = await apiClient.post<Candidate>(`/trips/${tripId}/candidates`, data);
    await mutate(key);
    return res.data;
  };

  /** ブロック削除など、別の操作で候補が変わったあとに取り直す */
  const refresh = () => mutate(key);

  return { vote, update, remove, restore, create, refresh };
};

export const useUpdateMyName = (tripId: number | null) => {
  const { mutate } = useSWRConfig();
  return async (name: string) => {
    await apiClient.put(`/trips/${tripId}/members/me`, { name });
    await mutate(tripId ? membersKey(tripId) : null);
  };
};

export const useUpdateRecruitment = (tripId: number | null) => {
  const { mutate } = useSWRConfig();
  return async (data: Recruitment) => {
    await mutate(tripId ? recruitmentKey(tripId) : null, data, { revalidate: false });
    await apiClient.put(`/trips/${tripId}/recruitment`, data);
  };
};

export const useUpdateStayDecision = (tripId: number | null) => {
  const { mutate } = useSWRConfig();
  return async (night: number, decision: Omit<StayDecision, 'night'> | null) => {
    const key = tripId ? stayDecisionsKey(tripId) : null;
    await mutate<StayDecision[]>(
      key,
      list => {
        const others = (list ?? []).filter(d => d.night !== night);
        return decision ? [...others, { ...decision, night }] : others;
      },
      { revalidate: false }
    );
    await apiClient.put(`/trips/${tripId}/stay-decisions/${night}`, decision);
  };
};

export const requestSuggestions = async (tripId: number, req: SuggestRequest) => {
  const res = await apiClient.post<{ excludedCount: number; suggestions: Suggestion[] }>(
    `/trips/${tripId}/suggestions`,
    req
  );
  return res.data;
};

export const dismissSuggestion = (tripId: number, key: string) =>
  apiClient.post(`/trips/${tripId}/suggestions/${key}/dismiss`);

export const undismissSuggestion = (tripId: number, key: string) =>
  apiClient.delete(`/trips/${tripId}/suggestions/${key}/dismiss`);

export const searchPlaces = async (q: string) => {
  const res = await apiClient.get<PlaceSearchResult[]>('/places/search', { params: { q } });
  return res.data;
};

/**
 * 宿ページの URL から宿名・画像を取り、宿名で場所を引いた結果。取れなければ status が failed。
 * mode: ogp はリンクプレビューの情報だけを読む (速い)。render はページを開いて表示後の中身を AI が読む (遅い)
 */
export const previewStayUrl = async (tripId: number, url: string, mode: 'ogp' | 'render') => {
  const res = await apiClient.post<ParsedStayUrl>(`/trips/${tripId}/stays/preview`, { url, mode });
  return res.data;
};

export const extractReservation = async (text: string) => {
  const res = await apiClient.post<ExtractedReservation>('/ai/extract-reservation', { text });
  return res.data;
};
