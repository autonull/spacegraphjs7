import { escapeHtml } from '@spacegraphjs/adapter';

export type FrameState = 'empty' | 'pending' | 'failed';

export interface StateFrame {
    readonly element: HTMLElement;
    set(state: FrameState | null, detail?: string): void;
}

const COPY: Readonly<Record<FrameState, readonly [string, string]>> = {
    empty: ['No nodes yet', 'Waiting for the first event.'],
    pending: ['Waiting for events', 'The live stream is connecting…'],
    failed: ['Event source unavailable', 'The stream stopped. Check the connection and reload.'],
};

/** Domain-neutral markup for the three non-happy-path frames. */
export const stateFrameMarkup = (state: FrameState, detail = ''): string => {
    const [title, fallback] = COPY[state];
    return `<div class="state-frame-card" role="status" aria-live="polite"><strong>${title}</strong><span>${escapeHtml(detail || fallback)}</span></div>`;
};

/** One centered frame over the canvas; hidden whenever the graph has content. */
export const createStateFrame = (): StateFrame => {
    const element = document.createElement('div');
    element.id = 'state-frame';
    element.hidden = true;
    return {
        element,
        set(state, detail) {
            if (!state) {
                element.hidden = true;
                return;
            }
            element.dataset.state = state;
            element.innerHTML = stateFrameMarkup(state, detail);
            element.hidden = false;
        },
    };
};
