import type { ApiBlock } from '@/types/block';
import type { ApiPage } from '@/types/page';
import type { Member } from '../candidates/types';
import type { DbPlanning, DbTrip, Destination } from '../db';
import { daysFromToday } from './dates';

const ME: Member = { id: 'me', name: null, isMe: true };
const member = (id: string, name: string): Member => ({ id, name, isMe: false });

type TripSeed = {
  id: number;
  title: string;
  urlId: string;
  /** 行き先。地球儀のピンに使う。未定は null */
  place: Destination | null;
  /** 今日からの日数。null は日程未定 */
  start: number | null;
  nights: number;
  archived?: boolean;
  members: Member[];
  planning: DbPlanning;
  /** 旅程ありにするページのブロック (時刻, タイトル) */
  blocks?: [number, string][];
};

const TRIPS: TripSeed[] = [
  {
    id: 2,
    title: '金沢 食べ歩き',
    urlId: 'kanazawa-mock',
    place: { name: '金沢', latitude: 36.5613, longitude: 136.6562 },
    start: 30,
    nights: 1,
    members: [ME, member('mika', 'みか'), member('sho', 'しょう')],
    planning: {
      phase: 'collecting',
      fixed: {
        candidateCount: 14,
        myVoteCount: 12,
        hasNewCandidates: true,
        othersCompleted: false,
        deadlinePassed: false,
      },
    },
  },
  {
    id: 3,
    title: '伊豆 海とひもの',
    urlId: 'izu-mock',
    place: { name: '伊豆', latitude: 34.9756, longitude: 139.0956 },
    start: 45,
    nights: 1,
    members: [ME, member('yuko', 'ゆうこ'), member('ken', 'けん'), member('aya', 'あや')],
    planning: {
      phase: 'collecting',
      fixed: {
        candidateCount: 9,
        myVoteCount: 9,
        hasNewCandidates: false,
        othersCompleted: false,
        deadlinePassed: false,
      },
    },
  },
  {
    id: 4,
    title: '草津 湯畑めぐり',
    urlId: 'kusatsu-mock',
    place: { name: '草津温泉', latitude: 36.6205, longitude: 138.5961 },
    start: 20,
    nights: 1,
    members: [ME, member('yuko', 'ゆうこ')],
    planning: {
      phase: 'deciding',
      fixed: {
        candidateCount: 11,
        myVoteCount: 11,
        hasNewCandidates: false,
        othersCompleted: true,
        deadlinePassed: true,
      },
    },
  },
  {
    id: 5,
    title: '京都 紅葉さんぽ',
    urlId: 'kyoto-mock',
    place: { name: '京都', latitude: 35.0116, longitude: 135.7681 },
    start: 5,
    nights: 1,
    members: [ME, member('mika', 'みか')],
    planning: { phase: null },
    blocks: [
      [9, '清水寺'],
      [12, '湯豆腐 ランチ'],
      [14, '哲学の道'],
    ],
  },
  {
    id: 6,
    title: '次の夏旅',
    urlId: 'summer-mock',
    place: null,
    start: null,
    nights: 0,
    members: [ME, member('ken', 'けん'), member('sho', 'しょう')],
    planning: {
      phase: 'collecting',
      fixed: {
        candidateCount: 16,
        myVoteCount: 7,
        hasNewCandidates: false,
        othersCompleted: false,
        deadlinePassed: false,
      },
    },
  },
  {
    id: 7,
    title: '日光 東照宮',
    urlId: 'nikko-mock',
    place: { name: '日光', latitude: 36.7199, longitude: 139.6982 },
    start: -40,
    nights: 1,
    members: [ME, member('yuko', 'ゆうこ'), member('ken', 'けん')],
    planning: { phase: null },
    blocks: [
      [10, '日光東照宮'],
      [14, '華厳の滝'],
    ],
  },
  {
    id: 8,
    title: '軽井沢 アウトレット',
    urlId: 'karuizawa-mock',
    place: { name: '軽井沢', latitude: 36.3484, longitude: 138.597 },
    start: -120,
    nights: 0,
    members: [ME, member('mika', 'みか')],
    planning: { phase: null },
    blocks: [[11, 'アウトレット']],
  },
  {
    id: 9,
    title: '沖縄 本島ドライブ',
    urlId: 'okinawa-mock',
    place: { name: '沖縄本島', latitude: 26.2124, longitude: 127.6809 },
    start: -300,
    nights: 2,
    archived: true,
    members: [ME, member('ken', 'けん')],
    planning: { phase: null },
    blocks: [[10, '美ら海水族館']],
  },
  {
    id: 10,
    title: '台北 夜市めぐり',
    urlId: 'taipei-mock',
    place: { name: '台北', latitude: 25.033, longitude: 121.5654 },
    start: -420,
    nights: 2,
    members: [ME, member('mika', 'みか')],
    planning: { phase: null },
    blocks: [[18, '士林夜市']],
  },
  {
    id: 11,
    title: 'ホノルル',
    urlId: 'honolulu-mock',
    place: { name: 'ホノルル', latitude: 21.3069, longitude: -157.8583 },
    start: -620,
    nights: 4,
    members: [ME, member('yuko', 'ゆうこ'), member('ken', 'けん')],
    planning: { phase: null },
    blocks: [[9, 'ダイヤモンドヘッド']],
  },
  {
    id: 12,
    title: '札幌 雪まつり',
    urlId: 'sapporo-mock',
    place: { name: '札幌', latitude: 43.0618, longitude: 141.3545 },
    start: -250,
    nights: 2,
    members: [ME, member('sho', 'しょう')],
    planning: { phase: null },
    blocks: [[10, '大通公園']],
  },
];

/** ホーム一覧の状態バッジを一通り確認するための旅 (箱根以外) */
export const seedHomeTrips = (now: string) => {
  const trips: DbTrip[] = TRIPS.map(t => ({
    id: t.id,
    title: t.title,
    detail: null,
    people_num: t.members.length,
    url_id: t.urlId,
    start_date: t.start != null ? daysFromToday(t.start) : null,
    end_date: t.start != null ? daysFromToday(t.start + t.nights) : null,
    walica_url: null,
    created_at: now,
    last_edited_at: now,
    archived: t.archived ?? false,
  }));

  const pages: ApiPage[] = TRIPS.filter(t => t.blocks).map(t => ({
    id: t.id * 100,
    title: '1日目',
    detail: null,
    trip_id: t.id,
    date: t.start != null ? daysFromToday(t.start) : null,
  }));

  const blocks: ApiBlock[] = TRIPS.flatMap(t =>
    (t.blocks ?? []).map(([hour, title], i) => ({
      id: t.id * 1000 + i,
      block_type: 'event' as const,
      page_id: t.id * 100,
      title,
      start_time: new Date(2026, 0, 1, hour).toISOString(),
      end_time: new Date(2026, 0, 1, hour + 1, 30).toISOString(),
      detail: '',
      location_id: null,
      location: null,
    }))
  );

  return {
    trips,
    pages,
    blocks,
    members: Object.fromEntries(TRIPS.map(t => [t.id, t.members])),
    planning: Object.fromEntries(TRIPS.map(t => [t.id, t.planning])),
    destinations: Object.fromEntries(TRIPS.filter(t => t.place).map(t => [t.id, t.place as Destination])),
  };
};
