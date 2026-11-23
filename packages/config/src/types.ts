import type { ConfigState } from './state';

/** A single selectable value on a configuration axis. */
export type ConfigValue = string;

/** A discoverable, switchable, serializable configuration axis. */
export interface AxisDescriptor<V extends ConfigValue = ConfigValue> {
    readonly id: string;
    readonly values: readonly V[];
    readonly source: string;
    readonly capability?: string;
    readonly flag?: string;
    readonly valueFlags?: Partial<Record<V, string>>;
    readonly reducedMotion?: string;
    readonly default?: V;
    /** First contract version that carried this capability. Additive changes keep aliases for one minor. */
    readonly minContractVersion?: string;
}

/** A registry contribution to a capability manifest. */
export type ManifestEntry = AxisDescriptor;

/** Every option a consumer can discover, independent of who owns the registry. */
export interface Manifest {
    readonly contractVersion: string;
    readonly entries: readonly ManifestEntry[];
}

export type NegotiationStatus = 'supported' | 'degraded-to' | 'unsupported';

/** The outcome for one axis after capability and flag negotiation. */
export interface NegotiatedAxis {
    readonly axis: string;
    readonly requested: ConfigValue;
    readonly value: ConfigValue;
    readonly status: NegotiationStatus;
    readonly reason: string;
}

export interface Negotiation {
    readonly axes: readonly NegotiatedAxis[];
    readonly state: ConfigState;
}
