/** Pure cross-canvas trace policy. Links cross graphs; a shared scope bridges nodes inside one graph. */

export type CrossTraceLink = {
    readonly id: string;
    readonly from: readonly [domain: string, node: string];
    readonly to: readonly [domain: string, node: string];
};

export type CrossTraceStep = {
    readonly domain: string;
    readonly node: string;
    /** Link id when the step crosses a canvas, `scope:<id>` when it moves inside one. */
    readonly via?: string;
};

const domainOf = (id: string): string => id.split(':')[0] ?? '';
const scopeOf = (id: string): string => id.split(':')[1] ?? '';

const peers = (
    nodesByDomain: Readonly<Record<string, readonly string[]>>,
    current: string,
): readonly string[] =>
    (nodesByDomain[domainOf(current)] ?? []).filter(
        (id) => id !== current && scopeOf(id) === scopeOf(current),
    );

/**
 * Ordered walk from one node to the next. Forward follows `from → to`; backward inverts the walk so
 * a metric answers which commit and step produced it. A same-scope peer is visited only when it
 * leads to a further link, so the path stays an evidence chain rather than wandering the graph.
 */
export const crossTracePath = (
    links: readonly CrossTraceLink[],
    nodesByDomain: Readonly<Record<string, readonly string[]>>,
    start: string,
    direction: 'forward' | 'backward' = 'forward',
): readonly CrossTraceStep[] => {
    const path: CrossTraceStep[] = [{ domain: domainOf(start), node: start }];
    const seen = new Set([start]);
    let current = start;

    for (let hop = 0; hop <= links.length; hop++) {
        const origin = direction === 'forward' ? 'from' : 'to';
        const destination = direction === 'forward' ? 'to' : 'from';
        const candidates = [current, ...peers(nodesByDomain, current)];
        const match = links
            .map((link) => ({ link, origin: link[origin], destination: link[destination] }))
            .find(
                ({ origin: from, destination: to }) =>
                    candidates.some((id) => from[0] === domainOf(id) && from[1] === id) &&
                    !seen.has(to[1]),
            );
        if (!match) return path;

        const { link, origin: from, destination: to } = match;
        if (from[1] !== current) {
            path.push({ domain: from[0], node: from[1], via: `scope:${scopeOf(current)}` });
            seen.add(from[1]);
        }
        path.push({ domain: to[0], node: to[1], via: link.id });
        seen.add(to[1]);
        current = to[1];
    }

    return path;
};
