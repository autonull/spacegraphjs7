/** Capped inverse-square repulsion shared by the pairwise and Barnes-Hut force paths. */
export const repulsionForce = (
    distSq: number,
    strength: number,
    minDistance: number,
    maxForce: number,
): number => Math.min(strength / Math.max(distSq, minDistance * minDistance), maxForce);
