import { describe, expect, test } from 'bun:test';
import { KernelCodec } from './codec';
import { createRandom, randomKernel } from './generator';

describe('seeded generator', () => {
  test('createRandom is deterministic for a seed', () => {
    const first = createRandom(7);
    const second = createRandom(7);

    expect([first(), first(), first()]).toEqual([second(), second(), second()]);
  });

  test('randomKernel is deterministic for a seed', () => {
    const first = randomKernel(11);
    const second = randomKernel(11);

    expect(KernelCodec.encode(first)).toBe(KernelCodec.encode(second));
  });

  test('different seeds produce different kernels', () => {
    expect(KernelCodec.encode(randomKernel(1))).not.toBe(KernelCodec.encode(randomKernel(2)));
  });

  test('random kernels round-trip through the codec', () => {
    for (let seed = 0; seed < 5; seed += 1) {
      const kernel = randomKernel(seed);
      expect(KernelCodec.encode(KernelCodec.decode(KernelCodec.encode(kernel)))).toBe(
        KernelCodec.encode(kernel),
      );
    }
  });
});
