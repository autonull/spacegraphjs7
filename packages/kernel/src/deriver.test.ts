import { describe, expect, test } from 'bun:test';
import { defineDeriver, inputToken, pipe, runPipeline } from './deriver';
import { Kernel } from './kernel';

const addNode = (id: string, token = inputToken<string>(`node:${id}`)) =>
  defineDeriver({
    name: `add-${id}`,
    inputs: [token],
    derive: (kernel) =>
      kernel.modify((builder) => {
        builder.nodes.set(id, { id, kind: 'node', label: id });
      }),
  });

describe('Deriver', () => {
  test('a deriver receives the kernel and inputs', () => {
    const seen: unknown[] = [];
    const deriver = defineDeriver({
      name: 'capture',
      inputs: [inputToken<string>('value')],
      derive: (kernel, inputs) => {
        seen.push(inputs.value);
        return kernel;
      },
    });

    runPipeline([deriver], new Kernel(), { value: 'hello' });

    expect(seen).toEqual(['hello']);
  });

  test('pipe composes derivers in order', () => {
    const first = addNode('a');
    const second = addNode('b');
    const composed = pipe(first, second);

    const kernel = composed.derive(new Kernel(), {});

    expect(composed.name).toBe('add-a -> add-b');
    expect(kernel.nodes.map((node) => node.id)).toEqual(['a', 'b']);
    expect(kernel.version).toBe(2);
  });

  test('pipe deduplicates input tokens by key', () => {
    const token = inputToken<string>('shared');
    const composed = pipe(addNode('a', token), addNode('b', token));

    expect(composed.inputs).toEqual([token]);
  });

  test('runPipeline is pipe applied to a kernel', () => {
    const derivers = [addNode('a'), addNode('b')];

    expect(runPipeline(derivers, new Kernel()).nodes.map((node) => node.id)).toEqual(['a', 'b']);
    expect(
      runPipeline(derivers, new Kernel(), { unrelated: true }).nodes.map((node) => node.id),
    ).toEqual(['a', 'b']);
  });
});
