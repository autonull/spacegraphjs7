import { describe, expect, it } from 'vitest';
import { decodeAddress, detailKey, encodeAddress, parseDetailKey, type Address } from '../src/address';

const address: Address = {
    s: '2', shot: 'fork-tabs', view: 'diff', rung: 'passage',
    layout: 'radial', asOf: 3, zoom: 1.25, focus: 'd:1:task:2',
    sel: 'd:1:message:1:0~d:1:message:2:8', tail: 'd:1:message:2',
    pal: 'retro', det: 'popup~d:1:message:2',
    q: 'ERROR', mode: 'derived',
    lens: 'line:d:1:message:2', bm: 'bookmark-token', regions: 'on', lod: 'dot',
};

describe('deep-link codec', () => {
    it('round-trips every address field', () => {
        expect(decodeAddress(encodeAddress(address))).toEqual(address);
    });

    it('round-trips console detail mode and expanded line ids', () => {
        expect(detailKey('rail', 'd:1:message:2')).toBe('rail~d:1:message:2');
        expect(parseDetailKey('rail~d:1:message:2')).toEqual({
            mode: 'rail',
            id: 'd:1:message:2',
        });
        expect(parseDetailKey('inline')).toEqual({ mode: 'inline' });
        expect(parseDetailKey('unknown~a')).toBeUndefined();
        expect(decodeAddress(btoa('det=unknown~a'))).toBeUndefined();
    });

    it('reads legacy rung addresses without a version', () => {
        const legacy = btoa('view=graph&rung=passage&focus=n1')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
        expect(decodeAddress(legacy)).toEqual({ view: 'graph', rung: 'passage', focus: 'n1' });
    });

    it('rejects malformed or unknown addresses', () => {
        expect(decodeAddress('')).toBeUndefined();
        expect(decodeAddress('not-base64!!')).toBeUndefined();
        expect(decodeAddress(btoa('view=nowhere'))).toBeUndefined();
        expect(decodeAddress(btoa('zoom=NaN'))).toBeUndefined();
        expect(decodeAddress(btoa('secret=1'))).toBeUndefined();
        expect(decodeAddress(btoa('mode=nowhere'))).toBeUndefined();
        expect(decodeAddress(btoa('lod=huge'))).toBeUndefined();
    });
});
