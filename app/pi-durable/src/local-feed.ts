import type { KernelOp } from 'pi-kit';
import { scenarioByID, scenarioOps } from './scenarios';
import { forkOps, translateTasks, type DurableView } from './translator';

export type FeedTab = { readonly id: string; readonly ops: readonly KernelOp[] };
export type Feed = { readonly active: string; readonly tabs: readonly FeedTab[] };

const seeded = (view: DurableView, seed: string): DurableView =>
    seed === 'fixed' || !seed ? view : {
        ...view,
        entries: view.entries.map((entry) =>
            entry.kind === 'pi.assistant'
                ? {
                      ...entry,
                      model: entry.model?.map((part) => ({
                          ...part,
                          content: typeof part.content === 'string'
                              ? `${part.content} [${seed}]`
                              : Array.isArray(part.content)
                                ? part.content.map((chunk) =>
                                      chunk && typeof chunk === 'object' && 'text' in chunk
                                          ? { ...chunk, text: `${String(chunk.text)} [${seed}]` }
                                          : chunk,
                                  )
                                : part.content,
                      })),
                  }
                : entry,
        ),
    };

const feedTab = (id: string, scenarioID: string, seed: string): FeedTab => {
    const scenario = scenarioByID(scenarioID)!;
    return {
        id,
        ops: scenarioOps({ ...scenario, view: seeded(scenario.view, seed) }),
    };
};

/** Deterministic, provider-free ops so the built page and every shot boot without a server. */
export const localFeed = (shot?: string, seed = 'fixed', scenarioID = shot ?? 'basic-turn'): Feed => {
    const scenario = scenarioByID(scenarioID) ?? scenarioByID('basic-turn')!;
    if (scenario.fork) {
        const parent = scenarioOps({
            ...scenarioByID('basic-turn')!,
            view: seeded(scenarioByID('basic-turn')!.view, seed),
        });
        return {
            active: String(scenario.view.conversation.id),
            tabs: [
                { id: String(scenarioByID('basic-turn')!.view.conversation.id), ops: parent },
                {
                    id: String(scenario.view.conversation.id),
                    ops: [
                        ...feedTab(String(scenario.view.conversation.id), scenario.id, seed).ops,
                        ...forkOps(1, scenario.view.conversation.id, '1-answer'),
                    ],
                },
            ],
        };
    }
    return { active: String(scenario.view.conversation.id), tabs: [feedTab(String(scenario.view.conversation.id), scenario.id, seed)] };
};

export const feedTasks = (id: string, shot?: string, seed = 'fixed'): readonly KernelOp[] => {
    const scenario = scenarioByID(shot ?? 'basic-turn') ?? scenarioByID('basic-turn')!;
    return translateTasks(id, scenario.tasks);
};
