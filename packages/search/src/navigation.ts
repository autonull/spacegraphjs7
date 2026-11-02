import type { GraphViewData, GraphNode } from '@spacegraphjs/shared';

/** Navigation mnemonic for quick keyboard access (e.g., "g t" for turns). */
export interface NavigationMnemonic {
    key: string;
    labelKey: string;
    kinds: readonly string[];
}

/** Default navigation mnemonics. Hosts can override or extend. */
export const NAVIGATION_MNEMONICS: readonly NavigationMnemonic[] = [
    { key: 's', labelKey: 'ui.search.nav.session', kinds: ['session'] },
    { key: 't', labelKey: 'ui.search.nav.turn', kinds: ['turn'] },
    { key: 'm', labelKey: 'ui.search.nav.message', kinds: ['message'] },
    { key: 'f', labelKey: 'ui.search.nav.file', kinds: ['file'] },
    { key: 'd', labelKey: 'ui.search.nav.directory', kinds: ['directory'] },
    { key: 'p', labelKey: 'ui.search.nav.package', kinds: ['package'] },
    { key: 'c', labelKey: 'ui.search.nav.commit', kinds: ['commit'] },
    { key: 'b', labelKey: 'ui.search.nav.branch', kinds: ['branch'] },
    { key: 'i', labelKey: 'ui.search.nav.issue', kinds: ['issue'] },
] as const;

const byKey = new Map<string, NavigationMnemonic>(
    NAVIGATION_MNEMONICS.map((mnemonic) => [mnemonic.key, mnemonic]),
);

/** Returns the help entries for the navigation mnemonic picker. */
export const navigationHelp = () =>
    NAVIGATION_MNEMONICS.map(({ key, labelKey }) => ({ key, labelKey }));

/** Parses a "g X" query into a navigation mnemonic. */
export const parseNavigation = (query: string): NavigationMnemonic | undefined => {
    const match = query
        .trim()
        .toLowerCase()
        .match(/^g\s*([a-z])$/);
    return match ? byKey.get(match[1]!) : undefined;
};

/** Returns all nodes matching a navigation mnemonic's kinds. */
export const navigationTargets = (
    model: GraphViewData,
    mnemonic: NavigationMnemonic,
): GraphNode[] => {
    const kinds = new Set<string>(mnemonic.kinds);
    return model.nodes.filter((node) => kinds.has(node.kind));
};

/**
 * Returns nodes for a navigation query ("g X"), or undefined if not a navigation query.
 * This enables the "g X" shortcut in search components.
 */
export const navigationResults = (model: GraphViewData, query: string): GraphNode[] | undefined => {
    const mnemonic = parseNavigation(query);
    return mnemonic ? navigationTargets(model, mnemonic) : undefined;
};

/**
 * Returns the next navigation target in the mnemonic's kind list.
 * Used for cycling through nodes of the same kind.
 */
export const nextNavigationTarget = (
    model: GraphViewData,
    mnemonic: NavigationMnemonic,
    current?: string,
): GraphNode | undefined => {
    const targets = navigationTargets(model, mnemonic);
    if (targets.length === 0) return undefined;
    const index = current === undefined ? -1 : targets.findIndex((node) => node.id === current);
    return targets[(index + 1) % targets.length];
};
