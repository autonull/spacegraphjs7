import { errorMessage } from 'pi-kit';

import { ANATOMY_KINDS, anatomyCard } from './anatomy';
import { registerCardTemplate } from './adapter';
import { PiHost, el } from './host';
import { renderEvidence } from './index-views';
import { decodeOp } from './ops';
import { installShellTokens } from './shell';

ANATOMY_KINDS.forEach((kind) => registerCardTemplate(kind, anatomyCard));
installShellTokens(document);
const clientID = crypto.randomUUID();
const host = new PiHost();

const showError = (message: string): void => {
    renderEvidence([message]);
    host.announce(message);
};

const boot = async (): Promise<void> => {
    const params = new URLSearchParams(location.search);
    let shotID = params.get('shot');
    await host.mount(el('canvas'));
    host.setClientID(clientID);
    if (shotID && !host.applyShot(shotID)) {
        showError(`Unknown view "${shotID}" — showing the live graph instead.`);
        shotID = null;
    }
    const uiID = params.get('ui');
    if (uiID && !host.applyUIPreset(uiID))
        showError(`Unknown UI preset "${uiID}" — using the default.`);

    if (!shotID && params.get('scenario') !== 'rich') {
        host.setFrame('pending');
        const events = new EventSource(`/events?client=${clientID}`);
        events.onopen = () => host.setFrame(null);
        events.onerror = () => {
            host.setFrame('failed', 'The event stream stopped — reconnecting.');
            host.announce('Event stream stopped — reconnecting.');
        };
        events.onmessage = (event) => host.consume(decodeOp(event.data as string));
    }

    el<HTMLFormElement>('prompt-form').addEventListener('submit', async (submit) => {
        submit.preventDefault();
        const input = el<HTMLInputElement>('prompt-input');
        const button = el<HTMLButtonElement>('prompt-send');
        const text = input.value.trim();
        if (!text || button.disabled) return;
        input.value = '';
        button.disabled = true;
        button.textContent = 'Sending…';
        const mode = el<HTMLSelectElement>('prompt-mode').value;
        try {
            const result = await host.sendPrompt(
                text,
                mode ? (mode as 'steer' | 'followUp') : undefined,
            );
            if (!result.ok) {
                input.value = text;
                showError(result.error ?? 'prompt failed');
            }
        } catch (error) {
            input.value = text;
            showError(errorMessage(error));
        } finally {
            button.disabled = false;
            button.textContent = 'Send';
        }
    });

    Object.assign(window, { __pi: host.hooks() });
};

void boot();
