import type { Member } from '../candidates/types';

/**
 * 新しい旅程作成フローの段階。null は従来どおり Page / Block を直接編集する旅。
 * 将来 API (`planning_phase`) で返す想定の型。
 */
export type PlanningPhase = 'collecting' | 'deciding' | 'planned' | null;

/** ホーム一覧の状態バッジ用に、旅ごとの進み具合をまとめたもの */
export type TripPlanningSummary = {
  tripId: number;
  planningPhase: PlanningPhase;
  members: Member[];
  /** 見送り (全員パス) を除いた行きたい所の数 */
  candidateCount: number;
  /** そのうち自分が ♥ / パスを付けた数 */
  myVoteCount: number;
  /** 自分が投票を終えた後に追加された候補があり、未投票 */
  hasNewCandidates: boolean;
  /** 自分以外のメンバーが全員投票を終えた */
  othersCompleted: boolean;
  deadlinePassed: boolean;
  /** Page / Block が 1 件以上ある */
  hasItinerary: boolean;
};

/** ホームの地球儀に立てる、行ったことのある場所 */
export type VisitedPlace = {
  tripId: number;
  title: string;
  name: string;
  latitude: number;
  longitude: number;
};
