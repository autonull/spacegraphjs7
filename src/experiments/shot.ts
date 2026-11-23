/** Host-neutral named-view lookup. A shot is data; hosts own every field beyond `id`. */
export interface ShotRef {
    readonly id: string;
}

export const findShotByID = <T extends ShotRef>(
    shots: readonly T[],
    id: string | null | undefined,
): T | undefined => (id ? shots.find((shot) => shot.id === id) : undefined);
