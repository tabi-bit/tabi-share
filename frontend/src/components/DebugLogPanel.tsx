import { toast } from 'sonner';
import { clearAllLogs, readAllLogs } from '@/lib/debugLogger';

/**
 * 診断ブランチ (chore/issue207_debug-logger) 専用: 右下に Copy / Clear ボタンを常時表示する。
 * PR #216 は Draft & DO NOT MERGE 前提。gate 無しで install 直後から使える状態にしておく。
 */

const copyText = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

const DebugLogPanel = () => {
  const onCopy = async () => {
    const logs = await readAllLogs();
    if (!logs) {
      toast.info('ログなし');
      return;
    }
    const lines = logs.split('\n').length;
    const ok = await copyText(logs);
    if (ok) {
      toast.success(`${lines} 件コピー`);
    } else {
      // クリップボード拒否時は prompt で見せて手動コピー
      window.prompt('コピーしてください', logs);
    }
  };

  const onClear = async () => {
    await clearAllLogs();
    toast.success('ログをクリア');
  };

  return (
    <div className='fixed right-2 bottom-2 z-50 flex gap-1 rounded-lg bg-black/80 p-1 text-10px text-white'>
      <button type='button' onClick={onCopy} className='cursor-pointer rounded bg-teal-600 px-2 py-1 hover:bg-teal-500'>
        Copy Logs
      </button>
      <button type='button' onClick={onClear} className='cursor-pointer rounded bg-red-600 px-2 py-1 hover:bg-red-500'>
        Clear
      </button>
    </div>
  );
};

export { DebugLogPanel };
