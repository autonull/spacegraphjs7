import { PiHost, el } from './host';
import { decodeOp } from './ops';

const clientID = crypto.randomUUID();
const host = new PiHost();

const showError = (message: string): void => {
    const item = document.createElement('li');
    item.textContent = message;
    el('evidence').replaceChildren(item);
};

const boot = async (): Promise<void> => {
    await host.mount(el('canvas'));

    const events = new EventSource(`/events?client=${clientID}`);
    events.onmessage = (event) => host.consume(decodeOp(event.data as string));

    el<HTMLFormElement>('prompt-form').addEventListener('submit', async (submit) => {
        submit.preventDefault();
        const input = el<HTMLInputElement>('prompt-input');
        const text = input.value.trim();
        if (!text) return;
        input.value = '';
        const mode = el<HTMLSelectElement>('prompt-mode').value;
        try {
            const response = await fetch('/prompt', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ client: clientID, text, mode: mode || undefined }),
            });
            if (!response.ok) {
                const body = (await response.json()) as { error?: string };
                showError(body.error ?? `prompt failed (${response.status})`);
            }
        } catch (error) {
            showError(error instanceof Error ? error.message : String(error));
        }
    });

    Object.assign(window, { __pi: host.hooks() });
};

void boot();
