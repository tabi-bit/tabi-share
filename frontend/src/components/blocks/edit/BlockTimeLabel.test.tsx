import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BlockTimeLabel } from './BlockTimeLabel';

describe('BlockTimeLabel', () => {
  it('endTime が null のとき開始時刻のみ表示する', () => {
    render(<BlockTimeLabel startTime={new Date(2024, 0, 1, 9, 0)} endTime={null} />);
    expect(screen.getByText('09:00')).toBeInTheDocument();
    expect(screen.queryByText('|')).not.toBeInTheDocument();
    expect(screen.queryByText('—')).not.toBeInTheDocument();
  });

  it('endTime があるとき 開始〜終了 と両方の区切りを描画する', () => {
    render(<BlockTimeLabel startTime={new Date(2024, 0, 1, 9, 0)} endTime={new Date(2024, 0, 1, 21, 30)} />);
    expect(screen.getByText('09:00')).toBeInTheDocument();
    expect(screen.getByText('21:30')).toBeInTheDocument();
    // 横並び用「|」と縦並び用「—」の両区切りを描画し、表示切替は CSS（flex 方向）に委ねる
    expect(screen.getByText('|')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
