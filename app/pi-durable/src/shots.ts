import { findShotByID } from 'spacegraphjs/experiments';
import { CONSOLE_SHOT_META } from './console-shots';
import { SCENARIOS, type ScenarioTier, type ViewName } from './scenarios';

export type Shot = {
    readonly id: string;
    readonly file: string;
    readonly title: string;
    readonly question: string;
    readonly scenario: string;
    readonly tier: ScenarioTier;
    readonly surface?: string;
    readonly level?: string;
    readonly reveal?: string;
    readonly viewport?: { readonly width: number; readonly height: number };
    readonly fit?: boolean;
    readonly octave?: number;
    readonly zoom?: number;
    readonly rail?: ViewName;
};

/** `?shot=<id>` boots pure scenario data, so a shot never encodes a private camera path. */
export const SHOTS: readonly Shot[] = SCENARIOS.map((entry) => ({
    id: entry.id,
    file: `pi-durable/${entry.id}.png`,
    title: entry.title,
    question: entry.question,
    scenario: entry.description,
    tier: entry.tier,
    viewport: { width: 1600, height: 1000 },
    ...(entry.rail === 'graph' ? {} : { rail: entry.rail }),
}));

export const shotById = (id: string | null | undefined): Shot | undefined => findShotByID(SHOTS, id);

/** A console shot boots a normal scenario, then drives the console into a showcase state. */
export type ConsoleShot = Shot & {
    /** Scenario id passed to `?shot=`; the shot id itself is only a capture label. */
    readonly source: string;
    readonly palette?: string;
    /** Indices of the first and last line to select, resolved from the rendered console. */
    readonly selection?: readonly [number, number];
    /** Zoom factor applied after boot; below 1 reveals the graph structure behind the text. */
    readonly zoomOut?: number;
    /** Detail modality revealed before capture. */
    readonly detailMode?: 'inline' | 'popup' | 'rail';
    readonly detailLine?: number;
    /** Extra query parameters, e.g. `asOf=2`. */
    readonly query?: string;
    /** Mirror console text without moving the spine or gutter. */
    readonly rtl?: boolean;
    /** Reveal inferred region overlays before capture. */
    readonly regions?: boolean;
};

const consoleShot = (
    id: string,
    source: string,
    overrides: Partial<ConsoleShot> = {},
): ConsoleShot => {
    const base = shotById(source)!;
    return {
        ...base,
        id,
        source,
        file: `pi-durable/console/${id}.png`,
        title: `${base.title} — console`,
        rail: 'transcript',
        ...overrides,
    };
};

export { CONSOLE_SHOT_META };

export const CONSOLE_SHOTS: readonly ConsoleShot[] = CONSOLE_SHOT_META.map(
    ({ id, source, ...meta }) => consoleShot(id, source, meta),
);

const HERO_IDS = new Set(['basic-turn', 'sleeping-approval', 'fork-tabs', 'resumed']);
export const HERO_SHOTS = SHOTS.filter((shot) => HERO_IDS.has(shot.id));
