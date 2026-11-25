/** One polite aria-live channel shared by the graph mirror, reading surface and host chrome. */
export type Announcer = {
    announce(message: string): void;
    destroy(): void;
};

const HIDDEN_STYLE =
    'position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;' +
    'clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0;';

/** Adopts an existing region, or owns a visually hidden one appended to the document. */
export const createAnnouncer = (region?: HTMLElement): Announcer => {
    const owned = !region;
    const live = region ?? document.createElement('div');
    if (owned) {
        live.setAttribute('style', HIDDEN_STYLE);
        document.body.append(live);
    }
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    return {
        announce: (message: string): void => {
            live.textContent = message;
        },
        destroy: (): void => {
            live.textContent = '';
            if (owned) live.remove();
        },
    };
};
