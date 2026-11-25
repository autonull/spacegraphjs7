const escapeHtml = (value: string): string =>
    value.replace(/[&<>"']/g, (char) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[char]!);

/** The host owns vocabulary; the library only needs stable ids and the committed text. */
export type ReadingNode = {
    readonly id: string;
    readonly label: string;
    readonly text?: string;
    readonly format?: 'text' | 'markdown';
    readonly meta?: Readonly<Record<string, string>>;
};

export type ReadingEdge = { readonly source: string; readonly target: string };

export type ReadingSection = {
    /** Safe HTML id derived from the node id. */
    readonly id: string;
    readonly nodeID: string;
    readonly label: string;
    readonly text: string;
    readonly format: 'text' | 'markdown';
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
            format: node.format ?? 'text',
            meta: node.meta ?? {},
            depth,
        });
        for (const target of next.get(id) ?? []) visit(target, depth + 1);
    };
    for (const node of nodes) if (!incoming.has(node.id)) visit(node.id, 0);
    for (const node of nodes) visit(node.id, 0);
    return sections;
};

const SAFE_HREF = /^(https?:\/\/|mailto:|#|\/|\.?\/)/i;

const inlineHTML = (text: string): string => {
    const escaped = escapeHtml(text)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label: string, href: string) =>
            SAFE_HREF.test(href) ? `<a href="${href}">${label}</a>` : label,
        )
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>');
    return escaped;
};

/** Escape first, then allow only a small inline/fenced subset. No raw HTML ever reaches the DOM. */
export const readingTextHTML = (text: string): string =>
    text.split('```').map((part, index) => {
        if (index % 2 === 1)
            return `<pre><code>${escapeHtml(part.replace(/^\n|\n$/g, ''))}</code></pre>`;
        return part.trim() ? `<p class="reading-text">${inlineHTML(part)}</p>` : '';
    }).join('');

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
        const text = section.text
            ? section.format === 'markdown' ? readingTextHTML(section.text) : `<p class="reading-text">${escapeHtml(section.text)}</p>`
            : '';
        const details = meta ? `<dl class="reading-meta">${meta}</dl>` : '';
        const href = escapeHtml(options.link?.(section.nodeID) ?? `#${section.id}`);
        return `<li><section class="reading-section" id="${escapeHtml(section.id)}" data-node-id="${escapeHtml(section.nodeID)}"`
            + ` tabindex="0" aria-label="${escapeHtml(section.label)}">`
            + `<h${level}>${escapeHtml(section.label)}</h${level}>${text}${details}`
            + `<a class="reading-backlink" href="${href}" data-node-id="${escapeHtml(section.nodeID)}">Show in graph</a>`
            + '</section></li>';
    }).join('');
    const title = options.title
        ? `<header class="reading-head"><h1>${escapeHtml(options.title)}</h1></header>`
        : '';
    return `<article class="spacegraph-reading">${title}<ol class="reading-sections">${items}</ol></article>`;
};

export type ReadingOptions = ReadingHTMLOptions & {
    /** Called when a section is activated by click, Enter or Space. */
    readonly onReveal?: (nodeID: string) => void;
};

export type ReadingController = {
    readonly element: HTMLElement;
    /** Focus and scroll to a committed fact. */
    reveal(nodeID: string): void;
    destroy(): void;
};

/** Host-agnostic reading surface: section focus, arrow navigation and one reveal callback. */
export const mountReading = (
    container: HTMLElement,
    sections: readonly ReadingSection[],
    options: ReadingOptions = {},
): ReadingController => {
    const { onReveal, ...htmlOptions } = options;
    container.innerHTML = readingHTML(sections, htmlOptions);
    const items = (): readonly HTMLElement[] => [
        ...container.querySelectorAll<HTMLElement>('.reading-section'),
    ];
    const activate = (element: HTMLElement): void => {
        const nodeID = element.dataset['nodeId'];
        if (nodeID) onReveal?.(nodeID);
    };
    const onClick = (event: MouseEvent): void => {
        const section = (event.target as HTMLElement | null)?.closest<HTMLElement>('.reading-section');
        if (!section || !container.contains(section)) return;
        event.preventDefault();
        activate(section);
    };
    const onKeyDown = (event: KeyboardEvent): void => {
        const section = (event.target as HTMLElement | null)?.closest<HTMLElement>('.reading-section');
        if (!section) return;
        const list = items();
        const index = list.indexOf(section);
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            const next = event.key === 'ArrowDown' ? index + 1 : index - 1;
            list[Math.min(list.length - 1, Math.max(0, next))]?.focus();
        } else if (event.key === 'Home' || event.key === 'End') {
            event.preventDefault();
            list[event.key === 'Home' ? 0 : list.length - 1]?.focus();
        } else if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            activate(section);
        }
    };
    container.addEventListener('click', onClick);
    container.addEventListener('keydown', onKeyDown);
    return {
        element: container,
        reveal: (nodeID: string): void => {
            const target = items().find((item) => item.dataset['nodeId'] === nodeID);
            target?.focus();
            target?.scrollIntoView({ block: 'center' });
        },
        destroy: (): void => {
            container.removeEventListener('click', onClick);
            container.removeEventListener('keydown', onKeyDown);
        },
    };
};
