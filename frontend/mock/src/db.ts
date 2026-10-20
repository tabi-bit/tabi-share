import type { ApiBlock } from '@/types/block';
import type { ApiLocation } from '@/types/location';
import type { ApiPage } from '@/types/page';
import type { ApiTrip } from '@/types/trip';
import { seedCandidates } from './candidates/seed';
import type { Member, Recruitment, SpotCandidate, StayCandidate, StayDecision } from './candidates/types';
import { daysFromToday } from './home/dates';
import { seedHomeTrips } from './home/seed';
import type { PlanningPhase, TripPlanningSummary } from './home/types';

export type DbTrip = ApiTrip & { archived: boolean };

/** placement は API レスポンス時に組み立てるため保存しない */
export type DbCandidate = Omit<SpotCandidate, 'placement'> | StayCandidate;

/** 旅の段階。fixed が無い旅は候補・投票データから進み具合を計算する */
export type DbPlanning = {
  phase: PlanningPhase;
  fixed?: Pick<
    TripPlanningSummary,
    'candidateCount' | 'myVoteCount' | 'hasNewCandidates' | 'othersCompleted' | 'deadlinePassed'
  >;
};

/** 旅の行き先。モック専用 (将来は Trip か Page の場所から引く想定) */
export type Destination = { name: string; latitude: number; longitude: number };

export type Db = {
  seq: number;
  trips: DbTrip[];
  pages: ApiPage[];
  blocks: ApiBlock[];
  members: Record<number, Member[]>;
  candidates: (DbCandidate & { deleted: boolean })[];
  recruitments: Record<number, Recruitment>;
  stayDecisions: Record<number, StayDecision[]>;
  dismissedSuggestions: Record<number, string[]>;
  planning: Record<number, DbPlanning>;
  destinations: Record<number, Destination>;
};

// スキーマを変えたら上げる。閲覧者ごとの localStorage に残った古いデータを捨てるため
const STORAGE_KEY = 'mock-db-v5';

const location = (id: number, name: string, lat: number, lng: number): ApiLocation => ({
  id,
  google_place_id: null,
  name,
  address: null,
  latitude: lat,
  longitude: lng,
  website_uri: null,
});

// ブロック時刻は年月日に意味が無い (types/block.ts)。UTC で保持し、表示時にローカル時刻へ変換される
const at = (h: number, m = 0) => new Date(2026, 9, 10, h, m).toISOString();

const event = (
  id: number,
  pageId: number,
  title: string,
  start: string,
  end: string | null,
  loc: ApiLocation | null,
  detail = ''
): ApiBlock => ({
  id,
  block_type: 'event',
  page_id: pageId,
  title,
  start_time: start,
  end_time: end,
  detail,
  location_id: loc?.id ?? null,
  location: loc,
});

const move = (id: number, pageId: number, title: string, start: string, end: string): ApiBlock => ({
  id,
  block_type: 'move',
  transportation_type: 'car',
  page_id: pageId,
  title,
  start_time: start,
  end_time: end,
  detail: '',
  location_id: null,
  location: null,
  destination_location_id: null,
  destination_location: null,
});

const seed = (): Db => {
  const now = new Date().toISOString();
  const home = seedHomeTrips(now);
  const candidates = seedCandidates(now);
  return {
    seq: 1000,
    trips: [
      {
        id: 1,
        title: '箱根・強羅 温泉旅',
        detail: '集合は 8:00 に自宅前。\n\n- 宿: [強羅の旅館A]\n- 割り勘は Walica で',
        people_num: 3,
        url_id: 'hakone-mock',
        start_date: daysFromToday(10),
        end_date: daysFromToday(12),
        walica_url: null,
        created_at: now,
        last_edited_at: now,
        archived: false,
      },
      ...home.trips,
    ],
    pages: [
      { id: 11, title: '1日目', detail: null, trip_id: 1, date: daysFromToday(10) },
      { id: 12, title: '2日目', detail: null, trip_id: 1, date: daysFromToday(11) },
      { id: 13, title: '3日目', detail: null, trip_id: 1, date: daysFromToday(12) },
      ...home.pages,
    ],
    blocks: [
      move(101, 11, '自宅 → 箱根湯本', at(8, 30), at(10)),
      event(
        102,
        11,
        '湯本で食べ歩き',
        at(10),
        at(11, 30),
        location(1, '箱根湯本駅', 35.2329, 139.1056),
        '- 丸嶋本店のまんじゅう\n- 箱根焙煎珈琲'
      ),
      move(103, 11, '湯本 → 強羅', at(11, 30), at(12)),
      event(104, 11, '田むら銀かつ亭', at(12), at(13), location(2, '田むら銀かつ亭', 35.2483, 139.0505)),
      move(105, 11, '強羅 → 大涌谷', at(15), at(15, 15)),
      event(106, 11, '大涌谷', at(15, 30), at(16, 30), location(3, '大涌谷くろたまご館', 35.2441, 139.0197)),
      move(107, 11, '大涌谷 → 強羅', at(16, 30), at(16, 50)),
      event(108, 11, '宿チェックイン', at(17), null, location(4, '[強羅の旅館A]', 35.2478, 139.0469)),
      event(201, 12, '朝食', at(8), at(9), null),
      move(202, 12, '強羅 → 芦ノ湖', at(9, 30), at(10)),
      event(203, 12, '箱根海賊船', at(10), at(11), location(5, '桃源台港', 35.2366, 139.0049)),
      event(204, 12, '箱根神社', at(11, 30), at(12, 30), location(6, '箱根神社', 35.2044, 139.0254)),
      event(301, 13, 'チェックアウト', at(10), null, null),
      move(302, 13, '強羅 → 自宅', at(14), at(16)),
      ...home.blocks,
    ],
    ...candidates,
    members: { ...candidates.members, ...home.members },
    planning: { 1: { phase: 'collecting' }, ...home.planning },
    destinations: { 1: { name: '箱根', latitude: 35.2324, longitude: 139.1069 }, ...home.destinations },
  };
};

const load = (): Db => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Db;
  } catch {
    // 破損時・ストレージ不可時は初期データに戻す
  }
  return seed();
};

export const db: Db = load();

export const save = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // プライベートブラウズ等で保存できなくてもメモリ上では動かす
  }
};

export const resetDb = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // noop
  }
};

export const nextId = () => {
  db.seq += 1;
  return db.seq;
};
