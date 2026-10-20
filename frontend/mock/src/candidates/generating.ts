const TASK_INTERVAL_MS = 650;

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** GeneratingView のタスクを一定間隔で ✓ にしながら work を待つ。表示が一瞬で終わらないよう、最後まで流してから返す */
export const runWithTasks = async <T>(taskCount: number, onDone: (count: number) => void, work: Promise<T>) => {
  for (let i = 1; i <= taskCount; i++) {
    await wait(TASK_INTERVAL_MS);
    onDone(i);
  }
  return work;
};
