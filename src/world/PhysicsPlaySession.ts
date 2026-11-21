// One-authority play/reconcile lifecycle. While playing, physics borrows the host's bounded node set
// and the authoritative simulation holds still; at rest, reconcile returns every coordinate to it.
// The library owns the lifecycle, hosts own physics settings and the simulation.

export type GravityPreset = 'zero-g' | 'orbit' | 'gravity-well';

export type PlaySettings = {
    enabled: boolean;
    gravity: number;
    collide: boolean;
    repulsion: number;
    damping: number;
    groundY: number | null;
};

export type PlaySimulation = {
    setInstant(value: boolean): void;
    settle(): void;
    readonly settled: boolean;
    readonly energy: number;
};

export type PhysicsPlaySession = {
    readonly active: boolean;
    readonly preset: GravityPreset | null;
    readonly energy: number;
    play(preset?: GravityPreset): boolean;
    reconcile(): boolean;
};

export const PLAY_PRESETS: Readonly<Record<GravityPreset, Readonly<Partial<PlaySettings>>>> = {
    'zero-g': { gravity: 0, collide: true, repulsion: 120, damping: 0.98 },
    orbit: { gravity: 0, collide: false, repulsion: 60, damping: 0.995 },
    'gravity-well': { gravity: -9.8, collide: true, repulsion: 100, damping: 0.98 },
};

export const createPhysicsPlaySession = ({
    physics,
    simulation,
}: {
    physics: { settings: PlaySettings };
    simulation: PlaySimulation;
}): PhysicsPlaySession => {
    let active = false;
    let preset: GravityPreset | null = null;

    return {
        get active() {
            return active;
        },
        get preset() {
            return preset;
        },
        get energy() {
            return simulation.energy;
        },
        play(next: GravityPreset = 'zero-g') {
            Object.assign(physics.settings, PLAY_PRESETS[next], { enabled: true });
            simulation.setInstant(true);
            active = true;
            preset = next;
            return active;
        },
        reconcile() {
            physics.settings.enabled = false;
            simulation.setInstant(false);
            simulation.settle();
            active = false;
            preset = null;
            return simulation.settled;
        },
    };
};
