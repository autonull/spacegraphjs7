import type { Kernel } from '@spacegraphjs/kernel';
import { edgePath } from 'spacegraphjs/navigation';

export type ThreadStep = { readonly id: string; readonly via: string; readonly kind: string };

/** Only recorded order and checkpoint edges form a thread; no link is invented. */
const THREAD_KINDS = ['orders', 'checkpoint'] as const;

export const threadFrom = (
    kernel: Pick<Kernel, 'nodes' | 'edges'>,
    id: string,
): readonly ThreadStep[] =>
    edgePath(kernel, id, { kinds: THREAD_KINDS }).map((step) => ({
        id: step.id,
        via: step.via,
        kind: step.kind,
    }));
