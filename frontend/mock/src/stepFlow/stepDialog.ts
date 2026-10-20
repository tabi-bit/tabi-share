/**
 * ステップ式のダイアログ。スマホは下から出る全画面 (ネイティブのモーダル画面風)、sm 以上は中央の 620px 固定。
 * 中身は「上の空き (sm:hidden) + StepPanel」で組む
 */
export const STEP_DIALOG_CLASS =
  'gap-0 p-0 sm:h-[620px] max-sm:data-[state=closed]:slide-out-to-bottom max-sm:data-[state=open]:slide-in-from-bottom max-sm:data-[state=closed]:zoom-out-100 max-sm:data-[state=open]:zoom-in-100 max-sm:top-0 max-sm:left-0 max-sm:h-dvh max-sm:max-h-none max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:border-0 max-sm:bg-teal-50';

/** 1 画面で済む小さなダイアログ。スマホは画面下に寄せたシートにして、ボタンを親指の位置に置く */
export const BOTTOM_DIALOG_CLASS =
  'max-sm:data-[state=closed]:slide-out-to-bottom max-sm:data-[state=open]:slide-in-from-bottom max-sm:data-[state=closed]:zoom-out-100 max-sm:data-[state=open]:zoom-in-100 max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:max-h-[92dvh] max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none max-sm:rounded-t-2xl max-sm:border-0 max-sm:pb-[calc(1.5rem+env(safe-area-inset-bottom))]';

/** ページとして出すステップ式画面の操作パネル。全ステップで高さをそろえ、下に寄せる */
export const STEP_PAGE_PANEL_CLASS =
  'h-[min(620px,100dvh)] shrink-0 rounded-t-2xl shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.2)]';
