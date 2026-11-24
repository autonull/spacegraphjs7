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
};

const number = (value: string | undefined): number | undefined => {
    const parsed = Number(value);
    return value !== undefined && Number.isFinite(parsed) ? parsed : undefined;
};

/** A compact, URL-safe codec for the same address the explicit query params carry. */
export const encodeAddress = (address: Address): string => {
    const pairs: readonly (readonly [string, string | undefined])[] = [
        ['s', address.s], ['shot', address.shot], ['view', address.view], ['rung', address.rung],
        ['layout', address.layout],
        ['asOf', address.asOf === undefined ? undefined : String(address.asOf)],
        ['zoom', address.zoom === undefined ? undefined : address.zoom.toFixed(3)],
    ];
    return btoa(pairs.filter((pair): pair is readonly [string, string] => Boolean(pair[1]))
        .map(([key, value]) => `${key}=${value}`).join('&'))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export const decodeAddress = (value: string | null | undefined): Address | undefined => {
    if (!value) return undefined;
    try {
        const text = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
        const address: Record<string, string | number> = {};
        for (const pair of text.split('&')) {
            const [key, raw] = pair.split('=');
            if (!key || raw === undefined) return undefined;
            if (key === 'view' && VIEW_NAMES.includes(raw as ViewName)) address.view = raw;
            else if (key === 'rung' && isRung(raw)) address.rung = raw;
            else if (key === 'layout' && LAYOUT_NAMES.includes(raw as LayoutName)) address.layout = raw;
            else if (key === 's' || key === 'shot') address[key] = raw;
            else if (key === 'asOf' || key === 'zoom') {
                const parsed = number(raw);
                if (parsed === undefined) return undefined;
                address[key] = parsed;
            } else return undefined;
        }
        return address as Address;
    } catch {
        return undefined;
    }
};
