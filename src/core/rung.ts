// The shared selector for host-ordered ladders. One rung covers a normalized scale interval; a
// dead zone around its boundary keeps a rung from flickering when zoom oscillates.

export interface Rung {
    readonly id: string;
    readonly at: number;
}

/** Pick the last rung at or below `value`, holding the previous rung inside the dead zone. */
export function selectRung<T extends Rung>(
    rungs: readonly T[],
    value: number,
    previous?: string,
    hysteresis = 0,
): T | undefined {
    const first = rungs[0];
    if (!first) return undefined;

    let index = 0;
    rungs.forEach((rung, position) => {
        if (rung.at <= value) index = position;
    });
    const candidate = rungs[index]!;
    const current = rungs.find((rung) => rung.id === previous);

    if (!current || current === candidate) return candidate;
    if (candidate.at > current.at && value < candidate.at + hysteresis) return current;
    if (candidate.at < current.at && value > current.at - hysteresis) return current;
    return candidate;
}
