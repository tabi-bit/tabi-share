import { Route } from 'react-router-dom';
import { CandidatesPage } from './pages/CandidatesPage';
import { PlaceAddPage } from './pages/PlaceAddPage';
import { StayAddPage } from './pages/StayAddPage';
import { SuggestPage } from './pages/SuggestPage';
import { VotePage } from './pages/VotePage';
import { TripScope } from './TripScope';

export const candidateRoutes = (
  <>
    <Route
      path='/trip/:urlId/candidates'
      element={<TripScope title='候補'>{trip => <CandidatesPage trip={trip} />}</TripScope>}
    />
    <Route path='/trip/:urlId/vote' element={<TripScope title='投票'>{trip => <VotePage trip={trip} />}</TripScope>} />
    <Route
      path='/trip/:urlId/suggest'
      element={<TripScope title='AI 提案'>{trip => <SuggestPage trip={trip} />}</TripScope>}
    />
    <Route
      path='/trip/:urlId/places/new'
      element={<TripScope title='場所を追加'>{trip => <PlaceAddPage trip={trip} />}</TripScope>}
    />
    <Route
      path='/trip/:urlId/stays/new'
      element={<TripScope title='宿の URL を貼る'>{trip => <StayAddPage trip={trip} />}</TripScope>}
    />
  </>
);
