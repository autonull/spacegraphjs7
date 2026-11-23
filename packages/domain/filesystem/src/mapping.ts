import { addEdge, addNode, DomainEventMapper, type KernelOp } from '@spacegraphjs/kernel';

export type FilesystemEvent =
    | {
          readonly type: 'commit';
          readonly commitId: string;
          readonly message?: string;
          readonly at?: number;
      }
    | {
          readonly type: 'file';
          readonly commitId: string;
          readonly path: string;
          readonly id?: string;
          readonly at?: number;
      }
    | {
          readonly type: 'symbol';
          readonly commitId: string;
          readonly path?: string;
          readonly fileId?: string;
          readonly name: string;
          readonly symbolKind?: string;
          readonly id?: string;
          readonly at?: number;
      }
    | {
          readonly type: 'change';
          readonly commitId: string;
          readonly path: string;
          readonly fileId?: string;
          readonly id?: string;
          readonly producerId?: string;
          readonly lines?: number;
          readonly status?: string;
          readonly at?: number;
      }
    | {
          readonly type: 'artifact';
          readonly commitId: string;
          readonly path: string;
          readonly id?: string;
          readonly producerId?: string;
          readonly at?: number;
      }
    | {
          readonly type: 'depends';
          readonly commitId: string;
          readonly sourceId: string;
          readonly targetId: string;
      }
    | {
          readonly type: 'orders';
          readonly commitId: string;
          readonly sourceId: string;
          readonly targetId: string;
      };

/** Converts host events into KernelOps. Hosts may use it or write their own. No host vocabulary inside. */
export class FilesystemEventMapper extends DomainEventMapper {
    constructor(prefix = 'filesystem') {
        super(prefix);
    }

    map(event: FilesystemEvent): readonly KernelOp[] {
        const { id, next } = this;
        const root = id(event.commitId, 'commit');
        const owner = (fileID: string | undefined): string =>
            fileID ? id(event.commitId, fileID) : root;

        switch (event.type) {
            case 'commit':
                return [
                    addNode(root, 'commit', event.message ?? 'Commit', {
                        commitId: event.commitId,
                        status: 'active',
                        lane: 'commit',
                        at: event.at ?? null,
                    }),
                ];
            case 'file': {
                const fileID = event.id ?? next();
                const target = id(event.commitId, fileID);
                return [
                    addNode(target, 'file', event.path, {
                        commitId: event.commitId,
                        fileId: fileID,
                        path: event.path,
                        status: 'complete',
                        lane: 'file',
                    }),
                    addEdge('contains', root, target),
                ];
            }
            case 'symbol': {
                const symbolID = event.id ?? next();
                const target = id(event.commitId, symbolID);
                return [
                    addNode(target, 'symbol', event.name, {
                        commitId: event.commitId,
                        symbolId: symbolID,
                        symbolKind: event.symbolKind ?? null,
                        path: event.path ?? null,
                        role: 'symbol',
                        status: 'complete',
                        lane: 'symbol',
                    }),
                    addEdge('contains', owner(event.fileId), target),
                ];
            }
            case 'change': {
                const changeID = event.id ?? next();
                const target = id(event.commitId, changeID);
                const ops: KernelOp[] = [
                    addNode(target, 'change', event.path, {
                        commitId: event.commitId,
                        changeId: changeID,
                        fileId: event.fileId ?? null,
                        path: event.path,
                        lines: event.lines ?? null,
                        role: 'change',
                        status: event.status ?? 'active',
                        lane: 'change',
                        at: event.at ?? null,
                    }),
                    addEdge('contains', owner(event.fileId), target),
                ];
                if (event.producerId)
                    ops.push(addEdge('writes', id(event.commitId, event.producerId), target));
                return ops;
            }
            case 'artifact': {
                const artifactID = event.id ?? next();
                const target = id(event.commitId, artifactID);
                const ops: KernelOp[] = [
                    addNode(target, 'artifact', event.path, {
                        commitId: event.commitId,
                        path: event.path,
                        role: 'artifact',
                        status: 'complete',
                    }),
                    addEdge('contains', root, target),
                ];
                if (event.producerId)
                    ops.push(addEdge('produces', id(event.commitId, event.producerId), target));
                return ops;
            }
            case 'depends':
                return [
                    addEdge(
                        'depends',
                        id(event.commitId, event.sourceId),
                        id(event.commitId, event.targetId),
                    ),
                ];
            case 'orders':
                return [
                    addEdge(
                        'orders',
                        id(event.commitId, event.sourceId),
                        id(event.commitId, event.targetId),
                    ),
                ];
        }
    }
}
