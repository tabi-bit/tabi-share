import { atom } from 'jotai';

/**
 * AddPageDialog のオープン状態。
 * pill 内の Popover と、TripPage の 0 ページ時の空状態 CTA の両方から
 * トリガーしたいため、コンポーネント跨ぎで参照できる atom として切り出す。
 */
export const addPageDialogOpenAtom = atom(false);
