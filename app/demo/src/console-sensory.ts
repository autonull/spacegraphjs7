import type { SensoryAdapter } from 'spacegraphjs/world';

export type ConsoleSensoryAdapter = SensoryAdapter & {
    readonly events: readonly string[];
};

/** Host-owned console sink. Proves adapter registration and gating without any device. */
export function createConsoleSensoryAdapter(): ConsoleSensoryAdapter {
    const events: string[] = [];
    return {
        id: 'sound',
        label: 'Console audio',
        events,
        emit(type, detail) {
            events.push(detail === undefined ? type : `${type}:${String(detail)}`);
            console.info(`[demo:sound] ${type}`, detail ?? '');
        },
    };
}
