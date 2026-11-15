import { describe, it, expect } from 'vitest';
import {
    encodeDeepLink,
    decodeDeepLink,
    isDeepLink,
    createDeepLinkCodec,
    type DeepLinkParts,
    type DeepLinkOptions,
} from './deep-link';

describe('deep-link', () => {
    const options: DeepLinkOptions = { prefix: '#spacegraph:' };

    describe('encodeDeepLink', () => {
        it('encodes layout and level', () => {
            const parts: DeepLinkParts = { layout: 'lanes', level: 'execution' };
            expect(encodeDeepLink(parts, options)).toBe('#spacegraph:lanes:execution');
        });

        it('encodes layout, level, and node', () => {
            const parts: DeepLinkParts = { layout: 'lanes', level: 'execution', node: 'node-123' };
            expect(encodeDeepLink(parts, options)).toBe('#spacegraph:lanes:execution:node-123');
        });

        it('handles different layouts and levels', () => {
            expect(encodeDeepLink({ layout: 'tree', level: 'overview' }, options)).toBe('#spacegraph:tree:overview');
            expect(encodeDeepLink({ layout: 'timeline', level: 'detail', node: 'abc' }, options)).toBe(
                '#spacegraph:timeline:detail:abc',
            );
        });
    });

    describe('decodeDeepLink', () => {
        it('decodes layout and level', () => {
            const result = decodeDeepLink('#spacegraph:lanes:execution', options);
            expect(result).toEqual({ layout: 'lanes', level: 'execution', node: undefined });
        });

        it('decodes layout, level, and node', () => {
            const result = decodeDeepLink('#spacegraph:lanes:execution:node-123', options);
            expect(result).toEqual({ layout: 'lanes', level: 'execution', node: 'node-123' });
        });

        it('returns undefined for wrong prefix', () => {
            expect(decodeDeepLink('#graph:lanes:execution', options)).toBeUndefined();
            expect(decodeDeepLink('spacegraph:lanes:execution', options)).toBeUndefined();
            expect(decodeDeepLink('', options)).toBeUndefined();
        });

        it('returns undefined for incomplete segments', () => {
            expect(decodeDeepLink('#spacegraph:lanes', options)).toBeUndefined();
            expect(decodeDeepLink('#spacegraph:', options)).toBeUndefined();
        });
    });

    describe('isDeepLink', () => {
        it('returns true for matching prefix', () => {
            expect(isDeepLink('#spacegraph:lanes:execution', options)).toBe(true);
            expect(isDeepLink('#spacegraph:tree:overview:node', options)).toBe(true);
        });

        it('returns false for non-matching prefix', () => {
            expect(isDeepLink('#graph:lanes:execution', options)).toBe(false);
            expect(isDeepLink('spacegraph:lanes:execution', options)).toBe(false);
            expect(isDeepLink('', options)).toBe(false);
        });
    });

    describe('createDeepLinkCodec', () => {
        it('creates a codec with fixed prefix', () => {
            const codec = createDeepLinkCodec('#spacegraph:');
            expect(codec.encode({ layout: 'lanes', level: 'execution' })).toBe('#spacegraph:lanes:execution');
            expect(codec.decode('#spacegraph:lanes:execution:node')).toEqual({
                layout: 'lanes',
                level: 'execution',
                node: 'node',
            });
            expect(codec.isDeepLink('#spacegraph:lanes:execution')).toBe(true);
            expect(codec.isDeepLink('#other:lanes:execution')).toBe(false);
        });
    });

    describe('round-trip', () => {
        it('encodes and decodes back to the same parts', () => {
            const parts: DeepLinkParts = { layout: 'lanes', level: 'execution', node: 'node-123' };
            const encoded = encodeDeepLink(parts, options);
            const decoded = decodeDeepLink(encoded, options);
            expect(decoded).toEqual(parts);
        });

        it('works without node', () => {
            const parts: DeepLinkParts = { layout: 'tree', level: 'overview' };
            const encoded = encodeDeepLink(parts, options);
            const decoded = decodeDeepLink(encoded, options);
            expect(decoded).toEqual(parts);
        });
    });
});