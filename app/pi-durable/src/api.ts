export type Health = {
    readonly ok: boolean;
    readonly storage: string;
    readonly provider: string;
    readonly providerMode?: string;
    readonly model?: string;
    readonly providerError?: { readonly error: string; readonly recovery: string };
    readonly conversations: number;
    readonly sleepingTasks: number;
    readonly recovered: number;
    readonly observer?: boolean;
    readonly readOnly?: boolean;
    readonly observerURL?: string | null;
    readonly capabilities?: { readonly codemode: boolean; readonly images: boolean };
};

export type ConversationInfo = {
    readonly id: string;
    readonly status: string;
    readonly agent: unknown;
};

export type Scenario = { readonly id: string; readonly question: string; readonly description: string };

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
