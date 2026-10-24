import type { Kernel } from './kernel';

export type InputToken<Value = unknown> = {
  readonly key: string;
  readonly __value?: Value;
};

export const inputToken = <Value>(key: string): InputToken<Value> => ({ key });

export type DeriverInputs = Readonly<Record<string, unknown>>;

export type Deriver = {
  readonly name: string;
  readonly inputs: readonly InputToken[];
  readonly derive: (kernel: Kernel, inputs: DeriverInputs) => Kernel;
};

export const defineDeriver = (deriver: Deriver): Deriver => deriver;

const uniqueInputs = (tokens: readonly InputToken[]): InputToken[] => {
  const seen = new Set<string>();
  return tokens.filter((token) => {
    if (seen.has(token.key)) return false;
    seen.add(token.key);
    return true;
  });
};

export const pipe = (...derivers: readonly Deriver[]): Deriver => ({
  name: derivers.map((deriver) => deriver.name).join(' -> '),
  inputs: uniqueInputs(derivers.flatMap((deriver) => deriver.inputs)),
  derive: (kernel, inputs) =>
    derivers.reduce((current, deriver) => deriver.derive(current, inputs), kernel),
});

export type DeriverVersions = Readonly<Record<string, number>>;

export type PipelineMemo = Map<string, Kernel>;

const memoKey = (
  deriver: Deriver,
  prefix: readonly Deriver[],
  kernel: Kernel,
  versions: DeriverVersions,
): string =>
  `${deriver.name}@${kernel.version}|${[...prefix, deriver]
    .flatMap((entry) => entry.inputs)
    .map((token) => `${token.key}:${versions[token.key] ?? 0}`)
    .join(',')}`;

export const runPipeline = (
  derivers: readonly Deriver[],
  kernel: Kernel,
  inputs: DeriverInputs = {},
  versions: DeriverVersions = {},
  memo?: PipelineMemo,
): Kernel => {
  if (!memo) return pipe(...derivers).derive(kernel, inputs);
  return derivers.reduce((current, deriver, index) => {
    const key = memoKey(deriver, derivers.slice(0, index), current, versions);
    const cached = memo.get(key);
    if (cached) return cached;
    const next = deriver.derive(current, inputs);
    memo.set(key, next);
    return next;
  }, kernel);
};
