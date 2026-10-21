import type { LabelLodLevel } from '../types';

/**
 * The level of detail that applies at a distance: the first level whose threshold the distance has
 * reached, with the levels ordered from the furthest to the nearest. Undefined when the distance
 * is below every threshold.
 */
export function lodLevelAt(
  levels: readonly LabelLodLevel[],
  distance: number
): LabelLodLevel | undefined {
  let best: LabelLodLevel | undefined;
  for (const level of levels) {
    const threshold = level.distance ?? 0;
    if (distance < threshold) continue;
    if (!best || threshold > (best.distance ?? 0)) best = level;
  }
  return best;
}

/**
 * The visibility a level asks for: hidden when its style says so, otherwise the element keeps
 * whatever visibility it had.
 */
export function lodVisibility(level: LabelLodLevel | undefined): 'hidden' | '' {
  return level?.style?.includes('visibility:hidden') ? 'hidden' : '';
}
