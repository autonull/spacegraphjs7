export type NodeKindRegistration = {
  readonly label?: string;
  readonly description?: string;
};

export type EdgeKindRegistration = {
  readonly label?: string;
  readonly description?: string;
};

export type ActionRegistration = {
  readonly id: string;
  readonly label: string;
  readonly kind?: string;
};

export type Registry = {
  readonly nodeKinds: Readonly<Record<string, NodeKindRegistration>>;
  readonly edgeKinds: Readonly<Record<string, EdgeKindRegistration>>;
  readonly actions: Readonly<Record<string, ActionRegistration>>;
};

export const createRegistry = (partial: Partial<Registry> = {}): Registry => ({
  nodeKinds: { ...partial.nodeKinds },
  edgeKinds: { ...partial.edgeKinds },
  actions: { ...partial.actions },
});

export const composeRegistry = (
  ...registries: readonly (Registry | undefined)[]
): Registry => {
  const nodeKinds: Record<string, NodeKindRegistration> = {};
  const edgeKinds: Record<string, EdgeKindRegistration> = {};
  const actions: Record<string, ActionRegistration> = {};
  for (const registry of registries) {
    if (!registry) continue;
    Object.assign(nodeKinds, registry.nodeKinds);
    Object.assign(edgeKinds, registry.edgeKinds);
    Object.assign(actions, registry.actions);
  }
  return { nodeKinds, edgeKinds, actions };
};
