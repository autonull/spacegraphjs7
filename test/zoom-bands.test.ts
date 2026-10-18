import { describe, expect, it, vi } from 'vitest';
import { ZoomBands, type ZoomBand } from '../src/zoom/ZoomBands';

const BANDS: ZoomBand[] = [
  { id: 'overview', min: 0, max: 0.34, label: 'Overview' },
  { id: 'execution', min: 0.34, max: 0.67, label: 'Execution' },
  { id: 'detail', min: 0.67, max: 1, label: 'Detail' },
];

describe('ZoomBands', () => {
  it('resolves bands at the threshold edges', () => {
    const bands = new ZoomBands({ bands: BANDS });
    expect(bands.band).toBe('overview');
    expect(bands.feedNormalized(0.339).band).toBe('overview');
    expect(bands.feedNormalized(0.34).band).toBe('execution');
    expect(bands.feedNormalized(0.669).band).toBe('execution');
    expect(bands.feedNormalized(0.67).band).toBe('detail');
    expect(bands.feedNormalized(1).band).toBe('detail');
  });

  it('emits a change with from/to and the previous snapshot', () => {
    const bands = new ZoomBands({ bands: BANDS });
    const listener = vi.fn();
    bands.onChange(listener);
    bands.feedNormalized(0.9);
    expect(listener).toHaveBeenCalledTimes(1);
    const change = listener.mock.calls[0][0];
    expect(change.from).toBe('overview');
    expect(change.band).toBe('detail');
    expect(change.label).toBe('Detail');
    expect(change.previous.band).toBe('overview');
    expect(change.normalized).toBeCloseTo(0.9);
    expect(typeof change.timestamp).toBe('number');
  });

  it('does not flap across a boundary within the hysteresis dead-zone', () => {
    const bands = new ZoomBands({ bands: BANDS, hysteresis: 0.05 });
    const listener = vi.fn();
    bands.onChange(listener);
    bands.feedNormalized(0.33);
    bands.feedNormalized(0.35);
    bands.feedNormalized(0.33);
    expect(listener).not.toHaveBeenCalled();
    expect(bands.band).toBe('overview');
    expect(bands.feedNormalized(0.4).band).toBe('execution');
  });

  it('normalizes a raw camera zoom through the supplied range', () => {
    const bands = new ZoomBands({ bands: BANDS });
    const range = { min: 2, max: 1000, closerIsLarger: false };
    expect(bands.feed(2, range).band).toBe('detail');
    expect(bands.feed(1000, range).band).toBe('overview');
    expect(bands.snapshot().zoom).toBe(1000);
  });

  it('tracks band changes across a projection switch', () => {
    const bands = new ZoomBands({ bands: BANDS });
    const perspective = { min: 50, max: 2000, closerIsLarger: false };
    const orthographic = { min: 0.01, max: 100, closerIsLarger: true };
    expect(bands.feed(2000, perspective).band).toBe('overview');
    expect(bands.feed(100, orthographic).band).toBe('detail');
    expect(bands.feed(0.01, orthographic).band).toBe('overview');
  });

  it('reports the band index by id', () => {
    const bands = new ZoomBands({ bands: BANDS });
    expect(bands.indexOf('overview')).toBe(0);
    expect(bands.indexOf('detail')).toBe(2);
    expect(bands.indexOf('missing')).toBe(-1);
  });

  it('unsubscribes listeners', () => {
    const bands = new ZoomBands({ bands: BANDS });
    const listener = vi.fn();
    bands.onChange(listener)();
    bands.feedNormalized(0.9);
    expect(listener).not.toHaveBeenCalled();
  });

  it('rejects empty, uncovered, and gapped band sets', () => {
    expect(() => new ZoomBands({ bands: [] })).toThrow();
    expect(() => new ZoomBands({ bands: [{ id: 'a', min: 0.2, max: 0.8 }] })).toThrow();
    expect(() =>
      new ZoomBands({
        bands: [
          { id: 'a', min: 0, max: 0.4 },
          { id: 'b', min: 0.5, max: 1 },
        ],
      })
    ).toThrow();
  });
});
