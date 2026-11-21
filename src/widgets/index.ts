// `@spacegraphjs/widgets` — host-registered living HTML on graph nodes. Pure, DOM-free, and safe to
// import from any host (P3).

export {
    WIDGET_CAPABILITIES,
    WIDGET_SLOTS,
    WidgetRegistry,
} from './registry';
export type {
    WidgetCapability,
    WidgetDescriptor,
    WidgetHandle,
    WidgetMountContext,
    WidgetSize,
    WidgetSlot,
} from './registry';
export { OVERFLOW_STRATEGIES, resolveWidgetSize } from './sizing';
export type {
    OverflowStrategy,
    ResolvedWidgetSize,
    WidgetSizingPolicy,
} from './sizing';
export { WidgetLayer } from './layer';
export type { MountedWidget, WidgetLayerOptions } from './layer';
export { isSafeWidgetMarkup, WIDGET_SECURITY_CONTRACT } from './security';
export { createInstrumentKit, INSTRUMENT_IDS } from './instrument-kit';
export type { InstrumentData, InstrumentID, InstrumentKit } from './instrument-kit';
