import { ConfigSpace } from './space';
import { ConfigState } from './state';
import type { AxisDescriptor, ConfigValue, NegotiatedAxis, Negotiation } from './types';

export interface NegotiationContext {
    readonly capabilities?: ReadonlySet<string>;
    readonly flags?: ReadonlySet<string>;
}

/** Why a value cannot be used, or undefined when it is available. */
function unavailableReason(
    axis: AxisDescriptor,
    value: ConfigValue,
    context: NegotiationContext,
): string | undefined {
    if (!axis.values.includes(value)) return `unknown value "${value}"`;
    if (axis.capability && !context.capabilities?.has(axis.capability)) {
        return `capability "${axis.capability}" not available`;
    }
    const flag = axis.flag ?? axis.valueFlags?.[value];
    if (flag && !context.flags?.has(flag)) return `flag "${flag}" disabled`;
    return undefined;
}

function negotiateAxis(
    axis: AxisDescriptor,
    requested: ConfigValue,
    context: NegotiationContext,
): NegotiatedAxis {
    const reason = unavailableReason(axis, requested, context);
    if (reason === undefined) {
        return { axis: axis.id, requested, value: requested, status: 'supported', reason: 'available' };
    }

    const candidates = [
        ...new Set(
            [axis.default, ...axis.values].filter((value): value is ConfigValue => value !== undefined),
        ),
    ];
    const fallback = candidates.find(
        (value) => value !== requested && unavailableReason(axis, value, context) === undefined,
    );
    if (fallback === undefined) {
        return { axis: axis.id, requested, value: requested, status: 'unsupported', reason };
    }
    return {
        axis: axis.id,
        requested,
        value: fallback,
        status: 'degraded-to',
        reason,
    };
}

/** Merge host config, manifest capabilities and flags into an effective, explainable state. */
export function negotiate(
    space: ConfigSpace,
    state: ConfigState,
    context: NegotiationContext = {},
): Negotiation {
    const axes = space.axes.map((axis) =>
        negotiateAxis(axis, state.get(axis.id) ?? '', context),
    );
    const effective = Object.fromEntries(axes.map((axis) => [axis.axis, axis.value]));
    return {
        axes,
        state: ConfigState.fromRecord(space, effective),
    };
}
