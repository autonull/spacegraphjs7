import { describe, expect, test } from 'bun:test';
import { defineDeriver, inputToken, pipe, runPipeline } from './deriver';
import { randomKernel } from './generator';
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

describe('Deriver memoization', () => {
  const counter = () => ({ count: 0 });

  const tokenDeriver = (
    name: string,
    token: ReturnType<typeof inputToken<string>>,
    executions: { count: number },
  ) =>
    defineDeriver({
      name,
      inputs: [token],
      derive: (kernel, inputs) => {
        executions.count += 1;
        return kernel.modify((builder) => {
          builder.nodes.set(name, {
            id: name,
            kind: 'node',
            label: String(inputs[token.key]),
          });
        });
      },
    });

  const pipeline = () => {
    const a = counter();
    const b = counter();
    const c = counter();
    return {
      a,
      b,
      c,
      derivers: [
        tokenDeriver('a', inputToken<string>('a'), a),
        tokenDeriver('b', inputToken<string>('b'), b),
        tokenDeriver('c', inputToken<string>('c'), c),
      ],
    };
  };

  test('a partial re-run after one token changes equals a full re-run', () => {
    const { derivers } = pipeline();
    const memo = new Map();
    const first = { a: 'a1', b: 'b1', c: 'c1' };
    const changed = { a: 'a1', b: 'b2', c: 'c1' };
    const versions = { a: 1, b: 1, c: 1 };
    const changedVersions = { a: 1, b: 2, c: 1 };

    runPipeline(derivers, new Kernel(), first, versions, memo);
    const partial = runPipeline(derivers, new Kernel(), changed, changedVersions, memo);
    const full = runPipeline(derivers, new Kernel(), changed, changedVersions);

    expect(partial.nodes).toEqual(full.nodes);
    expect(partial.version).toBe(full.version);
  });

  test('derivers whose tokens did not change execute zero times', () => {
    const { a, b, c, derivers } = pipeline();
    const memo = new Map();
    const first = { a: 'a1', b: 'b1', c: 'c1' };
    const changed = { a: 'a1', b: 'b1', c: 'c2' };

    runPipeline(derivers, new Kernel(), first, { a: 1, b: 1, c: 1 }, memo);
    const partial = runPipeline(derivers, new Kernel(), changed, { a: 1, b: 1, c: 2 }, memo);

    expect([a.count, b.count, c.count]).toEqual([1, 1, 2]);
    expect(partial.nodes).toEqual(
      runPipeline(derivers, new Kernel(), changed, { a: 1, b: 1, c: 2 }).nodes,
    );
  });

  test('memo entries stay stable across kernel versions', () => {
    const { a, b, c, derivers } = pipeline();
    const memo = new Map();
    const inputs = { a: 'a1', b: 'b1', c: 'c1' };
    const versions = { a: 1, b: 1, c: 1 };

    const first = runPipeline(derivers, new Kernel(), inputs, versions, memo);
    runPipeline(derivers, new Kernel({ nodes: [], edges: [], hyperedges: [], version: 9 }), inputs, versions, memo);
    const repeated = runPipeline(derivers, new Kernel(), inputs, versions, memo);

    expect([a.count, b.count, c.count]).toEqual([2, 2, 2]);
    expect(repeated.nodes).toEqual(first.nodes);
  });

  test('memo soundness holds on seeded generated kernels', () => {
    for (let seed = 0; seed < 5; seed += 1) {
      const { derivers } = pipeline();
      const memo = new Map();
      const versions = { a: 1, b: seed + 2, c: 1 };
      const inputs = { a: `a${seed}`, b: `b${seed}`, c: `c${seed}` };

      runPipeline(derivers, randomKernel(seed), { a: `a${seed}`, b: 'old', c: `c${seed}` }, { a: 1, b: 1, c: 1 }, memo);
      const partial = runPipeline(derivers, randomKernel(seed), inputs, versions, memo);
      const full = runPipeline(derivers, randomKernel(seed), inputs, versions);

      expect(partial.nodes).toEqual(full.nodes);
    }
  });
});
