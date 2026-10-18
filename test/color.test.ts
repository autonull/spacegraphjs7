import { describe, expect, it } from 'vitest';
import { parseColor } from '../src/utils/color';

describe('parseColor', () => {
  it('passes through 24-bit numbers', () => {
    expect(parseColor(0x1a1a2e)).toBe(0x1a1a2e);
  });

  it('drops the alpha channel from 8-digit hex', () => {
    expect(parseColor('#161616ff')).toBe(0x161616);
    expect(parseColor('#abcdef80')).toBe(0xabcdef);
  });

  it('expands 3-digit hex', () => {
    expect(parseColor('#abc')).toBe(0xaabbcc);
  });

  it('parses rgb/rgba strings', () => {
    expect(parseColor('rgb(22, 22, 22)')).toBe(0x161616);
    expect(parseColor('rgba(22, 22, 22, 0.5)')).toBe(0x161616);
  });

  it('falls back to black for unknown input', () => {
    expect(parseColor('not-a-color')).toBe(0);
  });
});
