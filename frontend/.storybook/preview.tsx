import type { Preview } from '@storybook/react';
import dayjs from 'dayjs';
import 'dayjs/locale/ja';
import { ConfirmProvider } from '../src/lib/confirm';
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
  // useConfirm を使うコンポーネント (通知トグル / 削除確認等) を含むストーリー全般で
  // ConfirmProvider を root に用意しておく。
  decorators: [
    Story => (
      <ConfirmProvider>
        <Story />
      </ConfirmProvider>
    ),
  ],
};

export default preview;
