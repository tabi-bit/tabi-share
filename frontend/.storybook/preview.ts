import type { Preview } from '@storybook/react';
import dayjs from 'dayjs';
import 'dayjs/locale/ja';
import '../src/index.css';

dayjs.locale('ja');

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    viewport: {
      defaultViewport: 'reset',
    },
  },
};

export { preview };
