import type { ViewName } from './scenarios';

export type Callout = {
    readonly id: string;
    readonly label: string;
    readonly count: number;
    readonly view: ViewName;
};

type Fact = {
    readonly kind: string;
    readonly status: string;
    readonly data?: Readonly<Record<string, unknown>>;
};

/** Callout counts read committed facts only; they never invent a signal or span. */
export const calloutsFor = (nodes: readonly Fact[]): readonly Callout[] => {
    const sleeping = new Set(['sleeping', 'waiting', 'pending']);
    const count = (predicate: (node: Fact) => boolean): number => nodes.filter(predicate).length;
    return [
        {
            id: 'signals', label: 'sleeping signals',
            count: count((node) => node.kind === 'pending' && sleeping.has(String(node.data?.['status'] ?? node.status))),
            view: 'tasks',
        },
        {
            id: 'docs', label: 'deferred docs',
            count: count((node) => node.data?.['deferred'] === true),
            view: 'docs',
        },
        {
            id: 'spans', label: 'unreviewed spans',
            count: count((node) => node.data?.['trace'] !== undefined),
            view: 'trace',
        },
    ];
};
