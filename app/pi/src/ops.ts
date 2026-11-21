import type { KernelOp } from '@spacegraphjs/kernel';

export { foldKernelOps } from '@spacegraphjs/kernel';

export const encodeOp = (op: KernelOp): string => `data: ${JSON.stringify(op)}\n\n`;

export const decodeOp = (data: string): KernelOp => JSON.parse(data) as KernelOp;
