import { Kernel } from './kernel';
import type { Edge, Hyperedge, Node } from './kernel';
import { SessionKernel } from './session';
import type { SessionEntry } from './session';
import { WorkspaceKernel } from './workspace';

export const KERNEL_FORMAT = 1;

export type KernelDocument = {
  readonly format: typeof KERNEL_FORMAT;
  readonly kind: 'kernel';
  readonly version: number;
  readonly nodes: readonly Node[];
  readonly edges: readonly Edge[];
  readonly hyperedges: readonly Hyperedge[];
};

export type SessionDocument = {
  readonly format: typeof KERNEL_FORMAT;
  readonly kind: 'session';
  readonly version: number;
  readonly entries: readonly SessionEntry[];
  readonly tags: Readonly<Record<string, number>>;
  readonly forkedFrom?: number;
};

export type WorkspaceDocument = {
  readonly format: typeof KERNEL_FORMAT;
  readonly kind: 'workspace';
  readonly kernel: {
    readonly version: number;
    readonly nodes: readonly Node[];
    readonly edges: readonly Edge[];
    readonly hyperedges: readonly Hyperedge[];
  };
  readonly clock: Readonly<Record<string, number>>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parse = (json: string): unknown => {
  try {
    return JSON.parse(json);
  } catch {
    throw new Error('Kernel document is not valid JSON');
  }
};

const requireFormat = (value: unknown): Record<string, unknown> => {
  if (!isRecord(value)) throw new Error('Kernel document must be an object');
  if (value.format !== KERNEL_FORMAT) {
    throw new Error(
      `Unsupported kernel format ${String(value.format)} (expected ${KERNEL_FORMAT})`,
    );
  }
  return value;
};

const requireKind = (
  document: Record<string, unknown>,
  kind: 'kernel' | 'session' | 'workspace',
): void => {
  if (document.kind !== kind) {
    throw new Error(`Expected a ${kind} document but found ${String(document.kind)}`);
  }
};

export const KernelCodec = {
  encode(kernel: Kernel): string {
    const document: KernelDocument = {
      format: KERNEL_FORMAT,
      kind: 'kernel',
      version: kernel.version,
      nodes: kernel.nodes,
      edges: kernel.edges,
      hyperedges: kernel.hyperedges,
    };
    return JSON.stringify(document);
  },

  decode(json: string): Kernel {
    const document = requireFormat(parse(json));
    requireKind(document, 'kernel');
    return new Kernel({
      nodes: document.nodes as readonly Node[],
      edges: document.edges as readonly Edge[],
      hyperedges: document.hyperedges as readonly Hyperedge[],
      version: document.version as number,
    });
  },

  encodeSession(session: SessionKernel): string {
    const document: SessionDocument = {
      format: KERNEL_FORMAT,
      kind: 'session',
      version: session.version,
      entries: session.entries,
      tags: Object.fromEntries(session.tags),
      ...(session.forkedFrom === undefined ? {} : { forkedFrom: session.forkedFrom }),
    };
    return JSON.stringify(document);
  },

  decodeSession(json: string): SessionKernel {
    const document = requireFormat(parse(json));
    requireKind(document, 'session');
    return new SessionKernel({
      entries: document.entries as readonly SessionEntry[],
      version: document.version as number,
      tags: document.tags as Readonly<Record<string, number>>,
      forkedFrom: document.forkedFrom as number | undefined,
    });
  },

  encodeWorkspace(workspace: WorkspaceKernel): string {
    const document: WorkspaceDocument = {
      format: KERNEL_FORMAT,
      kind: 'workspace',
      kernel: {
        version: workspace.kernel.version,
        nodes: workspace.kernel.nodes,
        edges: workspace.kernel.edges,
        hyperedges: workspace.kernel.hyperedges,
      },
      clock: Object.fromEntries(workspace.clock),
    };
    return JSON.stringify(document);
  },

  decodeWorkspace(json: string): WorkspaceKernel {
    const document = requireFormat(parse(json));
    requireKind(document, 'workspace');
    const kernel = document.kernel as WorkspaceDocument['kernel'];
    return new WorkspaceKernel({
      kernel: new Kernel({
        nodes: kernel.nodes,
        edges: kernel.edges,
        hyperedges: kernel.hyperedges,
        version: kernel.version,
      }),
      clock: document.clock as Readonly<Record<string, number>>,
    });
  },
};
