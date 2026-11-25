const escapeHtml = (value: string): string =>
    value.replace(/[&<>"']/g, (char) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[char]!);

/** The host owns vocabulary; the library only needs stable ids and the committed text. */
export type ReadingNode = {
    readonly id: string;
    readonly label: string;
    readonly text?: string;
    readonly meta?: Readonly<Record<string, string>>;
};

export type ReadingEdge = { readonly source: string; readonly target: string };

export type ReadingSection = {
    /** Safe HTML id derived from the node id. */
    readonly id: string;
    readonly nodeID: string;
    readonly label: string;
    readonly text: string;
    readonly meta: Readonly<Record<string, string>>;
    readonly depth: number;
};

export type ReadingHTMLOptions = {
    readonly title?: string;
    /** Maps a node id to the link that reveals it in the graph. Defaults to the section anchor. */
    readonly link?: (nodeID: string) => string;
};

/** Fold recorded edges into reading order. Roots lead; unreachable facts follow in host order. */
export const readingOrder = (
    nodes: readonly ReadingNode[],
    edges: readonly ReadingEdge[],
): readonly ReadingSection[] => {
    const byID = new Map(nodes.map((node) => [node.id, node] as const));
    const next = new Map<string, string[]>();
    const incoming = new Set<string>();
    for (const edge of edges) {
        if (!byID.has(edge.source) || !byID.has(edge.target)) continue;
        const targets = next.get(edge.source) ?? [];
        if (!targets.includes(edge.target)) targets.push(edge.target);
        next.set(edge.source, targets);
        incoming.add(edge.target);
    }
    const sections: ReadingSection[] = [];
    const seen = new Set<string>();
    const visit = (id: string, depth: number): void => {
        if (seen.has(id)) return;
        seen.add(id);
        const node = byID.get(id);
        if (!node) return;
        sections.push({
            id: `reading-${encodeURIComponent(node.id)}`,
            nodeID: node.id,
            label: node.label,
            text: node.text ?? '',
            meta: node.meta ?? {},
            depth,
        });
        for (const target of next.get(id) ?? []) visit(target, depth + 1);
    };
    for (const node of nodes) if (!incoming.has(node.id)) visit(node.id, 0);
    for (const node of nodes) visit(node.id, 0);
    return sections;
};

/** Semantic, escaped DOM for a reading view. Every section carries its node id for backlinks. */
export const readingHTML = (
    sections: readonly ReadingSection[],
    options: ReadingHTMLOptions = {},
): string => {
    const items = sections.map((section) => {
        const level = Math.min(6, Math.max(2, section.depth + 2));
        const meta = Object.entries(section.meta)
            .map(([key, value]) => `<dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd>`)
            .join('');
        const text = section.text ? `<p class="reading-text">${escapeHtml(section.text)}</p>` : '';
        const details = meta ? `<dl class="reading-meta">${meta}</dl>` : '';
        const href = escapeHtml(options.link?.(section.nodeID) ?? `#${section.id}`);
        return `<li><section class="reading-section" id="${escapeHtml(section.id)}" data-node-id="${escapeHtml(section.nodeID)}">`
            + `<h${level}>${escapeHtml(section.label)}</h${level}>${text}${details}`
            + `<a class="reading-backlink" href="${href}" data-node-id="${escapeHtml(section.nodeID)}">Show in graph</a>`
            + '</section></li>';
    }).join('');
    const title = options.title
        ? `<header class="reading-head"><h1>${escapeHtml(options.title)}</h1></header>`
        : '';
    return `<article class="spacegraph-reading">${title}<ol class="reading-sections">${items}</ol></article>`;
};
