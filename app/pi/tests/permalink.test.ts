import { describe, expect, test } from 'vitest';
import {
    POLICY_SCHEMA,
    decodePolicyVector,
    encodePolicyVector,
} from '../src/policy';
import {
    decodePermalink,
    encodePermalink,
    isRevealHash,
    type PermalinkState,
} from '../src/permalink';

const state: PermalinkState = {
    surface: 'hybrid',
    arrangement: 'side',
    depth: 'orbit',
    depthAxis: 'turn',
    level: 'auto',
    focus: 'turn-3:action-4',
    viewport: { zoom: 1.25, center: [-12.5, 40, 7] },
    filter: 'failed',
};

describe('full-state permalinks', () => {
    test('round-trips exactly', () => {
        const hash = encodePermalink(state);
        expect(hash.startsWith('#s=')).toBe(true);
        expect(decodePermalink(hash)).toEqual(state);
    });

    test('publishes the shared view fields and still reads legacy links', () => {
        const payload = decodeURIComponent(encodePermalink(state).slice('#s='.length));
        expect(JSON.parse(payload)).toMatchObject({
            version: 1,
            view: state.surface,
            band: state.level,
            focus: state.focus,
            zoom: state.viewport.zoom,
        });
        expect(decodePermalink(`#s=${encodeURIComponent(JSON.stringify(state))}`)).toEqual(state);
    });

    test('round-trips a v2 policy vector and fixture', () => {
        const vector = {
            ...Object.fromEntries(POLICY_SCHEMA.knobs.map((knob) => [knob.id, knob.default])),
            'camera.verbMs': 250,
            'theme.variant': 'light',
        };
        const v2: PermalinkState = {
            ...state,
            policy: encodePolicyVector(POLICY_SCHEMA, vector),
            fixture: 'pi:local',
        };
        const decoded = decodePermalink(encodePermalink(v2));
        expect(decoded).toEqual(v2);
        expect(decodePolicyVector(POLICY_SCHEMA, decoded!.policy!)).toEqual(vector);
        expect(decodePolicyVector(POLICY_SCHEMA, 'p2.bad')).toBeNull();
    });

    test('round-trips a UI preset and rejects unknown ids', () => {
        const withUI: PermalinkState = { ...state, ui: 'compact' };
        expect(decodePermalink(encodePermalink(withUI))).toEqual(withUI);
        expect(decodePermalink(encodePermalink({ ...state, ui: 'missing' }))).toBeNull();
    });

    test('keeps #graph:<id> as the reveal-only subset', () => {
        expect(isRevealHash('#graph:action-4')).toBe(true);
        expect(isRevealHash('#s=%7B%22surface%22')).toBe(false);
        expect(decodePermalink('#graph:action-4')).toBeNull();
    });

    test('rejects malformed and partial state instead of guessing', () => {
        expect(decodePermalink('#s=not-json')).toBeNull();
        expect(decodePermalink('#s=%7B%22surface%22%3A%22map%22%7D')).toBeNull();
        expect(decodePermalink('')).toBeNull();
    });
});
