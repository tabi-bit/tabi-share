import { describe, expect, it } from 'vitest';
import { isValidWalicaUrl } from './walica';

describe('isValidWalicaUrl', () => {
  it('https://walica.jp のパスは true', () => {
    expect(isValidWalicaUrl('https://walica.jp/inv/xxxxxxxx')).toBe(true);
    expect(isValidWalicaUrl('https://walica.jp/')).toBe(true);
  });

  it('http:// も受け付ける (walica 側が redirect する想定)', () => {
    expect(isValidWalicaUrl('http://walica.jp/inv/xxxx')).toBe(true);
  });

  it('walica.jp 以外のドメインは false', () => {
    expect(isValidWalicaUrl('https://example.com/inv/xxxx')).toBe(false);
    expect(isValidWalicaUrl('https://walica.jp.example.com/')).toBe(false);
    expect(isValidWalicaUrl('https://sub.walica.jp/')).toBe(false);
  });

  it('URL として不正な文字列は false', () => {
    expect(isValidWalicaUrl('')).toBe(false);
    expect(isValidWalicaUrl('walica.jp/inv/xxxx')).toBe(false);
    expect(isValidWalicaUrl('not a url')).toBe(false);
  });

  it('その他のプロトコルは false', () => {
    expect(isValidWalicaUrl('ftp://walica.jp/')).toBe(false);
    expect(isValidWalicaUrl('javascript:alert(1)')).toBe(false);
  });
});
