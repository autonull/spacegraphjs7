export interface ActionContext {
    node?: { id: string };
    graph?: unknown;
    selection?: { id: string }[];
    mode?: string;
    [key: string]: unknown;
}

export interface Action<I = unknown, O = unknown> {
    readonly id: string;
    readonly label: string;
    readonly icon?: string;
    applies(context: ActionContext): number;
    execute(context: I): O;
}

export abstract class BaseAction<I, O> implements Action<I, O> {
    abstract readonly id: string;
    abstract readonly label: string;
    abstract applies(context: ActionContext): number;
    abstract execute(context: I): O;
    readonly icon?: string;
}

export const sortByRelevance = <I, O>(actions: Action<I, O>[], ctx: ActionContext): Action<I, O>[] =>
    [...actions].sort((a, b) => b.applies(ctx) - a.applies(ctx));

export const filterRelevant = <I, O>(actions: Action<I, O>[], ctx: ActionContext, minScore = 0): Action<I, O>[] =>
    actions.filter((a) => a.applies(ctx) > minScore);