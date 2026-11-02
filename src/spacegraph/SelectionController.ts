import type { SpaceGraph } from '../SpaceGraph';

export class SelectionController {
    constructor(readonly sg: SpaceGraph) {}

    select(target: string | readonly string[] | null): SpaceGraph {
        this.sg.selection.select(target);
        return this.sg;
    }

    clearSelection(): SpaceGraph {
        this.sg.selection.clear();
        return this.sg;
    }

    toggleSelection(id: string): SpaceGraph {
        this.sg.selection.toggle(id);
        return this.sg;
    }

    deselect(id: string): SpaceGraph {
        this.sg.selection.deselect(id);
        return this.sg;
    }
}
