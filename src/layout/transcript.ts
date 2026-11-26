import type { Position } from './strategies';
export interface TranscriptLine {
    readonly id: string;
    readonly parent?: string;
    readonly width: number;
    readonly height: number;
}
export interface TranscriptLaneOptions {
    readonly spineStep?: number;
    readonly contextStep?: number;
    readonly gutter?: number;
}
export interface TranscriptLaneLayout {
    readonly positions: ReadonlyMap<string, Position>;
    readonly octaves: ReadonlyMap<string, number>;
}
/**
 * Place a transcript as an append-only spine with attached context in columns to its right.
 * Every spine line starts at the same left edge; descendants align to a column edge and step down
 * at half the line height per level. The caller owns sizes, labels and scale, so one rule serves a
 * console card, a DOM row or a 3D node.
 */
export function transcriptLane(
    lines: readonly TranscriptLine[],
    options: TranscriptLaneOptions = {},
): TranscriptLaneLayout {
    const gutter = options.gutter ?? 12;
    const byID = new Map(lines.map((line) => [line.id, line]));
    const parentOf = new Map<string, string>();
    for (const line of lines) {
        if (line.parent && byID.has(line.parent) && line.parent !== line.id) {
            parentOf.set(line.id, line.parent);
        }
    }
    const children = new Map<string, string[]>();
    for (const [id, parent] of parentOf) {
        const siblings = children.get(parent) ?? [];
        siblings.push(id);
        children.set(parent, siblings);
    }
    const spine = lines.filter((line) => !parentOf.has(line.id));
    const stepFor = (ids: readonly string[]): number =>
        Math.max(1, ...ids.map((id) => byID.get(id)!.height)) + gutter;
    const spineStep = options.spineStep ?? stepFor(spine.map((line) => line.id));
    const positions = new Map<string, Position>();
    const octaves = new Map<string, number>();
    spine.forEach((line, index) => {
        const centerY = index ? -index * spineStep : 0;
        positions.set(line.id, { x: line.width / 2, y: centerY, z: 0 });
        octaves.set(line.id, 0);
        const seen = new Set<string>();
        const cluster: string[][] = [];
        const walk = (parent: string, depth: number): void => {
            const next = (children.get(parent) ?? []).filter((id) => !seen.has(id));
            if (!next.length) return;
            next.forEach((id) => seen.add(id));
            cluster[depth] = [...(cluster[depth] ?? []), ...next];
            next.forEach((id) => walk(id, depth + 1));
        };
        walk(line.id, 0);
        if (!cluster.length) return;
        const widths = [
            line.width,
            ...cluster.map((level) => Math.max(...level.map((id) => byID.get(id)!.width))),
        ];
        const left: number[] = [0];
        widths.slice(0, -1).forEach((width, depth) => {
            left[depth + 1] = left[depth]! + width + gutter;
        });
        const placed = new Set<string>();
        const place = (parent: string, depth: number, parentY: number): void => {
            const step = options.contextStep ?? stepFor(cluster[depth] ?? []);
            const siblings = (children.get(parent) ?? []).filter((id) => !placed.has(id));
            siblings.forEach((id) => placed.add(id));
            const yOf = new Map(
                siblings.map((id, index) => [
                    id,
                    parentY + (index - (siblings.length - 1) / 2) * step,
                ]),
            );
            siblings.forEach((id) => {
                const item = byID.get(id)!;
                positions.set(id, { x: left[depth + 1]! + item.width / 2, y: yOf.get(id)!, z: 0 });
                octaves.set(id, -(depth + 1));
                place(id, depth + 1, yOf.get(id)!);
            });
        };
        place(line.id, 0, centerY);
    });
    return { positions, octaves };
}
