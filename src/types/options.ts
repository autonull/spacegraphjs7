// Options and configuration types

import type { Projection, RenderMode, DepthMode } from './core';
import type { Plugin } from './plugin';

// Input configuration
export interface DefaultInputConfig {
    interaction?: InteractionInputConfig;
}

export interface InteractionInputConfig {
    /** Hover feedback under the pointer. On by default. */
    enableHover?: boolean;
    /** Shift + drag on the void draws a selection box. On by default. */
    enableBoxSelect?: boolean;
    /** A left drag on a node moves it. On by default. */
    enableDrag?: boolean;
    /**
     * A left drag on empty background pans the view. On by default: over the void the left button
     * has nothing else to do, and a hand on the mouse expects the map to follow. A host that wants
     * the old behaviour — the left button only ever means "the nodes" — turns this off.
     */
    enableBackgroundPan?: boolean;
    /** How far the pointer may travel, in pixels, and still count as a click. Defaults to 5. */
    clickThreshold?: number;
}

export interface RenderOptions {
    antialias?: boolean;
    alpha?: boolean;
    backgroundColor?: string | number;
    pixelRatio?: number;
    /** Render onto a transparent surface so the host's own background shows through. */
    transparent?: boolean;
    /** Keep the drawing buffer readable for screenshots. Defaults to true. */
    preserveDrawingBuffer?: boolean;
    /** Starting projection. Defaults to perspective; hosts that want 2D set orthographic. */
    projection?: Projection;
    /** Starting depth treatment; overrides `projection` when set. See `DepthMode`. */
    depth?: DepthMode;
    /** Render scheduling. `on-demand` (default) paints on mutation/camera/resize; `continuous` runs every frame. */
    renderMode?: RenderMode;
}

export interface AnimationProps {
    x?: number;
    y?: number;
    z?: number;
    scale?: number;
    duration?: number;
    ease?: string;
    delay?: number;
    onUpdate?: () => void;
}

export interface SpaceGraphOptions {
    onnxExecutionProviders?: string[];
    vision?: {
        wasmPaths?: string;
        heuristics?: {
            wcagThreshold?: number;
            overlapPadding?: number;
            fittsLawTargetSize?: number;
        };
    };
    initialLayout?: string;
    cameraControls?: Partial<import('../core/CameraControls').CameraControlsConfig>;
    input?: DefaultInputConfig;
    /** Register the instance on `window.SpaceGraph` and `SpaceGraph.instances` for developer tooling
     * (vision/inspection). Off by default, and never consulted by graph semantics: instances are fully
     * isolated, so edges only resolve nodes in the same graph. */
    global?: boolean;
    /** Where camera keyboard input listens. `container` (default) scopes it to the graph element. */
    keyboard?: KeyboardScope;
    /** Render host chrome (HUD, minimap, zoom UI). Off by default so embedded graphs stay bare. */
    chrome?: boolean;
    /** Fly the camera to a node on double click. Defaults to true; embedded graphs often set false. */
    doubleClickFocus?: boolean;
    /** WebGL render options: background, transparency, antialias, pixel ratio, drawing-buffer retention. */
    render?: RenderOptions;
    /** Shared theme. `theme.background` takes precedence over `render.backgroundColor`. */
    theme?: SpaceGraphTheme;
    /** Extra plugin instances to register at init, after the defaults. */
    plugins?: Plugin[];
    /** When true, all camera animations (fit, focus, depth transitions) complete instantly without
     * easing. Respects `prefers-reduced-motion` when not explicitly set. */
    reducedMotion?: boolean;

    [key: string]: unknown;
}

export interface SpaceGraphTheme {
    background?: string | number;
    /** Defaults applied to nodes that do not set their own colour. */
    node?: {
        fill?: string | number;
        stroke?: string | number;
    };
    /** Defaults applied to edges that do not set their own colour. */
    edge?: {
        color?: string | number;
        labelColor?: string;
        /** Background pill colour behind an edge label; defaults to a translucent black. */
        labelBackground?: string;
    };
    /** Label typography shared by node and edge labels. */
    label?: {
        color?: string;
        fontFamily?: string;
        fontSize?: number;
    };
    /** Outline colours for interaction states (mesh outlines and edge highlight). */
    selection?: string | number;
    hover?: string | number;
    focus?: string | number;
}

// Camera keyboard input scope: off, the graph container, or the whole window.
export type KeyboardScope = false | 'container' | 'window';
