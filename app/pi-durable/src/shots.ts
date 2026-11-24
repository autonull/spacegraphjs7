import { findShotByID } from 'spacegraphjs/experiments';
import { SCENARIOS, type ScenarioTier } from './scenarios';

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
    readonly rail?: string;
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

export const CORE_SHOTS = SHOTS.filter((shot) => shot.tier === 'Core').slice(0, 4);
