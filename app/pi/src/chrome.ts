import { el } from './dom';

const PULLDOWNS = ['proof-menu', 'settings-menu'] as const;

/** Layer ARIA and keyboard dismissal over native details without changing the shell's hooks. */
export function installPulldowns(): void {
    const menus = PULLDOWNS.flatMap((id) => {
        const menu = document.getElementById(id);
        if (!(menu instanceof HTMLDetailsElement)) return [];
        const summary = menu.querySelector<HTMLElement>(':scope > summary');
        if (!summary) return [];
        summary.setAttribute('aria-expanded', String(menu.open));
        menu.addEventListener('toggle', () =>
            summary.setAttribute('aria-expanded', String(menu.open)),
        );
        menu.addEventListener('keydown', (event) => {
            if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
            const focusable = [...menu.querySelectorAll<HTMLElement>('button, select, a[href]')];
            const step = event.key === 'ArrowDown' ? 1 : -1;
            const index = focusable.indexOf(document.activeElement as HTMLElement);
            event.preventDefault();
            if (index < 0) {
                focusable[step > 0 ? 0 : focusable.length - 1]?.focus();
                return;
            }
            focusable[(index + step + focusable.length) % focusable.length]?.focus();
        });
        return [{ menu, summary }];
    });

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        const open = menus.find((entry) => entry.menu.open);
        if (!open) return;
        event.preventDefault();
        open.menu.open = false;
        open.summary.focus();
    });
    document.addEventListener('pointerdown', (event) => {
        for (const { menu } of menus) {
            if (menu.open && !menu.contains(event.target as Node)) menu.open = false;
        }
    });
}

/** Host facts the shell chrome reads and the effects its navigation actions trigger. */
export interface ChromeHost {
    surface(): string;
    resize(): void;
    record(kind: string, meta: Readonly<Record<string, string | number | boolean>>): void;
}

/** The catalog, rail and secondary indexes: one place for the shell's show/hide and focus logic. */
export class ChromeController {
    constructor(private readonly host: ChromeHost) {}

    toggleCatalog(open?: boolean): boolean {
        const next = open ?? document.body.dataset.catalog !== 'open';
        document.body.dataset.catalog = next ? 'open' : 'closed';
        const panel = document.getElementById('catalog-panel');
        if (panel instanceof HTMLDetailsElement) panel.open = next;
        this.host.resize();
        this.host.record('catalog:toggle', { open: next });
        return next;
    }

    toggleRail(open?: boolean): boolean {
        const next = open ?? (document.body.dataset.rail ?? 'open') === 'closed';
        document.body.dataset.rail = next ? 'open' : 'closed';
        this.host.resize();
        this.host.record('rail:toggle', { open: next });
        return next;
    }

    /** The one navigation drawer stays closed at boot; every secondary index reopens through it. */
    primaryIndex(): 'transcript' | 'graph' {
        return this.host.surface() === 'map' ? 'graph' : 'transcript';
    }

    openNavigate(): boolean {
        this.toggleRail(true);
        const drawer = el<HTMLDetailsElement>('rail-navigate');
        drawer.open = true;
        drawer.querySelector<HTMLElement>('summary')?.focus();
        this.host.record('navigate:open', { index: 'drawer' });
        return true;
    }

    openIndex(id: string): boolean {
        this.openNavigate();
        const target = el(id);
        target.scrollIntoView({ block: 'nearest' });
        target.querySelector<HTMLElement>('button, [tabindex]')?.focus();
        this.host.record('navigate:open', { index: id });
        return true;
    }

    /** One panel at a time in the readable rail; the strip keeps all four one click away. */
    openRailPanel(id: string): boolean {
        this.toggleRail(true);
        for (const group of document.querySelectorAll<HTMLDetailsElement>('#rail > details'))
            group.open = false;
        const target = document.getElementById(id);
        if (!(target instanceof HTMLDetailsElement)) return false;
        target.open = true;
        target.scrollIntoView({ block: 'nearest' });
        target.querySelector<HTMLElement>('summary')?.focus();
        for (const button of document.querySelectorAll<HTMLButtonElement>('#rail-strip button'))
            button.setAttribute('aria-pressed', String(button.dataset.railPanel === id));
        this.host.record('rail:open', { panel: id });
        return true;
    }

    /** The gallery and Reference entry points share one canonical question list in the catalog. */
    openQuestions(): boolean {
        this.toggleCatalog(true);
        const panel = el<HTMLDetailsElement>('catalog-panel');
        panel.open = true;
        const group = document.querySelector<HTMLElement>('#catalog [data-group="questions"]');
        if (!group) return false;
        for (const card of group.querySelectorAll<HTMLDetailsElement>('.catalog-card'))
            card.open = true;
        group.querySelector<HTMLAnchorElement>('[data-question]')?.focus();
        group.scrollIntoView({ block: 'nearest' });
        this.host.record('catalog:questions', {});
        return true;
    }
}
