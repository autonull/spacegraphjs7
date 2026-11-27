// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { VIEW_STATE_VERSION, viewStateCodec, type ViewStateRecord } from '../src/view-state';

type HostState = {
    readonly title: string;
    readonly tags?: readonly string[];
};

const flatten = (state: HostState): ViewStateRecord => ({
    version: VIEW_STATE_VERSION,
    view: state.title,
    band: 'execution',
    focus: 'turn-3',
    zoom: 1.25,
    ...state,
});

const parse = (record: ViewStateRecord): HostState | undefined =>
    typeof record.title === 'string'
        ? {
              title: record.title,
              ...(record.tags ? { tags: record.tags as readonly string[] } : {}),
          }
        : undefined;

const json = viewStateCodec<HostState>({ format: 'json', flatten, parse });
const compact = viewStateCodec<HostState>({
    format: 'compact',
    flatten,
    parse,
    keys: ['version', 'view', 'band', 'focus', 'zoom', 'title', 'tags'],
});

describe('view-state codecs', () => {
    it('round-trips host fields through both URL formats', () => {
        const state: HostState = { title: 'map' };
        for (const codec of [json, compact]) {
            expect(codec.decode(codec.encode(state))).toEqual(state);
        }
        const nested: HostState = { title: 'map', tags: ['a', 'b'] };
        expect(json.decode(json.encode(nested))).toEqual(nested);
    });

    it('normalises the version for legacy records without one', () => {
        const legacy = json.decode(encodeURIComponent(JSON.stringify({ title: 'map' })));
        expect(legacy).toEqual({ title: 'map' });
    });

    it('rejects invalid shared fields in both formats', () => {
        expect(
            json.decode(encodeURIComponent(JSON.stringify({ title: 'map', version: 2 }))),
        ).toBeUndefined();
        expect(
            json.decode(encodeURIComponent(JSON.stringify({ title: 'map', focus: 3 }))),
        ).toBeUndefined();
        expect(json.decode('not-json')).toBeUndefined();
        expect(compact.decode(btoa('secret=1'))).toBeUndefined();
        expect(compact.decode('not-base64!!')).toBeUndefined();
        expect(compact.decode(btoa('zoom=NaN'))).toBeUndefined();
    });

    it('refuses to encode a host projection with an invalid shared field', () => {
        const broken = viewStateCodec<HostState>({
            format: 'json',
            parse,
            flatten: (state) => ({ ...flatten(state), zoom: Number.NaN }),
        });
        expect(() => broken.encode({ title: 'map' })).toThrow(/invalid shared field/);
    });

    it('keeps unknown keys out of the compact allowlist', () => {
        expect(compact.decode(btoa('title=map&secret=1'))).toBeUndefined();
    });
});
