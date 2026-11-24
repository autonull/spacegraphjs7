export type Tone = 'accent' | 'ok' | 'warn' | 'error' | 'muted';

const STATUS_TONE: Readonly<Record<string, Tone>> = {
    active: 'accent',
    running: 'accent',
    streaming: 'accent',
    sleeping: 'warn',
    waiting: 'warn',
    pending: 'warn',
    complete: 'ok',
    settled: 'ok',
    done: 'ok',
    failed: 'error',
    error: 'error',
    aborted: 'error',
};

const KIND_TONE: Readonly<Record<string, Tone>> = {
    conversation: 'accent',
    task: 'warn',
    boundary: 'muted',
    config: 'muted',
    artifact: 'muted',
};

/** Semantic tone for a node's status first, then its kind; never a raw colour from the host. */
export const toneOf = (kind: string, status?: string): Tone =>
    (status && STATUS_TONE[status]) || KIND_TONE[kind] || 'muted';
