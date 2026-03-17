import { createStore } from 'jotai';

/** アプリケーション共有Jotaiストア（React外からも参照可能） */
export const appStore = createStore();
