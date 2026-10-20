import { useState } from 'react';

export type StepDirection = 'forward' | 'back';

/** ステップ式の画面の現在位置と、切り替えアニメーションの向き */
export const useStepNavigation = (stepCount: number) => {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<StepDirection>('forward');

  const next = () => {
    setDirection('forward');
    setIndex(i => Math.min(i + 1, stepCount - 1));
  };
  const back = () => {
    setDirection('back');
    setIndex(i => Math.max(i - 1, 0));
  };
  const goTo = (target: number) => {
    setDirection(target < index ? 'back' : 'forward');
    setIndex(Math.min(Math.max(target, 0), stepCount - 1));
  };
  const reset = () => {
    setDirection('forward');
    setIndex(0);
  };

  return { index, direction, next, back, goTo, reset };
};
