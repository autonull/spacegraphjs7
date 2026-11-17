// P3.2. Widget size is measured by the host, then clamped by a host budget. Desired size reaches
// layout only when the sizing policy allows it, so a widget never reframes the map uninvited.

import type { WidgetSize } from './registry';

export const OVERFLOW_STRATEGIES = ['clip', 'dot', 'summary', 'virtualized'] as const;
export type OverflowStrategy = (typeof OVERFLOW_STRATEGIES)[number];

export interface WidgetSizingPolicy {
    readonly max?: WidgetSize;
    readonly overflow?: OverflowStrategy;
    readonly feedLayout?: boolean;
}

export interface ResolvedWidgetSize {
    readonly size: WidgetSize;
    /** Set only when the measured size exceeded the budget. */
    readonly overflow: OverflowStrategy | undefined;
    readonly feedLayout: boolean;
}

export function resolveWidgetSize(
    desired: WidgetSize,
    policy: WidgetSizingPolicy = {},
): ResolvedWidgetSize {
    const width = Math.max(1, Math.min(desired.width, policy.max?.width ?? Infinity));
    const height = Math.max(1, Math.min(desired.height, policy.max?.height ?? Infinity));
    const clamped = width !== desired.width || height !== desired.height;
    return {
        size: { width, height },
        overflow: clamped ? (policy.overflow ?? 'clip') : undefined,
        feedLayout: policy.feedLayout ?? false,
    };
}
