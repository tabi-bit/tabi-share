import { Route, Routes } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { TripPage } from './pages/TripPage';

const App = () => {
  return (
    <Routes>
      <Route path='/' element={<HomePage />} />
      <Route path='/trip/:tripId' element={<TripPage />} />
      <Route path='*' element={<NotFoundPage />} />
    </Routes>
  );
};

export { App };
