/**
 * Compile a typed question into facets. The grammar stays the one `facetsToQuery` writes, so a
 * question, a saved query and a permalink all round-trip through the same filter state.
 */
import type { GraphFacets } from '@spacegraphjs/shared';

const VERB_PREFIXES = [
    'show me',
    'filter for',
    'find me',
    'list me',
    'show',
    'display',
    'filter',
    'find',
    'get',
    'list',
] as const;

/** Synonyms keyed by canonical value; hosts extend them without editing the query grammar. */
export type NLQDictionaries = Readonly<{
    kinds?: Readonly<Record<string, readonly string[]>>;
    statuses?: Readonly<Record<string, readonly string[]>>;
    domains?: Readonly<Record<string, readonly string[]>>;
}>;

export type NLQOptions = Readonly<{
    /** Canonical values the compiler may emit. */
    kinds?: readonly string[];
    statuses?: readonly string[];
    domains?: readonly string[];
    dictionaries?: NLQDictionaries;
    /** Domain seeded into every result. Defaults to `session`. */
    defaultDomain?: string;
}>;

const DEFAULT_KINDS: Readonly<Record<string, readonly string[]>> = {
    tool: ['tool', 'tools'],
    file: ['file', 'files'],
    artifact: ['artifact', 'artifacts', 'diff', 'diffs'],
    error: ['error', 'errors', 'failure', 'failures', 'bug', 'bugs'],
    retry: ['retry', 'retries'],
    message: ['message', 'messages'],
    unit: ['turn', 'turns', 'step', 'steps'],
    action: ['action', 'actions'],
    run: ['run', 'runs'],
};

const DEFAULT_STATUSES: Readonly<Record<string, readonly string[]>> = {
    pending: ['pending'],
    running: ['running', 'active', 'executing'],
    success: ['success', 'succeeded', 'passed', 'ok', 'done', 'complete', 'completed'],
    failed: ['failed', 'failure', 'error', 'errors'],
    warning: ['warning', 'warn'],
};

const DEFAULT_DOMAINS: Readonly<Record<string, readonly string[]>> = {
    session: ['session'],
    code: ['code', 'repo', 'codebase'],
};

const merge = (
    base: Readonly<Record<string, readonly string[]>>,
    extra: Readonly<Record<string, readonly string[]>> | undefined,
    valid: readonly string[],
): Readonly<Record<string, readonly string[]>> => {
    return Object.fromEntries(
        valid.map((value) => [
            value,
            [...new Set([value, ...(base[value] ?? []), ...(extra?.[value] ?? [])])],
        ]),
    );
};

/** Matches exact words and longer stems ("successful" → "success"), never arbitrary substrings. */
const match = (
    tokens: readonly string[],
    synonyms: Readonly<Record<string, readonly string[]>>,
    valid: readonly string[],
): { values: string[]; consumed: Set<string> } => {
    const values: string[] = [];
    const consumed = new Set<string>();
    for (const value of valid) {
        const alternatives = synonyms[value] ?? [];
        const hit = tokens.find((token) =>
            alternatives.some((word) => token === word || (token.startsWith(word) && token.length > word.length)),
        );
        if (hit !== undefined) {
            values.push(value);
            consumed.add(hit);
        }
    }
    return { values, consumed };
};

/** Compiles "show failed files" into `{ query: '', kinds: ['file'], statuses: ['failed'] }`. */
export function compileNLQ(input: string, options: NLQOptions = {}): GraphFacets {
    const kinds = options.kinds ?? Object.keys(DEFAULT_KINDS);
    const statuses = options.statuses ?? Object.keys(DEFAULT_STATUSES);
    const domains = options.domains ?? Object.keys(DEFAULT_DOMAINS);
    const normalized = input.trim().toLowerCase();
    const prefix = VERB_PREFIXES.find((word) => normalized.startsWith(word));
    const tokens = (prefix ? normalized.slice(prefix.length) : normalized)
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    const kindMatch = match(tokens, merge(DEFAULT_KINDS, options.dictionaries?.kinds, kinds), kinds);
    const statusMatch = match(
        tokens,
        merge(DEFAULT_STATUSES, options.dictionaries?.statuses, statuses),
        statuses,
    );
    const domainMatch = match(tokens, merge(DEFAULT_DOMAINS, options.dictionaries?.domains, domains), domains);
    const consumed = new Set([...kindMatch.consumed, ...statusMatch.consumed, ...domainMatch.consumed]);

    return {
        query: tokens.filter((token) => !consumed.has(token)).join(' '),
        kinds: new Set(kindMatch.values),
        statuses: new Set(statusMatch.values),
        domains: new Set([options.defaultDomain ?? 'session', ...domainMatch.values]),
    };
}

/** The canonical `q=` spelling of a compiled question, ready for a permalink or saved query. */
export function formatNLQResult(facets: GraphFacets): string {
    const parts: string[] = [];
    if (facets.query) parts.push(facets.query);
    if (facets.kinds.size) parts.push(`kind:${[...facets.kinds].join(',')}`);
    if (facets.statuses.size) parts.push(`status:${[...facets.statuses].join(',')}`);
    const domains = [...facets.domains].filter((domain) => domain !== 'session');
    if (domains.length) parts.push(`domain:${domains.join(',')}`);
    return parts.join(' ');
}

/** Compile and serialize in one step, so a typed question becomes a shareable query. */
export const parseNLQ = (input: string, options: NLQOptions = {}) => {
    const facets = compileNLQ(input, options);
    return { facets, queryString: formatNLQResult(facets) };
};
