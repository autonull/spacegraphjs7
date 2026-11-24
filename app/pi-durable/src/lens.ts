import { parseNavigation } from '@spacegraphjs/search';
import { isRung, type Rung } from './rungs';
import { VIEW_NAMES, type ViewName } from './scenarios';

export type LayoutName = 'grid' | 'radial' | 'timeline';
export type LensCommand =
    | { readonly kind: 'view'; readonly value: ViewName }
    | { readonly kind: 'rung'; readonly value: Rung }
    | { readonly kind: 'asOf'; readonly value: number }
    | { readonly kind: 'tab'; readonly value: string }
    | { readonly kind: 'layout'; readonly value: LayoutName }
    | { readonly kind: 'find'; readonly value: string }
    | { readonly kind: 'focus'; readonly value: string }
    | { readonly kind: 'why' }
    | { readonly kind: 'help' };

export const LAYOUT_NAMES: readonly LayoutName[] = ['grid', 'radial', 'timeline'];

const MNEMONICS: Readonly<Record<string, ViewName>> = {
    s: 'graph', t: 'tasks', m: 'timeline', f: 'diff',
    d: 'docs', p: 'transcript', c: 'trace', b: 'graph', i: 'graph',
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
    if ((verb === 'find' || verb === 'f') && value) return { kind: 'find', value };
    if (verb === 'focus' && value) return { kind: 'focus', value };
    if (verb === 'why') return { kind: 'why' };
    if (verb === 'help' || verb === '?') return { kind: 'help' };
    return undefined;
};

export const LENS_HELP = 'view <name> · rung <landmark> · as of <seq> · tab <id> · layout <grid|radial|timeline> · find <text> · focus <id> · why';
