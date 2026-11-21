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
    host.setClientID(clientID);

    if (new URLSearchParams(location.search).get('scenario') !== 'rich') {
        const events = new EventSource(`/events?client=${clientID}`);
        events.onmessage = (event) => host.consume(decodeOp(event.data as string));
    }

    el<HTMLFormElement>('prompt-form').addEventListener('submit', async (submit) => {
        submit.preventDefault();
        const input = el<HTMLInputElement>('prompt-input');
        const text = input.value.trim();
        if (!text) return;
        input.value = '';
        const mode = el<HTMLSelectElement>('prompt-mode').value;
        const result = await host.sendPrompt(text, mode ? (mode as 'steer' | 'followUp') : undefined);
        if (!result.ok) showError(result.error ?? 'prompt failed');
    });

    Object.assign(window, { __pi: host.hooks() });
};

void boot();
