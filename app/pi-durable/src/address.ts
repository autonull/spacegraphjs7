import { viewStateCodec, type ViewStateRecord } from 'spacegraphjs/view-state';
import { LAYOUT_NAMES, type LayoutName } from './lens';
import { isRung, type Rung } from './rungs';
import { VIEW_NAMES, type ViewName } from './scenarios';

export type Address = {
    readonly s?: string;
    readonly shot?: string;
    readonly view?: ViewName;
    readonly rung?: Rung;
    readonly layout?: LayoutName;
    readonly asOf?: number;
    readonly zoom?: number;
    readonly focus?: string;
    /** Console selection, encoded as `anchorID:offset~focusID:offset`. */
    readonly sel?: string;
    /** Console tail or followed line id. */
    readonly tail?: string;
    /** Console palette id. */
    readonly pal?: string;
    /** Console detail state as `mode` or `mode~lineID`. */
    readonly det?: string;
};

export const CONSOLE_DETAIL_MODES = ['inline', 'popup', 'rail'] as const;
export type ConsoleDetailMode = (typeof CONSOLE_DETAIL_MODES)[number];

export const detailKey = (mode: ConsoleDetailMode, lineID?: string): string =>
    lineID ? `${mode}~${lineID}` : mode;

export const parseDetailKey = (
    key: string | undefined,
): { readonly mode: ConsoleDetailMode; readonly id?: string } | undefined => {
    if (!key) return undefined;
    const separator = key.indexOf('~');
    const mode = separator < 0 ? key : key.slice(0, separator);
    if (!CONSOLE_DETAIL_MODES.includes(mode as ConsoleDetailMode)) return undefined;
    const id = separator < 0 ? undefined : key.slice(separator + 1);
    return { mode: mode as ConsoleDetailMode, ...(id ? { id } : {}) };
};

/** The compact address is a projection of the shared view state; `rung` stays a legacy alias. */
const flatten = (address: Address): ViewStateRecord => ({
    version: 1,
    view: address.view,
    band: address.rung,
    layout: address.layout,
    focus: address.focus,
    zoom: address.zoom,
    asOf: address.asOf,
    s: address.s,
    shot: address.shot,
    sel: address.sel,
    tail: address.tail,
    pal: address.pal,
    det: address.det,
});

const parse = (record: ViewStateRecord): Address | undefined => {
    const { view, layout, focus, zoom, asOf, s, shot, sel, tail, pal, det } = record;
    if (typeof det === 'string' && !parseDetailKey(det)) return undefined;
    const band: unknown = record.band ?? record.rung;
    if (view !== undefined && !VIEW_NAMES.includes(view as ViewName)) return undefined;
    if (band !== undefined && !isRung(band)) return undefined;
    if (layout !== undefined && !LAYOUT_NAMES.includes(layout as LayoutName)) return undefined;
    for (const value of [s, shot, focus, sel, tail, pal, det])
        if (value !== undefined && typeof value !== 'string') return undefined;
    return Object.fromEntries(
        Object.entries({
            s, shot, view, rung: band, layout, asOf, zoom, focus, sel, tail, pal, det,
        }).filter(([, value]) => value !== undefined),
    ) as Address;
};

const codec = viewStateCodec<Address>({
    format: 'compact',
    keys: [
        's', 'shot', 'view', 'band', 'rung', 'layout', 'asOf', 'zoom', 'focus', 'sel', 'tail',
        'pal', 'det', 'version',
    ],
    flatten,
    parse,
});

/** A compact, URL-safe codec for the same address the explicit query params carry. */
export const encodeAddress = (address: Address): string => codec.encode(address);

export const decodeAddress = (value: string | null | undefined): Address | undefined =>
    codec.decode(value);
