import type { RenderModel } from '@spacegraphjs/renderer';

/**
 * P8.6: a small, host-neutral activity model — the kind any agent UI (not only OpenCode) builds.
 * It exercises HTML cards, tool calls, an artifact, a failure, and a retry, so the shared contract
 * and the static SVG renderer are proven against something a second host would actually produce.
 */
export function activityHostFixture(): RenderModel {
  return {
    nodes: [
      { id: 'session', kind: 'session', label: 'Refactor billing', shape: 'panel', status: 'neutral', position: [0, 0, 0] },
      {
        id: 'tool:search',
        kind: 'tool',
        label: 'search',
        summary: 'grep invoices',
        shape: 'card',
        status: 'success',
        position: [320, 0, 0],
        html: card('search', 'grep invoices'),
      },
      {
        id: 'tool:edit',
        kind: 'tool',
        label: 'edit',
        shape: 'card',
        status: 'success',
        position: [640, 0, 0],
        html: card('edit', 'src/billing/invoice.ts'),
      },
      {
        id: 'artifact:invoice',
        kind: 'artifact',
        label: 'src/billing/invoice.ts',
        shape: 'card',
        status: 'success',
        position: [640, 112, 0],
      },
      {
        id: 'tool:test',
        kind: 'tool',
        label: 'test',
        shape: 'card',
        status: 'error',
        position: [960, 0, 0],
        html: card('test', 'assertion failed'),
      },
      {
        id: 'error:1',
        kind: 'error',
        label: 'expected 2 to equal 3',
        shape: 'badge',
        status: 'error',
        position: [960, 56, 0],
      },
      { id: 'retry:1', kind: 'retry', label: 'retry #1', shape: 'badge', status: 'warning', position: [1280, 0, 0] },
      {
        id: 'tool:test2',
        kind: 'tool',
        label: 'test',
        shape: 'card',
        status: 'success',
        position: [1560, 0, 0],
        html: card('test', '12 passed'),
      },
    ],
    edges: [
      { id: 'e1', source: 'session', target: 'tool:search', kind: 'sequence', confidence: 'explicit', directed: true },
      { id: 'e2', source: 'tool:search', target: 'tool:edit', kind: 'sequence', confidence: 'explicit', directed: true },
      { id: 'e3', source: 'tool:edit', target: 'artifact:invoice', kind: 'produces', confidence: 'explicit', directed: true },
      { id: 'e4', source: 'tool:edit', target: 'tool:test', kind: 'sequence', confidence: 'explicit', directed: true },
      { id: 'e5', source: 'tool:test', target: 'error:1', kind: 'produces', confidence: 'explicit', directed: true },
      {
        id: 'e6',
        source: 'error:1',
        target: 'retry:1',
        kind: 'evidence',
        confidence: 'structural',
        directed: true,
      },
      { id: 'e7', source: 'retry:1', target: 'tool:test2', kind: 'sequence', confidence: 'explicit', directed: true },
    ],
  };
}

function card(title: string, body: string): string {
  return `<div style="display:flex;flex-direction:column;gap:2px;padding:8px 10px"><b>${title}</b><span>${body}</span></div>`;
}
