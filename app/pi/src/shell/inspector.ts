export const INSPECTOR_TABS = ['detail', 'inner', 'signals', 'actions'] as const;
export type InspectorTab = (typeof INSPECTOR_TABS)[number];

export interface Inspector {
    readonly element: HTMLElement;
    readonly slot: HTMLElement;
    readonly signals: HTMLElement;
    readonly tab: InspectorTab;
    readonly pinned: boolean;
    setTab(tab: InspectorTab): void;
    setPinned(pinned: boolean): void;
}

/** A dockable tabbed frame. Content and screen anchoring stay host-owned. */
export const createInspector = (
    onChange?: (tab: InspectorTab, pinned: boolean) => void,
): Inspector => {
    const element = document.createElement('div');
    element.id = 'focus-lens';
    element.className = 'inspector';
    element.dataset.tab = 'detail';
    element.dataset.pinned = 'false';

    const bar = document.createElement('div');
    bar.className = 'inspector-bar';
    const title = document.createElement('span');
    title.className = 'inspector-title';
    title.textContent = 'inspector';
    const tabs = document.createElement('div');
    tabs.className = 'inspector-tabs';
    tabs.setAttribute('role', 'tablist');
    tabs.setAttribute('aria-label', 'Inspector views');
    const pin = document.createElement('button');
    pin.type = 'button';
    pin.id = 'inspector-pin';
    pin.className = 'inspector-pin';
    pin.textContent = 'pin';
    pin.setAttribute('aria-label', 'Pin inspector to corner');
    pin.setAttribute('aria-pressed', 'false');

    const body = document.createElement('div');
    body.className = 'inspector-body';
    body.id = 'inspector-panel';
    body.setAttribute('role', 'tabpanel');
    const slot = document.createElement('div');
    slot.className = 'focus-slot';
    const signals = document.createElement('div');
    signals.className = 'inspector-signals';
    signals.id = 'inspector-instruments';
    body.append(slot, signals);
    bar.append(title, tabs, pin);
    element.append(bar, body);

    let tab: InspectorTab = 'detail';
    let pinned = false;
    const buttons = INSPECTOR_TABS.map((id) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('role', 'tab');
        button.id = `inspector-tab-${id}`;
        button.dataset.tabTarget = id;
        button.textContent = id;
        button.setAttribute('aria-controls', body.id);
        button.addEventListener('click', () => inspector.setTab(id));
        button.addEventListener('keydown', (event) => {
            const rtl = getComputedStyle(tabs).direction === 'rtl';
            const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
            const backward = rtl ? 'ArrowRight' : 'ArrowLeft';
            const step = event.key === forward ? 1 : event.key === backward ? -1 : 0;
            if (!step) return;
            event.preventDefault();
            const next =
                (INSPECTOR_TABS.indexOf(tab) + step + INSPECTOR_TABS.length) %
                INSPECTOR_TABS.length;
            inspector.setTab(INSPECTOR_TABS[next]!);
            buttons[next]?.focus();
        });
        tabs.append(button);
        return button;
    });
    pin.addEventListener('click', () => inspector.setPinned(!pinned));

    const inspector: Inspector = {
        element,
        slot,
        signals,
        get tab() {
            return tab;
        },
        get pinned() {
            return pinned;
        },
        setTab(next: InspectorTab) {
            tab = next;
            element.dataset.tab = next;
            body.setAttribute('aria-labelledby', `inspector-tab-${next}`);
            for (const button of buttons) {
                const selected = button.dataset.tabTarget === next;
                button.setAttribute('aria-selected', String(selected));
                button.tabIndex = selected ? 0 : -1;
            }
            signals.hidden = next !== 'signals';
            onChange?.(tab, pinned);
        },
        setPinned(next: boolean) {
            pinned = next;
            element.dataset.pinned = String(next);
            pin.setAttribute('aria-pressed', String(next));
            pin.textContent = next ? 'unpin' : 'pin';
            pin.setAttribute('aria-label', next ? 'Unpin inspector' : 'Pin inspector to corner');
            onChange?.(tab, pinned);
        },
    };
    inspector.setTab('detail');
    signals.hidden = true;
    return inspector;
};
