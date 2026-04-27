import { type Action, sortByRelevance, type ActionContext } from './Action';

export class ActionManager {
    private actions = new Map<string, Action>();

    register(action: Action): void {
        this.actions.set(action.id, action);
    }
    unregister(id: string): void {
        this.actions.delete(id);
    }
    get(id: string): Action | undefined {
        return this.actions.get(id);
    }
    getAll(): Action[] {
        return [...this.actions.values()];
    }

    findRelevant(ctx: ActionContext, minScore = 0): Action[] {
        return sortByRelevance(
            this.getAll().filter((a) => a.applies(ctx) > minScore),
            ctx,
        );
    }

    execute<I, O>(id: string, ctx: I): O | undefined {
        const action = this.actions.get(id) as Action<I, O> | undefined;
        return action?.execute(ctx);
    }
}
