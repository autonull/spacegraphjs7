import { describe, expect, it } from 'vitest';
import { decodeAddress, encodeAddress, type Address } from '../src/address';

const address: Address = {
    s: '2', shot: 'fork-tabs', view: 'diff', rung: 'passage',
    layout: 'radial', asOf: 3, zoom: 1.25,
};

describe('deep-link codec', () => {
    it('round-trips every address field', () => {
        expect(decodeAddress(encodeAddress(address))).toEqual(address);
    });

    it('rejects malformed or unknown addresses', () => {
        expect(decodeAddress('')).toBeUndefined();
        expect(decodeAddress('not-base64!!')).toBeUndefined();
        expect(decodeAddress(btoa('view=nowhere'))).toBeUndefined();
        expect(decodeAddress(btoa('zoom=NaN'))).toBeUndefined();
        expect(decodeAddress(btoa('secret=1'))).toBeUndefined();
    });
});
