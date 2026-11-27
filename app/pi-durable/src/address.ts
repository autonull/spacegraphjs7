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
});

const parse = (record: ViewStateRecord): Address | undefined => {
    const { view, layout, focus, zoom, asOf, s, shot } = record;
    const band: unknown = record.band ?? record.rung;
    if (view !== undefined && !VIEW_NAMES.includes(view as ViewName)) return undefined;
    if (band !== undefined && !isRung(band)) return undefined;
    if (layout !== undefined && !LAYOUT_NAMES.includes(layout as LayoutName)) return undefined;
    for (const value of [s, shot, focus])
        if (value !== undefined && typeof value !== 'string') return undefined;
    return Object.fromEntries(
        Object.entries({ s, shot, view, rung: band, layout, asOf, zoom, focus }).filter(
            ([, value]) => value !== undefined,
        ),
    ) as Address;
};

const codec = viewStateCodec<Address>({
    format: 'compact',
    keys: ['s', 'shot', 'view', 'band', 'rung', 'layout', 'asOf', 'zoom', 'focus', 'version'],
    flatten,
    parse,
});

/** A compact, URL-safe codec for the same address the explicit query params carry. */
export const encodeAddress = (address: Address): string => codec.encode(address);

export const decodeAddress = (value: string | null | undefined): Address | undefined =>
    codec.decode(value);
