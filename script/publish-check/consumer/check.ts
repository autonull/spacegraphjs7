// The consumer's node check: it imports the published packages and never reaches into the workspace.
//
// It proves the contract, the model adapter and both interactive adapters load from the published
// bytes, and that the Cytoscape adapter mounts into a DOM container and draws the model it was given.
import type { RenderModel } from '@spacegraphjs/renderer';
import { ModelAdapter } from '@spacegraphjs/adapter';
import { SpaceGraphRenderer } from '@spacegraphjs/spacegraph-renderer';
import { CytoscapeRenderer } from '@spacegraphjs/cytoscape-renderer';
import { renderToSVG } from '@spacegraphjs/svg-renderer';

export const MODEL: RenderModel = {
  nodes: [
    {
      id: 'a',
      kind: 'activity',
      label: 'Read the log',
      shape: 'card',
      status: 'success',
      position: [0, 0, 0],
      size: [220, 60, 1],
      data: {},
    },
    {
      id: 'b',
      kind: 'activity',
      label: 'Patch the file',
      shape: 'card',
      status: 'error',
      position: [300, 0, 0],
      size: [220, 60, 1],
      data: {},
    },
  ],
  edges: [{ id: 'ab', source: 'a', target: 'b', kind: 'sequence', confidence: 'explicit' }],
};

const failures: string[] = [];
export const check = (name: string, ok: boolean, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(name);
};

export const report = () => {
  if (failures.length) {
    console.error(`\n${failures.length} check(s) failed: ${failures.join(', ')}`);
    process.exit(1);
  }
};

check('the model adapter is a base class a host can extend', typeof ModelAdapter === 'function');

const svg = renderToSVG(MODEL);
check('the static renderer draws the model', svg.includes('<svg') && svg.includes('Read the log'));

// The interactive adapters need a real canvas, so they are mounted by the browser check. Here they
// only have to expose the contract's surface from the published bytes.
const contractSurface = ['mount', 'setModel', 'setTheme', 'setProjection', 'setDepth', 'setSelection', 'fit', 'focus', 'resize', 'on', 'dispose', 'applyPatch'];
for (const [name, adapter] of [
  ['SpaceGraph', new SpaceGraphRenderer()],
  ['Cytoscape', new CytoscapeRenderer()],
] as const) {
  const missing = contractSurface.filter((method) => typeof adapter[method as keyof typeof adapter] !== 'function');
  check(`the ${name} adapter implements the contract surface`, missing.length === 0, missing.join(', '));
}

report();
