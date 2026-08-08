import { useState } from 'react';
import { toast } from 'sonner';
import { clearAllLogs, DEBUG_LOG_VERSION, readAllLogs } from '@/lib/debugLogger';

/**
 * 診断ログの Copy / Clear パネル。`useDebugPanel` の gate 越しに App から描画される。
 * clipboard が拒否される環境 (PWA の一部 / 非セキュアコンテキスト) 用に、手動選択できる
 * textarea へのフォールバックを持つ。
 */

const copyText = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

const buildPayload = (logs: string): string => {
  const controllerUrl = navigator.serviceWorker?.controller?.scriptURL ?? '(no controller)';
  const header = [
    '=== app debug log ===',
    `client version: ${DEBUG_LOG_VERSION}`,
    `sw controller:  ${controllerUrl}`,
    `current URL:    ${window.location.href}`,
    `copied at:      ${new Date().toISOString()}`,
    '=====================',
  ].join('\n');
  return `${header}\n${logs || '(no entries)'}`;
};

const DebugLogPanel = () => {
  const [fallbackText, setFallbackText] = useState<string | null>(null);

  const onCopy = async () => {
    const payload = buildPayload(await readAllLogs());
    if (await copyText(payload)) {
      toast.success(`${payload.split('\n').length} 行コピー`);
      return;
    }
    setFallbackText(payload);
  };

  const onClear = async () => {
    await clearAllLogs();
    setFallbackText(null);
    toast.success('ログをクリア');
  };

  return (
    <div className='fixed right-2 bottom-2 z-50 flex flex-col items-end gap-1'>
      {fallbackText != null && (
        <textarea
          readOnly
          value={fallbackText}
          onFocus={e => e.currentTarget.select()}
          className='h-40 w-[min(90vw,32rem)] rounded-lg border bg-white p-1 text-10px'
        />
      )}
      <div className='flex gap-1 rounded-lg bg-black/80 p-1 text-10px text-white'>
        <button
          type='button'
          onClick={onCopy}
          className='cursor-pointer rounded bg-teal-600 px-2 py-1 hover:bg-teal-500'
        >
          Copy Logs
        </button>
        <button
          type='button'
          onClick={onClear}
          className='cursor-pointer rounded bg-red-600 px-2 py-1 hover:bg-red-500'
        >
          Clear
        </button>
      </div>
    </div>
  );
};

export { DebugLogPanel };
