import type { Feed } from './local-feed';
import { scenarioByID, scenarioOps, type Scenario } from './scenarios';
import type { DurableView } from './translator';

export type Snapshot = {
    readonly seq: number;
    readonly view: DurableView;
};

/** Each committed entry yields one read-only point; no later fact leaks into an earlier view. */
export const snapshotsOf = (scenario: Scenario): readonly Snapshot[] =>
    scenario.view.entries.map((_, index) => ({
        seq: index + 1,
        view: { ...scenario.view, entries: scenario.view.entries.slice(0, index + 1) },
    }));

export const asOfFeed = (id: string, seq: number): Feed => {
    const scenario = scenarioByID(id);
    if (!scenario) return { active: '1', tabs: [] };
    const snapshots = snapshotsOf(scenario);
    const snapshot = snapshots.find((entry) => entry.seq === seq) ?? snapshots.at(-1);
    if (!snapshot) return { active: String(scenario.view.conversation.id), tabs: [] };
    const tabID = String(scenario.view.conversation.id);
    return { active: tabID, tabs: [{ id: tabID, ops: scenarioOps({ ...scenario, view: snapshot.view }) }] };
};
