export type Health = {
    readonly ok: boolean;
    readonly storage: string;
    readonly provider: string;
    readonly conversations: number;
    readonly sleepingTasks: number;
    readonly recovered: number;
};

export type ConversationInfo = {
    readonly id: string;
    readonly status: string;
    readonly agent: unknown;
};

export type Scenario = { readonly id: string; readonly question: string; readonly description: string };

export type APIResult = { readonly ok: boolean; readonly error?: string; readonly recovery?: string };

const parse = async <T>(response: Response): Promise<T> => {
    if (!response.ok) {
        const body = (await response.json()) as { error?: string; recovery?: string };
        throw new Error(`${body.error ?? `HTTP ${response.status}`}${body.recovery ? ` — ${body.recovery}` : ''}`);
    }
    return (await response.json()) as T;
};

export const getJSON = <T>(path: string): Promise<T> => fetch(path).then((response) => parse<T>(response));

export const postJSON = <T>(path: string, body: object = {}): Promise<T> =>
    fetch(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    }).then((response) => parse<T>(response));

export const exportURL = (format: string, id: string): string => `/api/export?format=${format}&id=${id}`;
