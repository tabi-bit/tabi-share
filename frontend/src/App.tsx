import { Route, Routes } from 'react-router-dom';
import { Title } from './components/Title';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { TripPage } from './pages/TripPage';

const App = () => {
  return (
    <>
      <Title />
      <Routes>
        <Route path='/' element={<HomePage />} />
        <Route path='/trip/:urlId' element={<TripPage />} />
        <Route path='*' element={<NotFoundPage />} />
      </Routes>
    </>
  );
};

export { App };
