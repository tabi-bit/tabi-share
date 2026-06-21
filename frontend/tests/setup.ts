import '@testing-library/jest-dom';
import dayjs from 'dayjs';
import 'dayjs/locale/ja';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './msw/server';

dayjs.locale('ja');

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
