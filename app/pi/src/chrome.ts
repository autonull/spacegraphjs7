import { el } from './dom';

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
        const next = open ?? document.body.dataset.rail !== 'closed';
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
