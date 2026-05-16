import { createDemoWithNodes, SpaceGraph } from '../framework';

export default async function codeEditorDemo(): Promise<SpaceGraph> {
  const initialCode = `// SpaceGraphJS System Application
import { Graph } from 'spacegraphjs';

export function initializeSystem(graph: Graph) {
    console.log("System initializing...");
    const rootNode = graph.addNode({
        id: 'sys-root',
        type: 'ShapeNode',
        label: 'Kernel'
    });

    return rootNode;
}
`;

  const pythonCode = `def fibonacci(n):
    if n <= 0:
        return []
    elif n == 1:
        return [0]

    sequence = [0, 1]
    while len(sequence) < n:
        next_val = sequence[-1] + sequence[-2]
        sequence.append(next_val)

    return sequence

print(fibonacci(10))
`;

  const nodes = [
    {
      id: 'editor-1',
      type: 'CodeEditorNode',
      label: 'SystemKernel.ts',
      position: [-400, 0, 0],
      data: {
        width: 500,
        height: 350,
        language: 'typescript',
        theme: 'vs-dark',
        code: initialCode,
      },
    },
    {
      id: 'editor-2',
      type: 'CodeEditorNode',
      label: 'algorithm.py',
      position: [400, 0, 0],
      data: {
        width: 450,
        height: 300,
        language: 'python',
        theme: 'vs', // Light theme demo
        code: pythonCode,
      },
    },
    {
      id: 'note-1',
      type: 'NoteNode',
      label: 'Instructions',
      position: [0, 250, 0],
      data: {
        text: 'Both of these editors are fully functional Monaco instances.\nYou can click into them, type, select text, and use keyboard shortcuts.',
        width: 300,
        color: '#334155',
        textColor: '#f1f5f9',
      },
    },
  ];

  const edges = [
    { id: 'e1', source: 'note-1', target: 'editor-1', type: 'CurvedEdge' },
    { id: 'e2', source: 'note-1', target: 'editor-2', type: 'CurvedEdge' },
  ];

  return await createDemoWithNodes(nodes, edges);
}
