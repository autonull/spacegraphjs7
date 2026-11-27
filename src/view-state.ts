/**
 * Versioned, host-extensible view state for deep links and navigation history.
 * A host maps its own state to the shared record; this module owns the version,
 * shared-field validation and URL-safe framing. Host fields stay host-owned.
 */
export const VIEW_STATE_VERSION = 1 as const;

export type ViewState = {
    readonly version?: typeof VIEW_STATE_VERSION;
    readonly view?: string;
    readonly band?: string;
    readonly layout?: string;
    readonly focus?: string;
    readonly zoom?: number;
    readonly asOf?: number;
};

export type ViewStateRecord = Readonly<Record<string, unknown>> & ViewState;

export interface ViewStateCodec<S> {
    encode(state: S): string;
    decode(raw: string | null | undefined): S | undefined;
}

export interface ViewStateCodecOptions<S> {
    readonly format: 'json' | 'compact';
    /** Maps a validated shared record to the host's state type. */
    readonly parse: (record: ViewStateRecord) => S | undefined;
    /** Maps host state to the shared record; shared aliases are optional. */
    readonly flatten: (state: S) => ViewStateRecord;
    /** Compact key order and allowlist. Unknown keys are rejected on decode. */
    readonly keys?: readonly string[];
}

const NUMERIC = new Set(['version', 'zoom', 'asOf']);
const TEXTUAL = new Set(['view', 'band', 'layout', 'focus']);

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const validCore = (record: ViewStateRecord): boolean => {
    if (record.version !== undefined && record.version !== VIEW_STATE_VERSION) return false;
    return [...NUMERIC, ...TEXTUAL].every((key) => {
        const value: unknown = record[key];
        if (value === undefined) return true;
        return NUMERIC.has(key)
            ? typeof value === 'number' && Number.isFinite(value)
            : typeof value === 'string';
    });
};

const orderedKeys = (
    record: ViewStateRecord,
    keys: readonly string[] | undefined,
): readonly string[] =>
    keys ?? [
        ...NUMERIC,
        ...TEXTUAL,
        ...Object.keys(record).filter((key) => !NUMERIC.has(key) && !TEXTUAL.has(key)),
    ];

const compactCodec = <S>(options: ViewStateCodecOptions<S>): ViewStateCodec<S> => ({
    encode(state) {
        const record: ViewStateRecord = { ...options.flatten(state), version: VIEW_STATE_VERSION };
        if (!validCore(record)) throw new Error('view-state: invalid shared field');
        const pairs = orderedKeys(record, options.keys).flatMap((key) => {
            const value: unknown = record[key];
            return value === undefined ? [] : [`${key}=${String(value)}`];
        });
        return btoa(pairs.join('&')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    },
    decode(raw) {
        if (!raw) return undefined;
        try {
            const text = atob(raw.replace(/-/g, '+').replace(/_/g, '/'));
            const record: Record<string, unknown> = {};
            for (const pair of text.split('&')) {
                const separator = pair.indexOf('=');
                if (separator < 1) return undefined;
                const key = pair.slice(0, separator);
                const value = pair.slice(separator + 1);
                if (!value || (options.keys && !options.keys.includes(key))) return undefined;
                record[key] = NUMERIC.has(key) ? Number(value) : value;
            }
            if (!validCore(record as ViewStateRecord)) return undefined;
            return options.parse({ ...record, version: VIEW_STATE_VERSION } as ViewStateRecord);
        } catch {
            return undefined;
        }
    },
});

const jsonCodec = <S>(options: ViewStateCodecOptions<S>): ViewStateCodec<S> => ({
    encode(state) {
        const record: ViewStateRecord = { ...options.flatten(state), version: VIEW_STATE_VERSION };
        if (!validCore(record)) throw new Error('view-state: invalid shared field');
        return encodeURIComponent(JSON.stringify(record));
    },
    decode(raw) {
        if (!raw) return undefined;
        try {
            const parsed: unknown = JSON.parse(decodeURIComponent(raw));
            if (!isRecord(parsed)) return undefined;
            const record = { ...parsed, version: parsed.version ?? VIEW_STATE_VERSION };
            if (!validCore(record as ViewStateRecord)) return undefined;
            return options.parse(record as ViewStateRecord);
        } catch {
            return undefined;
        }
    },
});

/** One codec for both deep-link formats: compact `?at=` addresses and readable `#s=` JSON. */
export const viewStateCodec = <S>(options: ViewStateCodecOptions<S>): ViewStateCodec<S> =>
    options.format === 'compact' ? compactCodec(options) : jsonCodec(options);
