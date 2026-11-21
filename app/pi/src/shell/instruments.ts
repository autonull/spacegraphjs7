import type { RenderNode } from '@spacegraphjs/renderer';
import type { InstrumentID } from 'spacegraphjs/widgets';

const PAIRS: Readonly<Record<string, readonly InstrumentID[]>> = {
    error: ['status', 'logtail'],
    approval: ['status', 'controls'],
    artifact: ['diff', 'status'],
    file: ['diff', 'status'],
    run: ['sparkline', 'meter'],
    unit: ['sparkline', 'meter'],
    message: ['status', 'logtail'],
    tool: ['status', 'logtail'],
    'read-tool': ['status', 'logtail'],
};

/** At most two contextual instruments per node; the inspector exposes the full kit on demand. */
export const contextualInstruments = (node: RenderNode): readonly InstrumentID[] =>
    (node.status === 'error' ? 'error' : node.kind) === 'error'
        ? (PAIRS.error ?? [])
        : (PAIRS[node.kind] ?? ['status', 'sparkline']);
