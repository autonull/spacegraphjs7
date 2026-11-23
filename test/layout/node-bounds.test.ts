// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { DEFAULT_NODE_BOUNDS, resolveNodeBounds } from '../../src/layout/node-bounds';

describe('resolveNodeBounds', () => {
    it('prefers bounds declared on the node data', () => {
        const node = { data: { width: 80, height: 40, depth: 2 } };
        const bounds = resolveNodeBounds(node, () => ({ width: 300, height: 300, depth: 1 }));

        expect(bounds).toEqual({ width: 80, height: 40, depth: 2 });
    });

    it('falls back to a render-dependent measurement', () => {
        const measured = { width: 120, height: 60, depth: 1 };
        expect(resolveNodeBounds({}, () => measured)).toEqual(measured);
    });

    it('uses the documented default when nothing is available', () => {
        expect(resolveNodeBounds({})).toEqual(DEFAULT_NODE_BOUNDS);
        expect(resolveNodeBounds({}, () => undefined)).toEqual(DEFAULT_NODE_BOUNDS);
    });
});
