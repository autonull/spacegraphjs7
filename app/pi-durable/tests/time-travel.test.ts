import { opID } from 'pi-kit';
import { describe, expect, it } from 'vitest';
import { scenarioByID } from '../src/scenarios';
import { asOfFeed, snapshotsOf } from '../src/time-travel';

const scenario = scenarioByID('time-travel')!;
const ids = (seq: number): string[] => asOfFeed('time-travel', seq).tabs[0]!.ops.map(opID);

describe('stored asOf snapshots', () => {
    it('offers one read-only point per committed entry', () => {
        expect(snapshotsOf(scenario).map((snapshot) => snapshot.seq)).toEqual([1, 2, 3, 4]);
    });

    it('keeps later answers out of the past view and preserves recorded edges', () => {
        expect(ids(2)).not.toContain('node:d:1:entry:1-second');
        expect(ids(4)).toContain('node:d:1:entry:1-second');
        expect(ids(2)).toContain('node:d:1:entry:1-first');
        const edges = asOfFeed('time-travel', 2).tabs[0]!.ops
            .flatMap((op) => (op.op === 'add-edge' ? [op.edge.kind] : []));
        expect(new Set(edges)).toEqual(new Set(['orders']));
    });
});
