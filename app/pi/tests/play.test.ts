import { describe, expect, test } from 'vitest';
import {
    createPhysicsPlaySession,
    PLAY_PRESETS,
    type PlaySettings,
    type PlaySimulation,
} from 'spacegraphjs/world';

const harness = () => {
    const settings: PlaySettings = {
        enabled: false,
        gravity: -9.8,
        collide: true,
        repulsion: 100,
        damping: 0.98,
        groundY: -500,
    };
    let settled = true;
    let instant = false;
    let energy = 0;
    const simulation: PlaySimulation = {
        setInstant: (value) => {
            instant = value;
            if (value) settled = true;
        },
        settle: () => {
            settled = true;
            energy = 0;
        },
        get settled() {
            return settled;
        },
        get energy() {
            return energy;
        },
    };
    return { settings, simulation, setEnergy: (value: number) => (energy = value) };
};

describe('play session', () => {
    test('borrows a preset and suspends the authority while playing', () => {
        const { settings, simulation } = harness();
        const session = createPhysicsPlaySession({ physics: { settings }, simulation });
        expect(session.play('zero-g')).toBe(true);
        expect(settings).toMatchObject({ enabled: true, gravity: 0, collide: true });
        expect(session.preset).toBe('zero-g');
        expect(session.active).toBe(true);
    });

    test('reconciles every coordinate back to the authority at rest', () => {
        const { settings, simulation, setEnergy } = harness();
        const session = createPhysicsPlaySession({ physics: { settings }, simulation });
        session.play('gravity-well');
        setEnergy(2.5);
        expect(session.energy).toBe(2.5);
        expect(session.reconcile()).toBe(true);
        expect(settings.enabled).toBe(false);
        expect(session.active).toBe(false);
        expect(session.preset).toBeNull();
        expect(session.energy).toBe(0);
    });

    test('declares distinct cues for each preset', () => {
        expect(PLAY_PRESETS['zero-g'].gravity).toBe(0);
        expect(PLAY_PRESETS.orbit.collide).toBe(false);
        expect(PLAY_PRESETS['gravity-well'].gravity).toBeLessThan(0);
    });
});
