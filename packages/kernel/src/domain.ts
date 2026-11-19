import type { Kernel } from './kernel';
import type { GraphViewData } from './sub-layout';

/** Minimal shape a domain contributes to the capability manifest. Structurally matches ManifestEntry. */
export interface DomainManifestEntry {
    readonly id: string;
    readonly values: readonly string[];
    readonly source: string;
    readonly capability?: string;
}

/** Optional semantic capabilities a domain may expose. No field is required. */
export interface DomainVocabulary {
    readonly lanes?: readonly string[];
    readonly levels?: readonly string[];
    readonly laneOf?: (node: {
        readonly kind: string;
        readonly data?: Readonly<Record<string, unknown>>;
    }) => string | undefined;
    readonly scopeIdOf?: (node: {
        readonly kind: string;
        readonly data?: Readonly<Record<string, unknown>>;
    }) => string | undefined;
    readonly shapeOf?: (node: {
        readonly kind: string;
        readonly data?: Readonly<Record<string, unknown>>;
    }) => string | undefined;
    readonly statusOf?: (node: {
        readonly kind: string;
        readonly data?: Readonly<Record<string, unknown>>;
        readonly status?: string;
    }) => string | undefined;
    readonly edgesVisibleAt?: (
        edge: { readonly kind: string; readonly data?: Readonly<Record<string, unknown>> },
        level: string,
    ) => boolean;
}

/** A semantic layer over a Kernel. Core owns the Kernel; a domain owns only its meaning. */
export interface DomainModule<M = GraphViewData> {
    readonly id: string;
    readonly manifest: () => readonly DomainManifestEntry[];
    build(kernel: Kernel): M;
    readonly vocabulary: DomainVocabulary;
}

/** Identity helper for type inference. Not a framework. */
export const defineDomain = <M>(module: DomainModule<M>): DomainModule<M> => module;
