import type { Position } from './strategies';

export interface ChapterPackingOptions {
    readonly card: readonly [number, number];
    readonly gap?: readonly [number, number];
    readonly columns?: number;
    readonly viewport?: { readonly width: number; readonly height: number };
    readonly previous?: ReadonlyMap<string, Position>;
}

/**
 * Grid packing for a small set of chapter cards. Known cards keep their previous cell so a streamed
 * chapter does not reshuffle the cards the reader is looking at; the viewport caps a fixed column
 * count so wide canvases do not leave half the grid empty.
 */
export function chapterPacking(
    ids: readonly string[],
    options: ChapterPackingOptions,
): ReadonlyMap<string, Position> {
    const [gapX, gapY] = options.gap ?? [56, 48];
    const width = options.card[0] + gapX;
    const height = options.card[1] + gapY;
    const fitColumns = options.viewport
        ? Math.max(1, Math.floor((options.viewport.width + gapX) / width))
        : Number.POSITIVE_INFINITY;
    const columns = Math.max(1, Math.min(options.columns ?? 2, fitColumns));
    const positions = new Map<string, Position>();
    const taken = new Set<number>();

    for (const id of ids) {
        const previous = options.previous?.get(id);
        if (!previous) continue;
        const column = Math.round(previous.x / width);
        const row = Math.round(previous.y / height);
        const index = row * columns + column;
        const aligned =
            column >= 0 &&
            column < columns &&
            Math.abs(previous.x - column * width) < 1 &&
            Math.abs(previous.y - row * height) < 1;
        if (aligned && !taken.has(index)) {
            positions.set(id, previous);
            taken.add(index);
        }
    }

    let next = 0;
    for (const id of ids) {
        if (positions.has(id)) continue;
        while (taken.has(next)) next++;
        positions.set(id, {
            x: (next % columns) * width,
            y: Math.floor(next / columns) * height,
            z: 0,
        });
        taken.add(next++);
    }
    return positions;
}
