// P4.2. Camera verbs are host-registered behaviors. The library sequences commands against a host
// adapter built from CameraController / CameraControls; it never chooses a flight or a zoom level.

export const CAMERA_VERBS = ['fit', 'focus', 'flyTo', 'orbit', 'zoom', 'reset'] as const;
export type CameraVerb = (typeof CAMERA_VERBS)[number];

export interface CameraCommand {
    readonly verb: CameraVerb;
    readonly ids?: readonly string[];
    readonly position?: readonly [number, number, number];
    readonly target?: readonly [number, number, number];
    readonly amount?: number;
    readonly duration?: number;
}

/** The host binds these to `fitView`, `focusNode`, `flyTo`, `orbit`, `zoomTo` and `resetCamera`. */
export interface CameraAdapter {
    fit(ids: readonly string[] | undefined, duration: number): void;
    focus(id: string, duration: number): void;
    flyTo(
        position: readonly [number, number, number],
        target: readonly [number, number, number],
        duration: number,
    ): void;
    orbit(amount: number, duration: number): void;
    zoom(amount: number, duration: number): void;
    reset(): void;
}

export type CameraHandler = (command: CameraCommand, adapter: CameraAdapter) => void;

/** Content-relative bounds and opt-in orthographic orbit (gap 7), expressed as host policy. */
export interface CameraPolicy {
    readonly orbitInOrthographic: boolean;
    readonly contentRelativeZoom: boolean;
    readonly zoomOutFactor: number;
    readonly zoomInFactor: number;
}

export const DEFAULT_CAMERA_POLICY: CameraPolicy = {
    orbitInOrthographic: false,
    contentRelativeZoom: true,
    zoomOutFactor: 1 / 3,
    zoomInFactor: 2.5,
};

export function orbitEnabled(
    orthographic: boolean,
    policy: CameraPolicy = DEFAULT_CAMERA_POLICY,
): boolean {
    return !orthographic || policy.orbitInOrthographic;
}

export function contentZoomBounds(fitZoom: number, policy: CameraPolicy = DEFAULT_CAMERA_POLICY) {
    if (!policy.contentRelativeZoom) return { min: 0.01, max: 100 };
    return { min: fitZoom * policy.zoomOutFactor, max: fitZoom * policy.zoomInFactor };
}

const DEFAULTS: Record<CameraVerb, CameraHandler> = {
    fit: (command, adapter) => adapter.fit(command.ids, command.duration ?? 1.5),
    focus: (command, adapter) => adapter.focus(command.ids?.[0] ?? '', command.duration ?? 1),
    flyTo: (command, adapter) => {
        if (!command.position || !command.target) return;
        adapter.flyTo(command.position, command.target, command.duration ?? 1.5);
    },
    orbit: (command, adapter) => adapter.orbit(command.amount ?? 0, command.duration ?? 1.5),
    zoom: (command, adapter) => adapter.zoom(command.amount ?? 1, command.duration ?? 1),
    reset: (_command, adapter) => adapter.reset(),
};

/** Registered verbs override the neutral defaults; an unknown verb is a no-op. */
export class CameraVerbRegistry {
    readonly #handlers = new Map<CameraVerb, CameraHandler>();

    register(verb: CameraVerb, handler: CameraHandler): this {
        this.#handlers.set(verb, handler);
        return this;
    }

    verbs(): readonly CameraVerb[] {
        return [...this.#handlers.keys()];
    }

    run(command: CameraCommand, adapter: CameraAdapter): void {
        const handler = this.#handlers.get(command.verb) ?? DEFAULTS[command.verb];
        handler?.(command, adapter);
    }
}
