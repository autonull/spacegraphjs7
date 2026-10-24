import { Kernel } from '../kernel';
import type { Edge, Node } from '../kernel';

export const buildExampleKernel = (): Kernel => {
  const nodes: Node[] = [
    { id: 'org:acme', kind: 'org', label: 'Acme' },
    { id: 'org:globex', kind: 'org', label: 'Globex' },
    { id: 'project:website', kind: 'project', label: 'Website' },
    { id: 'project:api', kind: 'project', label: 'API' },
    { id: 'task:design', kind: 'task', label: 'Design landing page' },
    { id: 'task:auth', kind: 'task', label: 'Implement auth' },
  ];
  const edges: Edge[] = [
    { id: 'owns:acme:website', kind: 'owns', source: 'org:acme', target: 'project:website' },
    { id: 'owns:globex:api', kind: 'owns', source: 'org:globex', target: 'project:api' },
    {
      id: 'contains:website:design',
      kind: 'contains',
      source: 'project:website',
      target: 'task:design',
    },
    {
      id: 'contains:api:auth',
      kind: 'contains',
      source: 'project:api',
      target: 'task:auth',
    },
  ];
  return new Kernel({ nodes, edges, hyperedges: [] });
};
