// Camera zoom telemetry helpers. Pure math so hosts and tests share one definition of "zoom".
// A normalized zoom is 0..1 where 1 is closest. The raw value is perspective distance (larger is
// farther) or orthographic zoom (larger is closer); `closerIsLarger` selects the mapping.

export interface ZoomRange {
  min: number;
  max: number;
  closerIsLarger: boolean;
}

const logLerp = (from: number, to: number, t: number) =>
  Math.exp(Math.log(from) + t * (Math.log(to) - Math.log(from)));

export function normalizeZoom(raw: number, { min, max, closerIsLarger }: ZoomRange): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  if (raw <= lo) return closerIsLarger ? 0 : 1;
  if (raw >= hi) return closerIsLarger ? 1 : 0;
  const t = (Math.log(raw) - Math.log(lo)) / (Math.log(hi) - Math.log(lo));
  return closerIsLarger ? t : 1 - t;
}

export function denormalizeZoom(value: number, { min, max, closerIsLarger }: ZoomRange): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const t = closerIsLarger ? value : 1 - value;
  return logLerp(lo, hi, Math.min(1, Math.max(0, t)));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
