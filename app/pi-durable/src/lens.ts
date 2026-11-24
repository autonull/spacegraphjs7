import { parseNavigation } from '@spacegraphjs/search';
import { isRung, RUNG_IDS, type Rung } from './rungs';
import { VIEW_NAMES, type ViewName } from './scenarios';

export type LayoutName = 'grid' | 'radial' | 'timeline';
export type LensCommand =
    | { readonly kind: 'view'; readonly value: ViewName }
    | { readonly kind: 'rung'; readonly value: Rung }
    | { readonly kind: 'asOf'; readonly value: number }
    | { readonly kind: 'tab'; readonly value: string }
    | { readonly kind: 'layout'; readonly value: LayoutName }
    | { readonly kind: 'find'; readonly value: string; readonly status?: string; readonly nodeKind?: string }
    | { readonly kind: 'focus'; readonly value: string }
    | { readonly kind: 'why' }
    | { readonly kind: 'help' };

export const LAYOUT_NAMES: readonly LayoutName[] = ['grid', 'radial', 'timeline'];

const LENS_STEMS: readonly string[] = [
    'view', 'rung', 'as of', 'tab', 'layout', 'find', 'focus', 'why', 'help',
    ...VIEW_NAMES, ...RUNG_IDS, ...LAYOUT_NAMES,
];

const MNEMONICS: Readonly<Record<string, ViewName>> = {
    s: 'graph', t: 'tasks', m: 'timeline', f: 'diff',
    d: 'docs', p: 'transcript', c: 'trace', b: 'graph', i: 'graph',
};

const findCommand = (tokens: readonly string[]): LensCommand | undefined => {
    const status = tokens.find((token) => token.startsWith('status:'))?.slice('status:'.length);
    const nodeKind = tokens.find((token) => token.startsWith('kind:'))?.slice('kind:'.length);
    const value = tokens
        .filter((token) => !token.startsWith('status:') && !token.startsWith('kind:'))
        .join(' ');
    if (!value) return undefined;
    return {
        kind: 'find', value,
        ...(status ? { status } : {}),
        ...(nodeKind ? { nodeKind } : {}),
    };
};

/** One command grammar for view, landmark, time, tab, layout and node lookup. */
export const parseLens = (query: string): LensCommand | undefined => {
    const mnemonic = parseNavigation(query);
    if (mnemonic && MNEMONICS[mnemonic.key]) return { kind: 'view', value: MNEMONICS[mnemonic.key]! };
    const [verb, ...rest] = query.trim().toLowerCase().split(/\s+/);
    if (!verb) return undefined;
    const value = rest.join(' ');
    if (verb === 'view') return VIEW_NAMES.includes(value as ViewName) ? { kind: 'view', value: value as ViewName } : undefined;
    if (verb === 'rung') return isRung(value) ? { kind: 'rung', value } : undefined;
    if (verb === 'as' && rest[0] === 'of' || verb === 'asof') {
        const seq = Number(rest[verb === 'asof' ? 0 : 1]);
        return Number.isFinite(seq) ? { kind: 'asOf', value: seq } : undefined;
    }
    if (verb === 'tab' && value) return { kind: 'tab', value };
    if (verb === 'layout') return LAYOUT_NAMES.includes(value as LayoutName) ? { kind: 'layout', value: value as LayoutName } : undefined;
    if ((verb === 'find' || verb === 'f') && rest.length) return findCommand(rest);
    if (verb === 'focus' && value) return { kind: 'focus', value };
    if (verb === 'why') return { kind: 'why' };
    if (verb === 'help' || verb === '?') return { kind: 'help' };
    return undefined;
};

/** Prefix completion over the same vocabulary the parser accepts. */
export const lensCompletions = (prefix: string): readonly string[] => {
    const needle = prefix.trim().toLowerCase();
    return (needle ? LENS_STEMS.filter((stem) => stem.startsWith(needle)) : LENS_STEMS).slice(0, 8);
};

export const LENS_HELP = 'view <name> · rung <landmark> · as of <seq> · tab <id> · layout <grid|radial|timeline> · find <text> [status:<s>] [kind:<k>] · focus <id> · why';
