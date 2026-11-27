import type { SourceEvent } from './mapping';

/** A serializable source-code fact set. Produced by a build-time scanner; no compiler API at runtime. */
export interface SourceSnapshot {
    readonly id: string;
    readonly label?: string;
    readonly files: readonly SourceFileRecord[];
}

export const SOURCE_SYMBOL_KINDS = [
    'class',
    'function',
    'interface',
    'type',
    'const',
    'enum',
    'namespace',
] as const;
export type SourceSymbolKind = (typeof SOURCE_SYMBOL_KINDS)[number];

export interface SourceSymbolRecord {
    readonly name: string;
    readonly kind: SourceSymbolKind;
    readonly fileId: string;
    readonly line: number;
    readonly signature: string;
    readonly doc?: string;
    /** Raw `fileId:name` keys of exported symbols this declaration mentions. */
    readonly references?: readonly string[];
}

export interface SourceImportRecord {
    readonly specifier: string;
    /** Raw file id in the same snapshot, or undefined for an external module. */
    readonly fileId?: string;
    readonly names: readonly string[];
    readonly kind: 'import' | 'export';
}

export interface SourceFileRecord {
    /** Host-local stable key, unique inside the snapshot. */
    readonly id: string;
    readonly path: string;
    readonly packageId: string;
    readonly symbols: readonly SourceSymbolRecord[];
    readonly imports: readonly SourceImportRecord[];
}

/** The single id convention shared by the snapshot scanner, mapper and selectors. */
export const sourceID = (...parts: readonly (string | undefined)[]): string =>
    ['source', ...parts.filter((part): part is string => Boolean(part))].join(':');

/** Turns a snapshot into mapper events. Unknown or external references are dropped here. */
export function snapshotEvents(snapshot: SourceSnapshot): readonly SourceEvent[] {
    const packages = new Set(snapshot.files.map((file) => file.packageId));
    const events: SourceEvent[] = [...packages].map((packageId) => ({
        type: 'package',
        packageId,
        label: packageId,
    }));
    const symbols = new Map<string, string>();
    const filePackages = new Map(snapshot.files.map((file) => [file.id, file.packageId]));
    for (const file of snapshot.files) {
        events.push({ type: 'file', packageId: file.packageId, fileId: file.id, path: file.path });
        for (const symbol of file.symbols) {
            const key = `${file.id}:${symbol.name}`;
            symbols.set(key, sourceID(snapshot.id, file.packageId, file.id, symbol.name));
            events.push({
                type: 'symbol',
                ...symbol,
                packageId: file.packageId,
                fileId: file.id,
                path: file.path,
            });
        }
    }
    for (const file of snapshot.files) {
        const from = sourceID(snapshot.id, file.packageId, file.id);
        for (const entry of file.imports) {
            if (!entry.fileId) continue;
            const target = sourceID(
                snapshot.id,
                filePackages.get(entry.fileId) ?? file.packageId,
                entry.fileId,
            );
            events.push({
                type: 'edge',
                kind: entry.kind === 'import' ? 'imports' : 'exports',
                source: from,
                target,
            });
        }
        for (const symbol of file.symbols) {
            const fromSymbol = symbols.get(`${file.id}:${symbol.name}`);
            if (!fromSymbol) continue;
            for (const reference of symbol.references ?? []) {
                const target = symbols.get(reference);
                if (!target || target === fromSymbol) continue;
                events.push({ type: 'edge', kind: 'references', source: fromSymbol, target });
            }
        }
    }
    return events;
}
