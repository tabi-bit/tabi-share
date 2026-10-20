/**
 * 候補ストック機能の型。モック API とモック UI で共有する。
 * 本実装では src/types 配下に zod スキーマ + API 変換として起こし直す想定。
 */

export type MemberId = string;

export type Member = {
  id: MemberId;
  /** この旅程内での呼び名。未設定なら null */
  name: string | null;
  isMe: boolean;
};

export type Vote = 'like' | 'pass';

export type CandidateKind = 'spot' | 'stay';

export type CandidateSource =
  | { type: 'member'; memberId: MemberId; note: string | null }
  | { type: 'ai'; basis: string | null };

export type BusinessHours = { open: string; close: string } | null;

export type BookingSite = 'rakuten' | 'jalan' | 'booking' | 'official';

export type Meal = 'none' | 'breakfast' | 'dinner' | 'both';

export type BookingLink = {
  site: BookingSite;
  url: string;
  /** 1泊の料金（円）。priceUnit で 1 人あたりか 1 室あたりかを区別する */
  price: number | null;
  /** 省略時は 1 人あたり */
  priceUnit?: PriceUnit;
  meal: Meal | null;
};

export type PriceUnit = 'person' | 'room';

export type GeoPoint = {
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
};

export type Placement = {
  blockId: number;
  pageId: number;
  pageTitle: string;
  startTime: string;
};

type CandidateBase = {
  id: number;
  tripId: number;
  name: string;
  category: string;
  rating: number | null;
  /** 地図に置く位置。手で作った予定を候補に戻したときなど、場所がなければ null */
  location: GeoPoint | null;
  source: CandidateSource;
  votes: Record<MemberId, Vote>;
  createdAt: string;
};

export type SpotCandidate = CandidateBase & {
  kind: 'spot';
  durationMin: number;
  hours: BusinessHours;
  reason: string;
  /** 宿からの距離。宿未決定なら null */
  distanceKm: number | null;
  tags: string[];
  placedBlockId: number | null;
  /** placedBlockId から API 側で解決した配置先 */
  placement: Placement | null;
};

export type StayCandidate = CandidateBase & {
  kind: 'stay';
  /** 何泊目の候補か (1 始まり) */
  nights: number[];
  links: BookingLink[];
  memo: string;
  checkIn: string | null;
  checkOut: string | null;
};

export type Candidate = SpotCandidate | StayCandidate;

export type Recruitment = {
  active: boolean;
  deadline: string | null;
  notify: boolean;
};

export type StayDecision = {
  night: number;
  candidateId: number;
  reservedSite: BookingSite | null;
  checkIn: string | null;
  checkOut: string | null;
};

export type Suggestion = {
  key: string;
  name: string;
  category: string;
  rating: number;
  durationMin: number;
  hours: BusinessHours;
  hoursLabel: string;
  distanceLabel: string;
  tags: string[];
  reason: string;
  location: GeoPoint;
};

export type SuggestRequest = {
  area: string;
  transport: 'car' | 'train' | 'walk';
  when: { type: 'any' } | { type: 'slot'; pageId: number; start: string; end: string };
  /** 1 人あたりの予算の目安 (円)。null は上限なし */
  budgetPerPerson: number | null;
  wishes: string[];
  freeText: string;
};

export type PlaceSearchResult = {
  placeId: string;
  name: string;
  address: string;
  type: string;
  rating: number | null;
  hoursLabel: string;
  hours: BusinessHours;
  isLodging: boolean;
  location: GeoPoint;
};

export type ParsedStayUrl = {
  url: string;
  site: BookingSite;
  status: 'ok' | 'duplicate' | 'failed';
  name: string | null;
  pageTitle: string | null;
  location: GeoPoint | null;
  duplicateOf: number | null;
  /** どの段階で読めたか。ogp はリンクプレビューの情報、rendered はページを開いて AI が読み取ったもの */
  source: StayReadSource | null;
};

export type StayReadSource = 'ogp' | 'rendered';

export type ExtractedReservation = {
  sourceLabel: string;
  site: BookingSite | null;
  price: number | null;
  priceNote: string | null;
  meal: Meal | null;
  mealNote: string | null;
  checkIn: string | null;
  checkOut: string | null;
  memo: string | null;
};
