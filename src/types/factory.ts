// Factory types for ergonomic graph construction

import type { NodeSpec } from './spec';
import type { EdgeSpec } from './spec';
import type { NodeData } from './node-data';
import type { EdgeData } from './base-data';

export type NodeFactoryFn = (id: string, ...args: unknown[]) => NodeSpec<NodeData>;
export type EdgeFactoryFn = (
    source: string,
    target: string,
    ...args: unknown[]
) => EdgeSpec<EdgeData>;

export type NodeSpecWithPosition<T extends NodeData = NodeData> = NodeSpec<T> & {
    position: [number, number, number];
};
export type EdgeSpecWithData<T extends EdgeData = EdgeData> = EdgeSpec<T> & { data: T };
