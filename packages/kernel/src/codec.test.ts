import { describe, expect, test } from 'bun:test';
import { KernelCodec, KERNEL_FORMAT } from './codec';
import { Kernel } from './kernel';
import { SessionKernel } from './session';
import { WorkspaceKernel } from './workspace';

const kernel = new Kernel({
  nodes: [
    { id: 'a', kind: 'node', label: 'A' },
    { id: 'b', kind: 'node', label: 'B' },
  ],
  edges: [{ id: 'e1', kind: 'edge', source: 'a', target: 'b' }],
  hyperedges: [{ id: 'h1', kind: 'hyperedge', nodes: ['a', 'b'] }],
  version: 4,
});

describe('KernelCodec', () => {
  test('round-trips a kernel', () => {
    const encoded = KernelCodec.encode(kernel);
    const decoded = KernelCodec.decode(encoded);

    expect(decoded.version).toBe(4);
    expect(decoded.nodes).toEqual(kernel.nodes);
    expect(decoded.edges).toEqual(kernel.edges);
    expect(decoded.hyperedges).toEqual(kernel.hyperedges);
  });

  test('round-trips a session with tags and fork metadata', () => {
    const session = new SessionKernel({
      entries: [{ id: 'e1', op: { op: 'add-node', node: kernel.nodes[0]! } }],
      version: 3,
      tags: { start: 3 },
      forkedFrom: 1,
    });
    const decoded = KernelCodec.decodeSession(KernelCodec.encodeSession(session));

    expect(decoded.version).toBe(3);
    expect(decoded.entries).toEqual(session.entries);
    expect(decoded.tags.get('start')).toBe(3);
    expect(decoded.forkedFrom).toBe(1);
  });

  test('round-trips a workspace with its clock', () => {
    const workspace = new WorkspaceKernel({
      kernel,
      clock: { 'node:a': 2, 'edge:e1': 1 },
    });
    const decoded = KernelCodec.decodeWorkspace(KernelCodec.encodeWorkspace(workspace));

    expect(decoded.kernel.nodes).toEqual(kernel.nodes);
    expect(decoded.clock.get('node:a')).toBe(2);
    expect(decoded.clock.get('edge:e1')).toBe(1);
  });

  test('rejects unknown formats with a clear message', () => {
    expect(() => KernelCodec.decode('{"format":2,"kind":"kernel"}')).toThrow(
      `Unsupported kernel format 2 (expected ${KERNEL_FORMAT})`,
    );
  });

  test('rejects a document of the wrong kind', () => {
    expect(() => KernelCodec.decode(KernelCodec.encodeSession(new SessionKernel()))).toThrow(
      'Expected a kernel document',
    );
  });

  test('rejects invalid JSON', () => {
    expect(() => KernelCodec.decode('{')).toThrow('not valid JSON');
  });
});
