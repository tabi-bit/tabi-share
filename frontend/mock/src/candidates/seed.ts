import type { Db } from '../db';
import { daysFromToday } from '../home/dates';
import type {
  ExtractedReservation,
  GeoPoint,
  ParsedStayUrl,
  PlaceSearchResult,
  SpotCandidate,
  StayCandidate,
  StayReadSource,
  Suggestion,
} from './types';

const TRIP_ID = 1;

const geo = (name: string, latitude: number, longitude: number, address: string | null = null): GeoPoint => ({
  name,
  address,
  latitude,
  longitude,
});

type SpotSeed = Omit<SpotCandidate, 'kind' | 'tripId' | 'createdAt' | 'placement' | 'tags'> & { tags?: string[] };

const spot = (s: SpotSeed, createdAt: string): Omit<SpotCandidate, 'placement'> & { deleted: boolean } => ({
  kind: 'spot',
  tripId: TRIP_ID,
  createdAt,
  tags: [],
  deleted: false,
  ...s,
});

const stay = (
  s: Omit<StayCandidate, 'kind' | 'tripId' | 'createdAt'>,
  createdAt: string
): StayCandidate & { deleted: boolean } => ({ kind: 'stay', tripId: TRIP_ID, createdAt, deleted: false, ...s });

export const seedCandidates = (
  now: string
): Omit<Db, 'seq' | 'trips' | 'pages' | 'blocks' | 'planning' | 'destinations'> => ({
  members: {
    [TRIP_ID]: [
      { id: 'me', name: null, isMe: true },
      { id: 'yuko', name: 'ゆうこ', isMe: false },
      { id: 'ken', name: 'けん', isMe: false },
    ],
  },
  recruitments: {
    [TRIP_ID]: { active: true, deadline: `${daysFromToday(8)}T23:00`, notify: true },
  },
  stayDecisions: {
    [TRIP_ID]: [{ night: 1, candidateId: 21, reservedSite: 'jalan', checkIn: '15:00', checkOut: '10:00' }],
  },
  dismissedSuggestions: { [TRIP_ID]: [] },
  candidates: [
    spot(
      {
        id: 1,
        name: '田むら銀かつ亭',
        category: 'ごはん',
        rating: 4.3,
        durationMin: 60,
        hours: { open: '11:00', close: '20:00' },
        distanceKm: 0.6,
        reason: '豆腐かつ煮が名物。昼は開店前に並ぶと待ちが少ない。',
        source: { type: 'member', memberId: 'ken', note: '絶対ここ' },
        votes: { me: 'like', yuko: 'like', ken: 'like' },
        placedBlockId: 104,
        location: geo('田むら銀かつ亭', 35.2483, 139.0505, '神奈川県足柄下郡箱根町強羅1300-739'),
      },
      now
    ),
    spot(
      {
        id: 2,
        name: '彫刻の森美術館',
        category: '体験',
        rating: 4.5,
        durationMin: 120,
        hours: { open: '09:00', close: '17:00' },
        distanceKm: 1.1,
        reason: '屋外展示と足湯。晴れの日の午前が向いている。',
        source: { type: 'ai', basis: '自分の「景色」から' },
        votes: { me: 'like', yuko: 'like' },
        placedBlockId: null,
        location: geo('彫刻の森美術館', 35.2445, 139.053, '神奈川県足柄下郡箱根町二ノ平1121'),
      },
      now
    ),
    spot(
      {
        id: 3,
        name: '天山湯治郷',
        category: '湯',
        rating: 4.4,
        durationMin: 120,
        hours: { open: '09:00', close: '23:00' },
        distanceKm: 9.8,
        reason: '源泉かけ流しの露天が 5 つある日帰り湯。小田原方面へ帰る道沿いで、駐車場も広い。',
        tags: ['日帰り湯'],
        source: { type: 'member', memberId: 'yuko', note: '帰りに寄りたい！渋滞前の 15 時くらいに入れると最高' },
        votes: { yuko: 'like', ken: 'like' },
        placedBlockId: null,
        location: geo('天山湯治郷', 35.2257, 139.0921, '神奈川県足柄下郡箱根町湯本茶屋208'),
      },
      now
    ),
    spot(
      {
        id: 4,
        name: '箱根神社',
        category: '寺社',
        rating: 4.6,
        durationMin: 60,
        hours: null,
        distanceKm: 11,
        reason: '湖畔の平和の鳥居。8時前なら行列が短い。',
        source: { type: 'ai', basis: 'けんの「寺社」から' },
        votes: { me: 'like', ken: 'like' },
        placedBlockId: null,
        location: geo('箱根神社', 35.2044, 139.0254, '神奈川県足柄下郡箱根町元箱根80-1'),
      },
      now
    ),
    spot(
      {
        id: 5,
        name: 'ガラスの森美術館',
        category: '体験',
        rating: 4.3,
        durationMin: 90,
        hours: { open: '10:00', close: '17:30' },
        distanceKm: 5.2,
        reason: 'ヴェネチアングラスの美術館。屋内中心で雨の日の予備に向く。仙石原すすき草原から車で 5 分。',
        tags: ['雨でもOK'],
        source: { type: 'ai', basis: null },
        votes: {},
        placedBlockId: null,
        location: geo('箱根ガラスの森美術館', 35.2627, 139.0337, '神奈川県足柄下郡箱根町仙石原940-48'),
      },
      now
    ),
    spot(
      {
        id: 6,
        name: '甘酒茶屋',
        category: 'カフェ',
        rating: 4.4,
        durationMin: 30,
        hours: { open: '07:00', close: '17:30' },
        distanceKm: 13,
        reason: '旧街道の茅葺き茶屋。芦ノ湖へ向かう途中。',
        source: { type: 'member', memberId: 'yuko', note: null },
        votes: { yuko: 'like', me: 'pass' },
        placedBlockId: null,
        location: geo('甘酒茶屋', 35.2063, 139.0447, '神奈川県足柄下郡箱根町畑宿二子山395-28'),
      },
      now
    ),
    spot(
      {
        id: 7,
        name: '仙石原すすき草原',
        category: '景色',
        rating: 4.4,
        durationMin: 45,
        hours: null,
        distanceKm: 4.8,
        reason: '10 月上旬は穂が金色になる。夕方の逆光がきれいで、宿へ戻る前に寄りやすい。',
        tags: ['10月が見頃', '無料'],
        source: { type: 'ai', basis: '自分の「景色」から' },
        votes: {},
        placedBlockId: null,
        location: geo('仙石原すすき草原', 35.2706, 139.0258, '神奈川県足柄下郡箱根町仙石原'),
      },
      now
    ),
    spot(
      {
        id: 8,
        name: '大涌谷',
        category: '景色',
        rating: 4.3,
        durationMin: 60,
        hours: { open: '09:00', close: '16:00' },
        distanceKm: 3.5,
        reason: '噴煙地と黒たまご。14 時台は駐車場待ちが出やすい。',
        source: { type: 'ai', basis: null },
        votes: { me: 'like', ken: 'like' },
        placedBlockId: 106,
        location: geo('大涌谷くろたまご館', 35.2441, 139.0197, '神奈川県足柄下郡箱根町仙石原1251'),
      },
      now
    ),
    spot(
      {
        id: 9,
        name: '箱根ロープウェイ',
        category: '体験',
        rating: 4.2,
        durationMin: 60,
        hours: { open: '09:00', close: '16:45' },
        distanceKm: 0.8,
        reason: '早雲山から大涌谷まで空中散歩。',
        source: { type: 'ai', basis: null },
        votes: { me: 'pass', yuko: 'pass', ken: 'pass' },
        placedBlockId: null,
        location: geo('早雲山駅', 35.2504, 139.0438),
      },
      now
    ),
    spot(
      {
        id: 10,
        name: '箱根湯寮',
        category: '湯',
        rating: 4.2,
        durationMin: 90,
        hours: { open: '10:00', close: '20:00' },
        distanceKm: 8.9,
        reason: '貸切の個室露天がある日帰り湯。',
        source: { type: 'ai', basis: null },
        votes: { me: 'pass', yuko: 'pass', ken: 'pass' },
        placedBlockId: null,
        location: geo('箱根湯寮', 35.2372, 139.095),
      },
      now
    ),
    spot(
      {
        id: 31,
        name: '大涌谷 黒たまご館',
        category: 'ごはん',
        rating: 4.1,
        durationMin: 30,
        hours: { open: '09:00', close: '16:00' },
        distanceKm: 4.2,
        reason: '名物の黒たまご。噴煙地を見下ろす展望もセットで。',
        source: { type: 'ai', basis: '自分の「グルメ」から' },
        votes: { me: 'like', ken: 'like' },
        placedBlockId: null,
        location: geo('大涌谷 黒たまご館', 35.2441, 139.0225, '神奈川県足柄下郡箱根町仙石原1251'),
      },
      now
    ),
    spot(
      {
        id: 32,
        name: '箱根ロープウェイ',
        category: '体験',
        rating: 4.5,
        durationMin: 45,
        hours: { open: '09:00', close: '16:45' },
        distanceKm: 3.8,
        reason: '早雲山から大涌谷・桃源台へ。晴れた日は富士山が正面に見える。',
        source: { type: 'member', memberId: 'yuko', note: null },
        votes: { yuko: 'like', ken: 'like', me: 'like' },
        placedBlockId: null,
        location: geo('箱根ロープウェイ', 35.2505, 139.0388, '神奈川県足柄下郡箱根町強羅1300'),
      },
      now
    ),
    spot(
      {
        id: 33,
        name: '芦ノ湖 海賊船',
        category: '体験',
        rating: 4.4,
        durationMin: 40,
        hours: { open: '09:30', close: '17:00' },
        distanceKm: 10.5,
        reason: '桃源台から元箱根まで湖を横切る。箱根神社とセットで回れる。',
        source: { type: 'ai', basis: 'けんの「景色」から' },
        votes: { ken: 'like' },
        placedBlockId: null,
        location: geo('芦ノ湖 海賊船', 35.2344, 139.0119, '神奈川県足柄下郡箱根町元箱根161'),
      },
      now
    ),
    spot(
      {
        id: 34,
        name: '箱根湯寮',
        category: '湯',
        rating: 4.2,
        durationMin: 90,
        hours: { open: '10:00', close: '20:00' },
        distanceKm: 1.5,
        reason: '貸切の個室露天がある日帰り湯。チェックイン前に一度汗を流せる。',
        source: { type: 'member', memberId: 'me', note: null },
        votes: { me: 'like' },
        placedBlockId: null,
        location: geo('箱根湯寮', 35.2318, 139.1025, '神奈川県足柄下郡箱根町塔之澤4'),
      },
      now
    ),
    spot(
      {
        id: 35,
        name: 'Bakery & Table 箱根',
        category: 'カフェ',
        rating: 4.3,
        durationMin: 45,
        hours: { open: '10:00', close: '17:00' },
        distanceKm: 11.2,
        reason: '湖に面した足湯テラスでパンが食べられる。',
        source: { type: 'ai', basis: 'ゆうこの「カフェ」から' },
        votes: { yuko: 'like' },
        placedBlockId: null,
        location: geo('Bakery & Table 箱根', 35.2039, 139.0249, '神奈川県足柄下郡箱根町元箱根9-1'),
      },
      now
    ),
    spot(
      {
        id: 36,
        name: '箱根旧街道 石畳',
        category: '景色',
        rating: 4.2,
        durationMin: 60,
        hours: null,
        distanceKm: 12.0,
        reason: '江戸時代の石畳を歩ける。甘酒茶屋まで下ると30分ほど。',
        source: { type: 'member', memberId: 'ken', note: null },
        votes: { ken: 'like' },
        placedBlockId: null,
        location: geo('箱根旧街道 石畳', 35.2006, 139.0383, '神奈川県足柄下郡箱根町畑宿'),
      },
      now
    ),
    spot(
      {
        id: 37,
        name: 'ポーラ美術館',
        category: '体験',
        rating: 4.6,
        durationMin: 120,
        hours: { open: '09:00', close: '17:00' },
        distanceKm: 3.2,
        reason: '森の遊歩道つきの美術館。雨の日の予備にもなる。',
        source: { type: 'ai', basis: '自分の「雨でもOK」から' },
        votes: { me: 'like', yuko: 'like' },
        placedBlockId: null,
        location: geo('ポーラ美術館', 35.2711, 139.0509, '神奈川県足柄下郡箱根町仙石原小塚山1285'),
      },
      now
    ),
    spot(
      {
        id: 38,
        name: 'はつ花 そば本店',
        category: 'ごはん',
        rating: 4.2,
        durationMin: 50,
        hours: { open: '10:00', close: '19:00' },
        distanceKm: 1.3,
        reason: '山芋つなぎの自然薯そば。湯本駅から歩ける。',
        source: { type: 'member', memberId: 'yuko', note: null },
        votes: { yuko: 'like', ken: 'like' },
        placedBlockId: null,
        location: geo('はつ花 そば本店', 35.2318, 139.105, '神奈川県足柄下郡箱根町湯本635'),
      },
      now
    ),
    spot(
      {
        id: 39,
        name: '恩賜箱根公園',
        category: '景色',
        rating: 4.3,
        durationMin: 45,
        hours: { open: '09:00', close: '16:30' },
        distanceKm: 11.4,
        reason: '芦ノ湖と富士山を一度に見られる展望台。人が少なく静か。',
        source: { type: 'ai', basis: 'けんの「景色」から' },
        votes: {},
        placedBlockId: null,
        location: geo('恩賜箱根公園', 35.1985, 139.03, '神奈川県足柄下郡箱根町元箱根171'),
      },
      now
    ),
    spot(
      {
        id: 40,
        name: '箱根 寄木細工の店',
        category: '体験',
        rating: 4.0,
        durationMin: 40,
        hours: { open: '09:00', close: '17:00' },
        distanceKm: 12.3,
        reason: '寄木のコースター作り体験。お土産にもなる。',
        source: { type: 'member', memberId: 'me', note: null },
        votes: { me: 'like' },
        placedBlockId: null,
        location: geo('箱根 寄木細工の店', 35.201, 139.056, '神奈川県足柄下郡箱根町畑宿103'),
      },
      now
    ),
    stay(
      {
        id: 21,
        name: '[強羅の旅館A]',
        category: '宿',
        rating: 4.5,
        nights: [1],
        checkIn: '15:00',
        checkOut: '10:00',
        source: { type: 'member', memberId: 'ken', note: null },
        votes: { me: 'like', yuko: 'like', ken: 'like' },
        links: [
          { site: 'jalan', url: 'https://www.jalan.net/', price: 18500, meal: 'both' },
          { site: 'rakuten', url: 'https://travel.rakuten.co.jp/', price: 19800, meal: 'both' },
        ],
        memo: '部屋に露天風呂あり。駐車場無料（10台）',
        location: geo('[強羅の旅館A]', 35.2478, 139.0469, '神奈川県足柄下郡箱根町強羅'),
      },
      now
    ),
    stay(
      {
        id: 22,
        name: '[芦ノ湖畔のホテルB]',
        category: '宿',
        rating: 4.2,
        nights: [2],
        checkIn: null,
        checkOut: null,
        source: { type: 'member', memberId: 'yuko', note: null },
        votes: { yuko: 'like' },
        links: [
          { site: 'rakuten', url: 'https://travel.rakuten.co.jp/', price: 14000, meal: 'breakfast' },
          { site: 'official', url: 'https://example.com/', price: null, meal: null },
        ],
        memo: '湖が見える部屋は +¥2,000。夕食は外で食べる前提',
        location: geo('[芦ノ湖畔のホテルB]', 35.2005, 139.027, '神奈川県足柄下郡箱根町元箱根'),
      },
      now
    ),
    stay(
      {
        id: 23,
        name: '[湯本の宿C]',
        category: '宿',
        rating: 4.0,
        nights: [1, 2],
        checkIn: null,
        checkOut: null,
        source: { type: 'member', memberId: 'me', note: null },
        votes: { me: 'like' },
        links: [{ site: 'jalan', url: 'https://www.jalan.net/', price: null, meal: null }],
        memo: '',
        location: geo('[湯本の宿C]', 35.231, 139.101, '神奈川県足柄下郡箱根町湯本'),
      },
      now
    ),
  ],
});

/** AI 提案 API が返す固定の候補 */
export const SUGGESTION_POOL: Suggestion[] = [
  {
    key: 'sengokuhara',
    name: '仙石原すすき草原',
    category: '景色',
    rating: 4.4,
    durationMin: 45,
    hours: null,
    hoursLabel: '終日',
    distanceLabel: '車 12分',
    tags: ['無料'],
    reason: '10 月上旬は穂が金色。駐車場から遊歩道まで 3 分で、2 時間の空きに収まる。',
    location: geo('仙石原すすき草原', 35.2706, 139.0258),
  },
  {
    key: 'yuryo',
    name: '箱根湯寮',
    category: '湯',
    rating: 4.2,
    durationMin: 90,
    hours: { open: '10:00', close: '20:00' },
    hoursLabel: '10:00–20:00',
    distanceLabel: '車 15分',
    tags: ['個室風呂'],
    reason: '貸切の個室露天がある日帰り湯。チェックイン前に一度汗を流せる。',
    location: geo('箱根湯寮', 35.2372, 139.095),
  },
  {
    key: 'owakudani',
    name: '大涌谷',
    category: '景色',
    rating: 4.3,
    durationMin: 60,
    hours: { open: '09:00', close: '16:00' },
    hoursLabel: '9:00–16:00',
    distanceLabel: '車 15分',
    tags: ['混雑注意'],
    reason: '噴煙地と黒たまご。14 時台は駐車場待ちが出やすい。',
    location: geo('大涌谷くろたまご館', 35.2441, 139.0197),
  },
  {
    key: 'horaien',
    name: '小涌谷 蓬莱園',
    category: '景色',
    rating: 4.0,
    durationMin: 30,
    hours: null,
    hoursLabel: '終日',
    distanceLabel: '車 8分',
    tags: ['無料'],
    reason: '宿へ向かう道の途中。短い散策で寄り道したいとき向き。',
    location: geo('蓬莱園', 35.2367, 139.0627),
  },
  {
    key: 'yamanohotel',
    name: '箱根 小田急 山のホテル庭園',
    category: '景色',
    rating: 4.5,
    durationMin: 45,
    hours: { open: '09:00', close: '17:00' },
    hoursLabel: '9:00–17:00',
    distanceLabel: '車 25分',
    tags: ['湖が見える'],
    reason: '「海が見える場所」の代わりに芦ノ湖を望める庭園。ラウンジでお茶もできる。',
    location: geo('山のホテル', 35.2075, 139.0222),
  },
];

/** 場所検索 API が返す固定の結果 */
export const PLACE_POOL: PlaceSearchResult[] = [
  {
    placeId: 'park',
    name: '箱根強羅公園',
    address: '神奈川県足柄下郡箱根町強羅1300',
    type: '公園',
    rating: 4.2,
    hoursLabel: '9:00–17:00',
    hours: { open: '09:00', close: '17:00' },
    isLodging: false,
    location: geo('箱根強羅公園', 35.2481, 139.0478, '神奈川県足柄下郡箱根町強羅1300'),
  },
  {
    placeId: 'inn-e',
    name: '[強羅の旅館E]',
    address: '神奈川県足柄下郡箱根町強羅 [番地]',
    type: '宿泊施設',
    rating: 4.5,
    hoursLabel: 'IN 15:00',
    hours: null,
    isLodging: true,
    location: geo('[強羅の旅館E]', 35.247, 139.044, '神奈川県足柄下郡箱根町強羅'),
  },
  {
    placeId: 'tamura',
    name: '田むら銀かつ亭',
    address: '神奈川県足柄下郡箱根町強羅1300-739',
    type: '飲食店',
    rating: 4.3,
    hoursLabel: '11:00–20:00',
    hours: { open: '11:00', close: '20:00' },
    isLodging: false,
    location: geo('田むら銀かつ亭', 35.2483, 139.0505, '神奈川県足柄下郡箱根町強羅1300-739'),
  },
  {
    placeId: 'gora-st',
    name: '強羅駅',
    address: '神奈川県足柄下郡箱根町強羅',
    type: '駅',
    rating: 4.0,
    hoursLabel: '',
    hours: null,
    isLodging: false,
    location: geo('強羅駅', 35.2497, 139.051, '神奈川県足柄下郡箱根町強羅'),
  },
];

/** 宿 URL 読み取りで、下の表にない URL に当てる宿 (モックでは実在の URL を貼っても読めたことにする) */
export const STAY_FALLBACK_POOL = [
  { name: '[底倉の宿F]', location: geo('[底倉の宿F]', 35.2399, 139.0936, '神奈川県足柄下郡箱根町底倉') },
  { name: '[小涌谷のホテルG]', location: geo('[小涌谷のホテルG]', 35.2336, 139.0657, '神奈川県足柄下郡箱根町小涌谷') },
  { name: '[大平台の宿H]', location: geo('[大平台の宿H]', 35.2418, 139.1153, '神奈川県足柄下郡箱根町大平台') },
];

/** URL ごとの読み取り結果。readableBy は読める段階 (ogp なら OGP で読める、rendered ならページを開けば読める) */
export const STAY_URL_POOL: Record<string, Omit<ParsedStayUrl, 'url' | 'source'> & { readableBy: StayReadSource }> = {
  'miyanoshita-yado-e.example': {
    site: 'official',
    status: 'ok',
    name: '[宮ノ下の宿E]',
    pageTitle: null,
    location: geo('[宮ノ下の宿E]', 35.2335, 139.1043, '神奈川県足柄下郡箱根町宮ノ下'),
    duplicateOf: null,
    readableBy: 'rendered',
  },
  'jalan.net/yad000000': {
    site: 'jalan',
    status: 'duplicate',
    name: '[強羅の旅館A]',
    pageTitle: 'じゃらん: [強羅の旅館A]',
    location: geo('[強羅の旅館A]', 35.2478, 139.0469, '神奈川県足柄下郡箱根町強羅'),
    duplicateOf: 21,
    readableBy: 'ogp',
  },
  'travel.rakuten.co.jp/HOTEL/00000': {
    site: 'rakuten',
    status: 'duplicate',
    name: '[芦ノ湖畔のホテルB]',
    pageTitle: '楽天トラベル: 湖畔の絶景　[芦ノ湖畔のホテルB] 宿泊予約',
    location: geo('[芦ノ湖畔のホテルB]', 35.2005, 139.027, '神奈川県足柄下郡箱根町元箱根'),
    duplicateOf: 22,
    readableBy: 'ogp',
  },
  'travel.rakuten.co.jp/HOTEL/11111': {
    site: 'rakuten',
    status: 'ok',
    name: '[仙石原のペンションD]',
    pageTitle: '楽天トラベル: [仙石原のペンションD] 宿泊予約',
    location: geo('[仙石原のペンションD]', 35.2655, 139.0301, '神奈川県足柄下郡箱根町仙石原'),
    duplicateOf: null,
    readableBy: 'ogp',
  },
};

export const SAMPLE_RESERVATION_MAIL = `【じゃらんnet】ご予約が完了しました
予約番号: XXXXXXXX
宿泊施設: [強羅の旅館A]
チェックイン: 2026/10/10(土) 15:00
チェックアウト: 2026/10/11(日) 10:00
プラン: 【2食付き】季節の会席プラン
合計金額: 37,000円（大人2名・1泊）`;

export const SAMPLE_EXTRACTED: ExtractedReservation = {
  sourceLabel: 'じゃらんの予約確認メール',
  site: 'jalan',
  price: 18500,
  priceNote: '合計 37,000円 ÷ 大人2名 ÷ 1泊',
  meal: 'both',
  mealNote: 'プラン名「2食付き」から',
  checkIn: '15:00',
  checkOut: '10:00',
  memo: '予約番号 XXXXXXXX',
};
