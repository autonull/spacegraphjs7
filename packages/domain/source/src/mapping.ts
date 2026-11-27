import { addEdge, addNode, DomainEventMapper, type KernelOp } from '@spacegraphjs/kernel';
import type { SourceSymbolKind } from './snapshot';

export type SourceEvent =
    | { readonly type: 'package'; readonly packageId: string; readonly label?: string }
    | {
          readonly type: 'file';
          readonly packageId: string;
          readonly fileId: string;
          readonly path: string;
      }
    | {
          readonly type: 'symbol';
          readonly packageId: string;
          readonly fileId: string;
          readonly name: string;
          readonly kind: SourceSymbolKind;
          readonly path: string;
          readonly line: number;
          readonly signature: string;
          readonly doc?: string;
      }
    | {
          readonly type: 'edge';
          readonly kind: 'imports' | 'exports' | 'references' | 'extends';
          readonly source: string;
          readonly target: string;
      };

/** Maps scanner facts into ordinary kernel ops. No host vocabulary or renderer objects cross here. */
export class SourceEventMapper extends DomainEventMapper {
    constructor(prefix = 'source') {
        super(prefix);
    }

    map(event: SourceEvent, snapshotID = 'api'): readonly KernelOp[] {
        const { id } = this;
        const packageNode = (packageId: string): string => id(snapshotID, packageId);
        switch (event.type) {
            case 'package':
                return [
                    addNode(
                        packageNode(event.packageId),
                        'package',
                        event.label ?? event.packageId,
                        {
                            packageId: event.packageId,
                            role: 'package',
                            status: 'complete',
                            lane: 'package',
                        },
                    ),
                ];
            case 'file': {
                const target = id(snapshotID, event.packageId, event.fileId);
                return [
                    addNode(target, 'file', event.path, {
                        packageId: event.packageId,
                        fileId: event.fileId,
                        path: event.path,
                        role: 'file',
                        status: 'complete',
                        lane: 'file',
                    }),
                    addEdge('contains', packageNode(event.packageId), target),
                ];
            }
            case 'symbol': {
                const target = id(snapshotID, event.packageId, event.fileId, event.name);
                return [
                    addNode(target, event.kind, event.name, {
                        packageId: event.packageId,
                        fileId: event.fileId,
                        symbolId: event.name,
                        symbolKind: event.kind,
                        path: event.path,
                        line: event.line,
                        signature: event.signature,
                        doc: event.doc ?? null,
                        role: event.kind,
                        status: 'complete',
                        lane: event.kind,
                    }),
                    addEdge('contains', id(snapshotID, event.packageId, event.fileId), target),
                ];
            }
            case 'edge':
                return [addEdge(event.kind, event.source, event.target)];
        }
    }
}

/** Qualified ids in snapshot events already carry the prefix; the mapper only needs the snapshot id. */
export const sourceOps = (
    events: readonly SourceEvent[],
    snapshotID: string,
): readonly KernelOp[] => {
    const mapper = new SourceEventMapper();
    return events.flatMap((event) => mapper.map(event, snapshotID));
};
