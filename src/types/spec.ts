// Specification types - graph, node, and edge specifications

import type { NodeData } from './node-data';
import type { EdgeData } from './base-data';

export interface NodeSpec<T extends NodeData = NodeData> {
  id: string;
  type: string;
  label?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  data?: T;
  parameters?: Record<string, unknown>;
}

export interface EdgeSpec<T extends EdgeData = EdgeData> {
  id: string;
  source: string;
  target: string;
  type?: string;
  data?: T;
}

export interface GraphSpec {
  nodes?: NodeSpec[];
  edges?: EdgeSpec[];
  camera?: { position: [number, number, number]; target: [number, number, number] };
}

export interface ZuiManifest {
  spec?: GraphSpec;
  spec_url?: string;
  initial_layout?: string;
}

export interface SpecUpdate {
  nodes?: Partial<NodeSpec>[];
  edges?: Partial<EdgeSpec>[];
}

// ============= Export/Import Types =============
export interface GraphExport {
  nodes: Array<{
    id: string;
    type: string;
    label?: string;
    position: [number, number, number];
    data: unknown;
  }>;
  edges: Array<{ id: string; source: string; target: string; type: string; data: unknown }>;
  camera?: { position: [number, number, number]; target: [number, number, number] };
  plugins?: Record<string, unknown>;
}

export type GraphImportData = GraphExport;