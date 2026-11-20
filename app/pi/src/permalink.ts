/**
 * Full-state permalinks. `#graph:<id>` stays the reveal-only subset; `#s=<encoded>` is the complete
 * host state. Encoding is URI-safe JSON so a link is readable, round-trips exactly and needs no
 * runtime dependency.
 */
export type PermalinkViewport = {
    readonly zoom: number;
    readonly center: readonly [number, number, number];
};

export type PermalinkState = {
    readonly surface: string;
    readonly arrangement: string;
    readonly depth: string;
    readonly depthAxis: string;
    readonly level: string;
    readonly focus: string;
    readonly viewport: PermalinkViewport;
    readonly filter: string;
};

export const PERMALINK_PREFIX = 's=';

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const isViewport = (value: unknown): value is PermalinkViewport => {
    if (!isRecord(value) || typeof value.zoom !== 'number' || !Array.isArray(value.center)) return false;
    return value.center.length === 3 && value.center.every((part) => typeof part === 'number');
};

const isPermalinkState = (value: unknown): value is PermalinkState => {
    if (!isRecord(value)) return false;
    return (
        typeof value.surface === 'string' &&
        typeof value.arrangement === 'string' &&
        typeof value.depth === 'string' &&
        typeof value.depthAxis === 'string' &&
        typeof value.level === 'string' &&
        typeof value.focus === 'string' &&
        typeof value.filter === 'string' &&
        isViewport(value.viewport)
    );
};

export const encodePermalink = (state: PermalinkState): string =>
    `#${PERMALINK_PREFIX}${encodeURIComponent(JSON.stringify(state))}`;

export const decodePermalink = (hash: string): PermalinkState | null => {
    const raw = hash.replace(/^#/, '');
    if (!raw.startsWith(PERMALINK_PREFIX)) return null;
    try {
        const parsed: unknown = JSON.parse(decodeURIComponent(raw.slice(PERMALINK_PREFIX.length)));
        return isPermalinkState(parsed) ? parsed : null;
    } catch {
        return null;
    }
};

export const isRevealHash = (hash: string): boolean => /^#graph:.+/.test(hash);
