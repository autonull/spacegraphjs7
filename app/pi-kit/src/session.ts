import { Kernel, SessionKernel, WorkspaceKernel, type KernelOp } from '@spacegraphjs/kernel';
import { opID } from './ops';

export type ViewState = {
    readonly selection?: string;
    readonly focus?: string;
    readonly camera: { readonly zoom: number; readonly center: readonly [number, number, number] };
    readonly band?: string;
    readonly transcriptScroll: number;
};

export const initialViewState = (): ViewState => ({
    camera: { zoom: 1, center: [0, 0, 0] },
    transcriptScroll: 0,
});

export type Tab = {
    readonly id: string;
    readonly session: SessionKernel;
    readonly view: ViewState;
};

export const tabKernel = (tab: Tab): Kernel => tab.session.state();

/** One registry of conversation views; a tab switch restores state instead of remounting a session. */
export class TabRegistry {
    readonly #tabs = new Map<string, Tab>();
    #active = '';

    constructor(tabs: readonly Tab[] = [], active?: string) {
        for (const tab of tabs) this.#tabs.set(tab.id, tab);
        this.#active = active ?? tabs[0]?.id ?? '';
    }

    list(): readonly Tab[] {
        return [...this.#tabs.values()];
    }

    get(id: string): Tab | undefined {
        return this.#tabs.get(id);
    }

    active(): Tab | undefined {
        return this.#tabs.get(this.#active);
    }

    activeID(): string {
        return this.#active;
    }

    add(id: string, ops: readonly KernelOp[] = []): Tab {
        const tab: Tab = {
            id,
            session: new SessionKernel({ entries: ops.map((op) => ({ id: opID(op), op })) }),
            view: initialViewState(),
        };
        this.#tabs.set(id, tab);
        if (!this.#active) this.#active = id;
        return tab;
    }

    setActive(id: string): boolean {
        if (!this.#tabs.has(id)) return false;
        this.#active = id;
        return true;
    }

    append(id: string, op: KernelOp, at?: number): Tab {
        const current = this.#tabs.get(id);
        if (!current) return this.add(id, [op]);
        const next: Tab = {
            ...current,
            session: current.session.append({ id: opID(op), op, at }),
        };
        this.#tabs.set(id, next);
        return next;
    }

    setView(id: string, view: ViewState): void {
        const current = this.#tabs.get(id);
        if (!current) return;
        this.#tabs.set(id, { ...current, view });
    }

    fork(fromID: string, toID: string, version?: number): Tab | undefined {
        const from = this.#tabs.get(fromID);
        if (!from) return undefined;
        const at = version ?? from.session.version;
        const tab: Tab = {
            id: toID,
            session: from.session.fork(at).tag('forkedFrom'),
            view: initialViewState(),
        };
        this.#tabs.set(toID, tab);
        return tab;
    }

    /** All tabs composed into one workspace view, for the overview and export. */
    workspace(): WorkspaceKernel {
        return this.list().reduce(
            (workspace, tab) => workspace.merge(WorkspaceKernel.from(tabKernel(tab))),
            WorkspaceKernel.from(new Kernel()),
        );
    }

    snapshot(): { active: string; tabs: readonly { id: string; view: ViewState }[] } {
        return {
            active: this.#active,
            tabs: this.list().map((tab) => ({ id: tab.id, view: tab.view })),
        };
    }
}
