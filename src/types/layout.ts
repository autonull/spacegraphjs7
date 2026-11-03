// Typed layout options per strategy for type-safe layoutOnce() calls

import type { LayoutOptions } from '../plugins/layouts/BaseLayout';
import type { ForceLayoutConfig } from '../plugins/layouts/ForceLayout';
import type { CircularLayoutOptions } from '../plugins/layouts/CircularLayout';
import type { GridLayoutOptions } from '../plugins/layouts/GridLayout';
import type { HierarchicalLayoutOptions } from '../plugins/layouts/HierarchicalLayout';
import type { TreeLayoutOptions } from '../plugins/layouts/TreeLayout';
import type { RadialLayoutOptions } from '../plugins/layouts/RadialLayout';
import type { SpectralLayoutOptions } from '../plugins/layouts/SpectralLayout';
import type { ClusterLayoutOptions } from '../plugins/layouts/ClusterLayout';
import type { GeoLayoutOptions } from '../plugins/layouts/GeoLayout';
import type { TimelineLayoutOptions } from '../plugins/layouts/TimelineLayout';

/** Common animation options shared by all layouts */
export interface LayoutAnimationOptions {
    /** Whether to animate the layout transition */
    animate?: boolean;
    /** Animation duration in seconds */
    duration?: number;
    /** Skip pinned nodes during layout */
    skipPinned?: boolean;
}

/** Union of all layout-specific options */
export type LayoutOptionsMap = {
    'force-layout': ForceLayoutConfig;
    'circular-layout': CircularLayoutOptions;
    'grid-layout': GridLayoutOptions;
    'hierarchical-layout': HierarchicalLayoutOptions;
    'tree-layout': TreeLayoutOptions;
    'radial-layout': RadialLayoutOptions;
    'spectral-layout': SpectralLayoutOptions;
    'cluster-layout': ClusterLayoutOptions;
    'geo-layout': GeoLayoutOptions;
    'timeline-layout': TimelineLayoutOptions;
};

/** Extract layout options by layout name */
export type LayoutOptionsFor<Name extends keyof LayoutOptionsMap> = LayoutOptionsMap[Name];

/** Typed layoutOnce options - pass layout name and corresponding options */
export type TypedLayoutOptions<Name extends keyof LayoutOptionsMap = keyof LayoutOptionsMap> =
    | { layout: Name; options?: Partial<LayoutOptionsFor<Name>> }
    | Partial<LayoutOptionsFor<Name>>;

/** Type-safe layoutOnce call signature */
export interface LayoutOnceOptions {
    <Name extends keyof LayoutOptionsMap>(layout: Name, options?: Partial<LayoutOptionsFor<Name>>): Promise<void>;
    (layout: string, options?: Record<string, unknown>): Promise<void>;
}