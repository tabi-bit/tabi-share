import { delay, HttpResponse, http } from 'msw';
import { type DbCandidate, db, nextId, save } from '../db';
import { PLACE_POOL, SAMPLE_EXTRACTED, STAY_FALLBACK_POOL, STAY_URL_POOL, SUGGESTION_POOL } from './seed';
import type {
  BookingSite,
  Candidate,
  CandidateSource,
  GeoPoint,
  ParsedStayUrl,
  Placement,
  Recruitment,
  StayDecision,
  SuggestRequest,
  Vote,
} from './types';

const api = (path: string) => `/api${path}`;
const ME = 'me';

const notFound = () => HttpResponse.json({ detail: 'Not Found' }, { status: 404 });

const placementOf = (blockId: number | null): Placement | null => {
  if (blockId == null) return null;
  const block = db.blocks.find(b => b.id === blockId);
  const page = block ? db.pages.find(p => p.id === block.page_id) : undefined;
  if (!(block && page)) return null;
  return { blockId, pageId: page.id, pageTitle: page.title, startTime: block.start_time };
};

const toApi = ({ deleted: _, ...c }: DbCandidate & { deleted: boolean }): Candidate =>
  c.kind === 'spot' ? { ...c, placement: placementOf(c.placedBlockId) } : c;

const findCandidate = (id: number) => db.candidates.find(c => c.id === id);

const siteOfUrl = (url: string): BookingSite => {
  if (url.includes('rakuten')) return 'rakuten';
  if (url.includes('jalan')) return 'jalan';
  if (url.includes('booking.com')) return 'booking';
  return 'official';
};

/**
 * 表にない URL もサイトから読めるかを決めて仮の宿を返す。
 * 楽天・じゃらんは OGP で読める、公式サイトなどはページを開けば読める、Booking.com はボット対策でどちらも読めない
 */
const fallbackStayOf = (url: string): (typeof STAY_URL_POOL)[string] | undefined => {
  const site = siteOfUrl(url);
  if (site === 'booking') return undefined;
  const pick = STAY_FALLBACK_POOL[[...url].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % STAY_FALLBACK_POOL.length];
  return {
    site,
    status: 'ok',
    name: pick.name,
    pageTitle: null,
    location: pick.location,
    duplicateOf: null,
    readableBy: site === 'official' ? 'rendered' : 'ogp',
  };
};

export const candidateHandlers = [
  http.get(api('/trips/:id/members'), ({ params }) => HttpResponse.json(db.members[Number(params.id)] ?? [])),

  http.put(api('/trips/:id/members/me'), async ({ params, request }) => {
    const { name } = (await request.json()) as { name: string };
    const member = db.members[Number(params.id)]?.find(m => m.id === ME);
    if (!member) return notFound();
    member.name = name.trim() || null;
    save();
    return HttpResponse.json(member);
  }),

  http.get(api('/trips/:id/recruitment'), ({ params }) =>
    HttpResponse.json(db.recruitments[Number(params.id)] ?? { active: false, deadline: null, notify: false })
  ),

  http.put(api('/trips/:id/recruitment'), async ({ params, request }) => {
    const body = (await request.json()) as Recruitment;
    db.recruitments[Number(params.id)] = body;
    save();
    return HttpResponse.json(body);
  }),

  http.get(api('/trips/:id/candidates'), ({ params }) =>
    HttpResponse.json(db.candidates.filter(c => c.tripId === Number(params.id) && !c.deleted).map(toApi))
  ),

  http.post(api('/trips/:id/candidates'), async ({ params, request }) => {
    const tripId = Number(params.id);
    const body = (await request.json()) as Partial<DbCandidate> & { kind: 'spot' | 'stay' };
    // 同じ場所が既にあれば、新規作成せず自分の ♥ とメモを付ける
    const existing = db.candidates.find(
      c => c.tripId === tripId && !c.deleted && c.kind === body.kind && c.name === body.name
    );
    if (existing) {
      existing.votes = { ...existing.votes, [ME]: 'like' };
      save();
      return HttpResponse.json(toApi(existing));
    }
    const source: CandidateSource = body.source ?? { type: 'member', memberId: ME, note: null };
    const base = {
      id: nextId(),
      tripId,
      name: body.name ?? '',
      category: body.category ?? '',
      rating: body.rating ?? null,
      location: body.location as GeoPoint,
      source,
      votes: { [ME]: 'like' as Vote },
      createdAt: new Date().toISOString(),
      deleted: false,
    };
    const created =
      body.kind === 'stay'
        ? {
            ...base,
            kind: 'stay' as const,
            nights: (body as { nights?: number[] }).nights ?? [1],
            links: (body as { links?: [] }).links ?? [],
            memo: (body as { memo?: string }).memo ?? '',
            checkIn: null,
            checkOut: null,
          }
        : {
            ...base,
            kind: 'spot' as const,
            durationMin: (body as { durationMin?: number }).durationMin ?? 60,
            hours: (body as { hours?: null }).hours ?? null,
            reason: (body as { reason?: string }).reason ?? '',
            distanceKm: null,
            tags: (body as { tags?: string[] }).tags ?? [],
            placedBlockId: null,
          };
    db.candidates.push(created);
    save();
    return HttpResponse.json(toApi(created), { status: 201 });
  }),

  http.patch(api('/candidates/:id'), async ({ params, request }) => {
    const candidate = findCandidate(Number(params.id));
    if (!candidate) return notFound();
    const { myVote, ...rest } = (await request.json()) as Partial<Candidate> & { myVote?: Vote | null };
    if (myVote !== undefined) {
      const { [ME]: _, ...others } = candidate.votes;
      candidate.votes = myVote ? { ...others, [ME]: myVote } : others;
    }
    Object.assign(candidate, rest, { id: candidate.id, tripId: candidate.tripId });
    save();
    return HttpResponse.json(toApi(candidate));
  }),

  // 論理削除。元に戻す操作で deleted=false に戻せるようにする
  http.delete(api('/candidates/:id'), ({ params }) => {
    const candidate = findCandidate(Number(params.id));
    if (!candidate) return notFound();
    candidate.deleted = true;
    save();
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(api('/candidates/:id/restore'), ({ params }) => {
    const candidate = findCandidate(Number(params.id));
    if (!candidate) return notFound();
    candidate.deleted = false;
    save();
    return HttpResponse.json(toApi(candidate));
  }),

  http.get(api('/trips/:id/stay-decisions'), ({ params }) =>
    HttpResponse.json(db.stayDecisions[Number(params.id)] ?? [])
  ),

  http.put(api('/trips/:id/stay-decisions/:night'), async ({ params, request }) => {
    const tripId = Number(params.id);
    const night = Number(params.night);
    const body = (await request.json()) as Omit<StayDecision, 'night'> | null;
    const others = (db.stayDecisions[tripId] ?? []).filter(d => d.night !== night);
    db.stayDecisions[tripId] = body ? [...others, { ...body, night }] : others;
    save();
    return HttpResponse.json(db.stayDecisions[tripId]);
  }),

  // AI 提案。生成を待つ体感を出すため長めに遅延させる
  http.post(api('/trips/:id/suggestions'), async ({ params, request }) => {
    const tripId = Number(params.id);
    (await request.json()) as SuggestRequest;
    await delay(1800);
    const dismissed = db.dismissedSuggestions[tripId] ?? [];
    return HttpResponse.json({
      excludedCount: 1,
      suggestions: SUGGESTION_POOL.filter(s => !dismissed.includes(s.key)),
    });
  }),

  http.post(api('/trips/:id/suggestions/:key/dismiss'), ({ params }) => {
    const tripId = Number(params.id);
    db.dismissedSuggestions[tripId] = [...(db.dismissedSuggestions[tripId] ?? []), String(params.key)];
    save();
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete(api('/trips/:id/suggestions/:key/dismiss'), ({ params }) => {
    const tripId = Number(params.id);
    db.dismissedSuggestions[tripId] = (db.dismissedSuggestions[tripId] ?? []).filter(k => k !== params.key);
    save();
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(api('/places/search'), ({ request }) => {
    const q = new URL(request.url).searchParams.get('q')?.trim() ?? '';
    const hits = q ? PLACE_POOL.filter(p => p.name.includes(q) || p.address.includes(q)) : [];
    return HttpResponse.json(hits.length > 0 || !q ? hits : PLACE_POOL);
  }),

  // 本実装では ogp = HTML の meta を読む、render = Cloudflare Browser Rendering で開いて LLM で項目を抜き出す
  http.post(api('/trips/:id/stays/preview'), async ({ params, request }) => {
    const tripId = Number(params.id);
    const { url, mode } = (await request.json()) as { url: string; mode: 'ogp' | 'render' };
    await delay(mode === 'ogp' ? 700 : 2800);
    const key = Object.keys(STAY_URL_POOL).find(k => url.includes(k));
    const hit = key ? STAY_URL_POOL[key] : fallbackStayOf(url);
    const readable = hit != null && (mode === 'render' || hit.readableBy === 'ogp');
    if (!(hit && readable)) {
      const failed: ParsedStayUrl = {
        url,
        site: siteOfUrl(url),
        status: 'failed',
        name: null,
        pageTitle: null,
        location: null,
        duplicateOf: null,
        source: null,
      };
      return HttpResponse.json(failed);
    }
    const { readableBy: _, ...info } = hit;
    // 既に削除済みなら重複扱いにしない
    const dupAlive =
      info.duplicateOf != null &&
      db.candidates.some(c => c.id === info.duplicateOf && c.tripId === tripId && !c.deleted);
    const row: ParsedStayUrl = {
      url,
      ...info,
      status: dupAlive ? 'duplicate' : info.status === 'duplicate' ? 'ok' : info.status,
      source: mode === 'ogp' ? 'ogp' : 'rendered',
    };
    return HttpResponse.json(row);
  }),

  http.post(api('/ai/extract-reservation'), async () => {
    await delay(1200);
    return HttpResponse.json(SAMPLE_EXTRACTED);
  }),
];

/** ブロック削除時に、そのブロックへ配置済みだった候補を未配置に戻す */
export const unplaceCandidatesOfBlock = (blockId: number) => {
  for (const c of db.candidates) {
    if (c.kind === 'spot' && c.placedBlockId === blockId) c.placedBlockId = null;
  }
};
