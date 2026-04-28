import { BaseAction, type ActionContext } from './Action';
import { NotImplementedError } from '../utils/error';

const nodeApplies = (ctx: ActionContext): number =>
    ctx.node && typeof ctx.node === 'object' && 'id' in ctx.node ? 1 : 0;

export class DeleteNodeAction extends BaseAction<{ nodeId: string }, void> {
    readonly id = 'delete-node';
    readonly label = 'Delete';
    readonly icon = 'trash';
    applies = nodeApplies;
    execute(_ctx: { nodeId: string }): void {
        // Explicitly surface unimplemented actions during development and tests
        throw new NotImplementedError('DeleteNodeAction.execute');
    }
}

export class DuplicateNodeAction extends BaseAction<{ nodeId: string }, string> {
    readonly id = 'duplicate-node';
    readonly label = 'Duplicate';
    readonly icon = 'copy';
    applies = nodeApplies;
    execute(_ctx: { nodeId: string }): string {
        throw new NotImplementedError('DuplicateNodeAction.execute');
    }
}

export class ConnectNodesAction extends BaseAction<{ sourceId: string; targetId: string }, string> {
    readonly id = 'connect-nodes';
    readonly label = 'Connect';
    readonly icon = 'link';
    applies(ctx: ActionContext): number {
        return nodeApplies(ctx) && (ctx.selection as { id: string }[])?.length ? 2 : 0;
    }
    execute(_ctx: { sourceId: string; targetId: string }): string {
        throw new NotImplementedError('ConnectNodesAction.execute');
    }
}

export class SelectAllAction extends BaseAction<unknown, string[]> {
    readonly id = 'select-all';
    readonly label = 'Select All';
    readonly icon = 'grid';
    applies(ctx: ActionContext): number {
        return ctx.graph ? 0.5 : 0;
    }
    execute(_ctx: unknown): string[] {
        throw new NotImplementedError('SelectAllAction.execute');
    }
}

export class ZoomToFitAction extends BaseAction<unknown, void> {
    readonly id = 'zoom-to-fit';
    readonly label = 'Zoom to Fit';
    readonly icon = 'maximize';
    applies(ctx: ActionContext): number {
        return ctx.graph ? 0.3 : 0;
    }
    execute(_ctx: unknown): void {
        throw new NotImplementedError('ZoomToFitAction.execute');
    }
}

export const BUILT_IN_ACTIONS = [
    new DeleteNodeAction(),
    new DuplicateNodeAction(),
    new ConnectNodesAction(),
    new SelectAllAction(),
    new ZoomToFitAction(),
];
