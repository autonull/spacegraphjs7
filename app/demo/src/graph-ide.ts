import {
    changeOrigins,
    dataString,
    roleOf,
    symbolDependents,
    type FileSystemView,
} from '@spacegraphjs/filesystem';

export type IdeFile = {
    readonly id: string;
    readonly label: string;
    readonly path: string;
    readonly change?: string;
};

export type IdeChange = {
    readonly id: string;
    readonly path: string;
    readonly producers: readonly string[];
};

export type IdePanels = {
    readonly files: readonly IdeFile[];
    readonly changes: readonly IdeChange[];
    readonly dependencies: Readonly<Record<string, readonly string[]>>;
};

/** Host-owned panel facts derived from the filesystem domain's selectors. */
export function graphIdePanels(view: FileSystemView): IdePanels {
    const labels = new Map(view.nodes.map((node) => [node.id, node.label]));
    const nameOf = (id: string): string => labels.get(id) ?? id;
    return {
        files: view.nodes
            .filter((node) => roleOf(node) === 'file')
            .map((node) => ({
                id: node.id,
                label: node.label,
                path: dataString(node, 'path') ?? node.label,
                change: view.changeByFile?.get(node.id),
            })),
        changes: changeOrigins(view).map((origin) => ({
            id: origin.id,
            path: origin.path,
            producers: origin.producers.map(nameOf),
        })),
        dependencies: Object.fromEntries(
            view.nodes
                .filter((node) => roleOf(node) === 'symbol')
                .map((node) => [node.id, symbolDependents(view, node.id)]),
        ),
    };
}
