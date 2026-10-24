import type { Kernel } from './kernel';

export type ConformanceIssue = {
  readonly invariant: string;
  readonly message: string;
  readonly id?: string;
};

export type ConformanceRule = (kernel: Kernel) => readonly ConformanceIssue[];

export type ConformanceResult = {
  readonly ok: boolean;
  readonly issues: readonly ConformanceIssue[];
};

export const danglingEdgesRule: ConformanceRule = (kernel) =>
  kernel.diagnostics().danglingEdges.map((id) => ({
    invariant: 'no-dangling-edges',
    message: `Edge ${id} references a missing node`,
    id,
  }));

export const duplicateIDsRule: ConformanceRule = (kernel) => {
  const diagnostics = kernel.diagnostics();
  return [
    ...diagnostics.duplicateNodes.map((id) => ({
      invariant: 'unique-node-ids',
      message: `Node ${id} is duplicated`,
      id,
    })),
    ...diagnostics.duplicateEdges.map((id) => ({
      invariant: 'unique-edge-ids',
      message: `Edge ${id} is duplicated`,
      id,
    })),
  ];
};

export const hyperedgeNodesRule: ConformanceRule = (kernel) =>
  kernel.diagnostics().hyperedgeMissingNodes.map(({ hyperedge, node }) => ({
    invariant: 'hyperedge-nodes-exist',
    message: `Hyperedge ${hyperedge} references missing node ${node}`,
    id: hyperedge,
  }));

export const defaultConformanceRules: readonly ConformanceRule[] = [
  danglingEdgesRule,
  duplicateIDsRule,
  hyperedgeNodesRule,
];

export const runConformance = (
  kernel: Kernel,
  rules: readonly ConformanceRule[] = defaultConformanceRules,
): ConformanceResult => {
  const issues = rules.flatMap((rule) => rule(kernel));
  return { ok: issues.length === 0, issues };
};
