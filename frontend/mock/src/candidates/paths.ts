/** 候補ストック関連の画面パス */
export const candidatePaths = {
  trip: (urlId: string) => `/trip/${urlId}`,
  candidates: (urlId: string, tab: 'spots' | 'stays' = 'spots') =>
    `/trip/${urlId}/candidates${tab === 'stays' ? '?tab=stays' : ''}`,
  vote: (urlId: string) => `/trip/${urlId}/vote`,
  suggest: (urlId: string) => `/trip/${urlId}/suggest`,
  addPlace: (urlId: string, kind: 'spot' | 'stay' = 'spot') =>
    `/trip/${urlId}/places/new${kind === 'stay' ? '?kind=stay' : ''}`,
  addStayUrls: (urlId: string) => `/trip/${urlId}/stays/new`,
};
