import { ANATOMY_KINDS, anatomyCard } from './anatomy';
import { registerCardTemplate } from './adapter';
import { PiHost, el } from './host';
import { decodeOp } from './ops';
import { installShellTokens } from './shell';

ANATOMY_KINDS.forEach((kind) => registerCardTemplate(kind, anatomyCard));
installShellTokens(document);
const clientID = crypto.randomUUID();
const host = new PiHost();

const showError = (message: string): void => {
    const item = document.createElement('li');
    item.textContent = message;
    el('evidence').replaceChildren(item);
};

const boot = async (): Promise<void> => {
    const params = new URLSearchParams(location.search);
    const shotID = params.get('shot');
    await host.mount(el('canvas'));
    host.setClientID(clientID);
    if (shotID) host.applyShot(shotID);
    const uiID = params.get('ui');
    if (uiID) host.applyUIPreset(uiID);

    if (!shotID && params.get('scenario') !== 'rich') {
        host.setFrame('pending');
        const events = new EventSource(`/events?client=${clientID}`);
        events.onopen = () => host.setFrame(null);
        events.onerror = () => host.setFrame('failed', 'The event stream stopped. Reload to reconnect.');
        events.onmessage = (event) => host.consume(decodeOp(event.data as string));
    }

    el<HTMLFormElement>('prompt-form').addEventListener('submit', async (submit) => {
        submit.preventDefault();
        const input = el<HTMLInputElement>('prompt-input');
        const text = input.value.trim();
        if (!text) return;
        input.value = '';
        const mode = el<HTMLSelectElement>('prompt-mode').value;
        const result = await host.sendPrompt(
            text,
            mode ? (mode as 'steer' | 'followUp') : undefined,
        );
        if (!result.ok) showError(result.error ?? 'prompt failed');
    });

    Object.assign(window, { __pi: host.hooks() });
};

void boot();
