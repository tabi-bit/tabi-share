import { HttpResponse, http } from 'msw';
import { tripFromApi } from '@/types/trip';
import { db, save } from '../db';
import { isPastTrip } from './status';
import type { PlanningPhase, TripPlanningSummary } from './types';

const ME = 'me';

const computeSummary = (tripId: number): TripPlanningSummary => {
  const planning = db.planning[tripId] ?? { phase: null };
  const members = db.members[tripId] ?? [{ id: ME, name: null, isMe: true }];
  const pageIds = db.pages.filter(p => p.trip_id === tripId).map(p => p.id);
  const hasItinerary = db.blocks.some(b => pageIds.includes(b.page_id));

  if (planning.fixed) {
    return { tripId, planningPhase: planning.phase, members, hasItinerary, ...planning.fixed };
  }

  // 見送り (全員パス) を除いた行きたい所で、投票の進み具合を数える
  const spots = db.candidates.filter(
    c => c.tripId === tripId && !c.deleted && c.kind === 'spot' && !members.every(m => c.votes[m.id] === 'pass')
  );
  const others = members.filter(m => !m.isMe);
  const deadline = db.recruitments[tripId]?.deadline;
  return {
    tripId,
    planningPhase: planning.phase,
    members,
    candidateCount: spots.length,
    myVoteCount: spots.filter(c => c.votes[ME] != null).length,
    hasNewCandidates: false,
    othersCompleted: others.every(m => spots.every(c => c.votes[m.id] != null)),
    deadlinePassed: deadline != null && new Date(deadline) < new Date(),
    hasItinerary,
  };
};

export const homeHandlers = [
  // 旅の段階を切り替える。新フローで始めるときは候補の募集も開始する
  http.put('/api/trips/:id/planning', async ({ params, request }) => {
    const tripId = Number(params.id);
    const { phase } = (await request.json()) as { phase: PlanningPhase };
    db.planning[tripId] = { phase };
    if (phase === 'collecting') {
      db.recruitments[tripId] = { active: true, deadline: null, notify: false };
      // 旅の作成時に入るサンプルのブロックを消し、新フローは空の旅程から始める
      const pageIds = db.pages.filter(p => p.trip_id === tripId).map(p => p.id);
      db.blocks = db.blocks.filter(b => !pageIds.includes(b.page_id));
    }
    save();
    return HttpResponse.json(computeSummary(tripId));
  }),

  // 将来は GET /me/trips のレスポンスに載せる想定。モックでは別エンドポイントで返す
  http.get('/api/me/trips/planning', () => HttpResponse.json(db.trips.map(t => computeSummary(t.id)))),

  // 行ったことのある旅の行き先 (アーカイブ済みも含む)。ホームの地球儀に立てるピン
  http.get('/api/me/visited-places', () =>
    HttpResponse.json(
      db.trips
        .filter(t => db.destinations[t.id] && isPastTrip(tripFromApi.parse(t)))
        .map(t => ({ tripId: t.id, title: t.title, ...db.destinations[t.id] }))
    )
  ),
];
