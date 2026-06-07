import dayjs from 'dayjs';

interface BlockTimeLabelProps {
  startTime: Date;
  endTime: Date | null;
}

/**
 * 予定/移動ブロック共通の時刻表示。開始のみ、または 開始〜終了 を表示する。
 * 親ラッパー(.schedule-time-wrapper / .transport-time-wrapper)の flex 方向に応じて
 * 区切り(横「|」/縦「—」)が CSS で切り替わる。
 */
export function BlockTimeLabel({ startTime, endTime }: BlockTimeLabelProps) {
  if (endTime == null) {
    return <div className='font-medium text-neutral-700'>{dayjs(startTime).format('HH:mm')}</div>;
  }

  return (
    <>
      <div className='font-medium text-neutral-700'>{dayjs(startTime).format('HH:mm')}</div>
      <div className='-my-1 horizontal-divider text-center text-gray-400 text-xs leading-none'>|</div>
      <div className='vertical-divider text-center text-gray-400 text-xs leading-none'>—</div>
      <div className='font-medium text-neutral-700'>{dayjs(endTime).format('HH:mm')}</div>
    </>
  );
}
