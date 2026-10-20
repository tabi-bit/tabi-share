import { delay, HttpResponse, http } from 'msw';
import type { ApiBlock } from '@/types/block';
import type { ApiLocation } from '@/types/location';
import type { ApiPage } from '@/types/page';
import { candidateHandlers, unplaceCandidatesOfBlock } from './candidates/handlers';
import { type DbTrip, db, nextId, save } from './db';
import { homeHandlers } from './home/handlers';

const api = (path: string) => `/api${path}`;

const toApiTrip = ({ archived: _, ...trip }: DbTrip) => trip;

const notFound = () => HttpResponse.json({ detail: 'Not Found' }, { status: 404 });

const touchTrip = (tripId: number) => {
  const trip = db.trips.find(t => t.id === tripId);
  if (trip) trip.last_edited_at = new Date().toISOString();
};

const tripIdOfPage = (pageId: number) => db.pages.find(p => p.id === pageId)?.trip_id;

/** PUT/POST で埋め込まれた location に id を払い出す (サーバの後勝ち PUT を簡略化したもの) */
const withLocationId = (loc: Partial<ApiLocation> | null | undefined): ApiLocation | null =>
  loc ? ({ ...loc, id: loc.id ?? nextId() } as ApiLocation) : null;

const normalizeBlock = (body: Record<string, unknown>, id: number, pageId: number): ApiBlock => {
  const location = withLocationId(body.location as ApiLocation | null);
  const base = {
    ...(body as object),
    id,
    page_id: pageId,
    location,
    location_id: location?.id ?? null,
  };
  if (body.block_type === 'move') {
    const dest = withLocationId(body.destination_location as ApiLocation | null);
    return { ...base, destination_location: dest, destination_location_id: dest?.id ?? null } as ApiBlock;
  }
  return base as ApiBlock;
};

export const handlers = [
  // 体感を実環境に寄せるため、全リクエストに少し遅延を入れる
  http.all(api('/*'), async () => {
    await delay(150);
  }),

  http.get(api('/health'), () => HttpResponse.json({ status: 'ok' })),

  ...homeHandlers,

  http.get(api('/me/trips'), ({ request }) => {
    const archived = new URL(request.url).searchParams.get('archived') === 'true';
    return HttpResponse.json(db.trips.filter(t => t.archived === archived).map(toApiTrip));
  }),

  http.patch(api('/me/trips/:id'), async ({ params, request }) => {
    const trip = db.trips.find(t => t.id === Number(params.id));
    if (!trip) return notFound();
    const { archived } = (await request.json()) as { archived: boolean };
    trip.archived = archived;
    save();
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(api('/trips/url/:urlId'), ({ params }) => {
    const trip = db.trips.find(t => t.url_id === params.urlId);
    return trip ? HttpResponse.json(toApiTrip(trip)) : notFound();
  }),

  http.post(api('/trips'), async ({ request }) => {
    const body = (await request.json()) as Partial<DbTrip>;
    const now = new Date().toISOString();
    const trip = {
      ...body,
      id: nextId(),
      url_id: `mock-${Math.random().toString(36).slice(2, 10)}`,
      created_at: now,
      last_edited_at: now,
      archived: false,
    } as DbTrip;
    db.trips.push(trip);
    // 段階は作成後に選ぶ (AI といっしょに考える → PUT /trips/:id/planning)。既定は従来の旅
    db.planning[trip.id] = { phase: null };
    db.members[trip.id] = [{ id: 'me', name: null, isMe: true }];
    db.recruitments[trip.id] = { active: false, deadline: null, notify: false };
    save();
    return HttpResponse.json({ id: trip.id, url_id: trip.url_id }, { status: 201 });
  }),

  http.put(api('/trips/:id'), async ({ params, request }) => {
    const trip = db.trips.find(t => t.id === Number(params.id));
    if (!trip) return notFound();
    Object.assign(trip, await request.json(), { last_edited_at: new Date().toISOString() });
    save();
    return HttpResponse.json(toApiTrip(trip));
  }),

  http.delete(api('/trips/:id'), ({ params }) => {
    const id = Number(params.id);
    const pageIds = db.pages.filter(p => p.trip_id === id).map(p => p.id);
    db.trips = db.trips.filter(t => t.id !== id);
    db.pages = db.pages.filter(p => p.trip_id !== id);
    db.blocks = db.blocks.filter(b => !pageIds.includes(b.page_id));
    save();
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(api('/trips/:id/pages'), ({ params }) =>
    HttpResponse.json(db.pages.filter(p => p.trip_id === Number(params.id)))
  ),

  http.post(api('/trips/:id/pages'), async ({ params, request }) => {
    const tripId = Number(params.id);
    const body = (await request.json()) as ApiPage;
    const page: ApiPage = { ...body, id: nextId(), trip_id: tripId };
    db.pages.push(page);
    touchTrip(tripId);
    save();
    return HttpResponse.json(page, { status: 201 });
  }),

  http.get(api('/pages/:id'), ({ params }) => {
    const page = db.pages.find(p => p.id === Number(params.id));
    return page ? HttpResponse.json(page) : notFound();
  }),

  http.put(api('/pages/:id'), async ({ params, request }) => {
    const page = db.pages.find(p => p.id === Number(params.id));
    if (!page) return notFound();
    Object.assign(page, await request.json(), { id: page.id });
    touchTrip(page.trip_id);
    save();
    return HttpResponse.json(page);
  }),

  http.delete(api('/pages/:id'), ({ params }) => {
    const id = Number(params.id);
    const tripId = tripIdOfPage(id);
    db.pages = db.pages.filter(p => p.id !== id);
    db.blocks = db.blocks.filter(b => b.page_id !== id);
    if (tripId != null) touchTrip(tripId);
    save();
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(api('/pages/:id/blocks'), ({ params }) =>
    HttpResponse.json(db.blocks.filter(b => b.page_id === Number(params.id)))
  ),

  http.post(api('/pages/:id/blocks'), async ({ params, request }) => {
    const pageId = Number(params.id);
    const block = normalizeBlock((await request.json()) as Record<string, unknown>, nextId(), pageId);
    db.blocks.push(block);
    const tripId = tripIdOfPage(pageId);
    if (tripId != null) touchTrip(tripId);
    save();
    return HttpResponse.json(block, { status: 201 });
  }),

  http.get(api('/blocks/:id'), ({ params }) => {
    const block = db.blocks.find(b => b.id === Number(params.id));
    return block ? HttpResponse.json(block) : notFound();
  }),

  http.put(api('/blocks/:id'), async ({ params, request }) => {
    const id = Number(params.id);
    const index = db.blocks.findIndex(b => b.id === id);
    if (index < 0) return notFound();
    const body = (await request.json()) as Record<string, unknown>;
    const block = normalizeBlock(body, id, Number(body.page_id ?? db.blocks[index].page_id));
    db.blocks[index] = block;
    const tripId = tripIdOfPage(block.page_id);
    if (tripId != null) touchTrip(tripId);
    save();
    return HttpResponse.json(block);
  }),

  http.delete(api('/blocks/:id'), ({ params }) => {
    const id = Number(params.id);
    const pageId = db.blocks.find(b => b.id === id)?.page_id;
    db.blocks = db.blocks.filter(b => b.id !== id);
    unplaceCandidatesOfBlock(id);
    const tripId = pageId != null ? tripIdOfPage(pageId) : undefined;
    if (tripId != null) touchTrip(tripId);
    save();
    return new HttpResponse(null, { status: 204 });
  }),

  ...candidateHandlers,

  // 認証・ペアリング・通知はモックでは扱わない
  http.all(api('/*'), () => HttpResponse.json({ detail: 'モック環境では未対応です' }, { status: 501 })),
];
