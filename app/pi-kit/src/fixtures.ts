import type { AgentEvent } from '@spacegraphjs/agent';

const at = (value?: number): { readonly at?: number } => (value === undefined ? {} : { at: value });

export const runStart = (runID: string, time?: number): AgentEvent => ({
    type: 'run-start',
    runId: runID,
    ...at(time),
});

export const runSettled = (runID: string, time?: number): AgentEvent => ({
    type: 'run-settled',
    runId: runID,
    ...at(time),
});

export const message = (
    runID: string,
    id: string,
    role: 'user' | 'assistant',
    text: string,
    time?: number,
): AgentEvent => ({ type: 'message', runId: runID, id, role, text, final: true, ...at(time) });

export const action = (
    runID: string,
    id: string,
    toolName: string,
    phase: 'start' | 'end',
    time?: number,
): AgentEvent => ({ type: 'action', runId: runID, id, toolName, phase, ...at(time) });

export const state = (runID: string, reason: string, detail?: string): AgentEvent => ({
    type: 'state',
    runId: runID,
    id: reason,
    reason,
    ...(detail ? { level: detail } : {}),
});
