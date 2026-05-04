// Core constants - consolidated and optimized
// Lazy-evaluated constants for better tree-shaking

// ============= Math Constants =============
export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;
export const PI = Math.PI;
export const TAU = PI * 2;
export const EPSILON = 1e-6;

// Shorthand aliases for developer ergonomics
export const RAD = DEG2RAD;
export const DEG = RAD2DEG;

// ============= Animation Duration =============
const AnimationDurationDefaults = {
    FAST: 0.3,
    DEFAULT: 0.5,
    SLOW: 1.0,
    LAYOUT: 1.5,
    SNAP: 0.15,
    SPRING: 0.8,
} as const;

const ZoomConfigDefaults = {
    MULTIPLIER: 1.5,
    MIN_RADIUS: 150,
    MAX_RADIUS: 5000,
    DEFAULT_RADIUS: 800,
    SPEED: 0.1,
    SMOOTH: 0.08,
} as const;

const FingeringPriorityDefaults = {
    CAMERA_ZOOM: 20,
    CAMERA_PAN: 30,
    CAMERA_ORBIT: 40,
    PINCH_ZOOM: 50,
    HOVER: 60,
    BOX_SELECT: 80,
    DRAG: 100,
    WIDGET: 110,
    WIRING: 150,
    RESIZE: 200,
} as const;

const InteractionThresholdsDefaults = {
    CONTEXT_MENU: 5,
    BOX_SELECT_MIN: 5,
    DRAG_START: 5,
    DOUBLE_CLICK_MS: 500,
    LONG_PRESS_MS: 500,
    TAP_TOLERANCE: 10,
} as const;

const PerformanceDefaults = {
    MS_PER_SEC: 1000,
    DEFAULT_DELTA_TIME: 0.016,
    OPTIMIZER_CHECK_INTERVAL: 250,
    MAX_DELTA_CLAMP: 0.1,
    FRAME_BUDGET_MS: 16.67,
    IDLE_FRAME_BUDGET_MS: 50,
} as const;

const DefaultsValues = {
    OPACITY: 0.5,
    DURATION: 1.0,
    PADDING: 20,
    ARROWHEAD_SIZE: 10,
    EDGE_THICKNESS: 3,
    DASH_SIZE: 3,
    GAP_SIZE: 1,
    INSTANCED_THICKNESS: 0.5,
    RAYCASTER_THRESHOLD: 5,
    CAMERA_FOV: 60,
    CAMERA_NEAR: 1,
    CAMERA_FAR: 10000,
} as const;

const EdgeColorsDefaults = {
    DEFAULT: 0x00d0ff,
    HIGHLIGHT: 0x00ffff,
    SELECTED: 0x00ff88,
    INCOMING: 0xffaa00,
    OUTGOING: 0xff6600,
    INACTIVE: 0x666666,
} as const;

const WCAGDefaults = {
    MIN_CONTRAST: 4.5,
    ENHANCED_CONTRAST: 7.0,
    LARGE_TEXT: 3.0,
    UI_COMPONENTS: 3.0,
} as const;

// Spatial constants
export const Spatial = {
    NEAR_DISTANCE: 100,
    FAR_DISTANCE: 5000,
    PICKING_threshold: 5,
    AUTO_CULLING_DISTANCE: 2000,
    LOD_DISTANCE: [200, 500, 1000, 2000],
} as const;

// Node defaults
export const NodeDefaults = {
    SIZE: 50,
    HEIGHT: 50,
    WIDTH: 50,
    DEPTH: 50,
    OPACITY: 1.0,
    COLOR: 0x4488ff,
    HOVER_COLOR: 0x66aaff,
    SELECTED_COLOR: 0x00ff88,
} as const;

// Layout defaults
export const LayoutDefaults = {
    STRENGTH: -100,
    DISTANCE: 200,
    ITERATIONS: 300,
    THETA: 0.8,
    GRAVITY: 0.1,
    MAX_SPEED: 50,
} as const;

// Animation easing presets
export const Easing = {
    DEFAULT: 'quadOut',
    SMOOTH: 'sineOut',
    BOUNCE: 'bounceOut',
    ELASTIC: 'elasticOut',
    SNAP: 'backOut',
} as const;

// Type exports - intentionally named with Type suffix for clarity
export type AnimationDuration = typeof AnimationDurationDefaults;
export type ZoomConfig = typeof ZoomConfigDefaults;
export type FingeringPriority = typeof FingeringPriorityDefaults;
export type InteractionThresholds = typeof InteractionThresholdsDefaults;
export type Performance = typeof PerformanceDefaults;
export type Defaults = typeof DefaultsValues;
export type EdgeColors = typeof EdgeColorsDefaults;
export type WCAG = typeof WCAGDefaults;

// Value exports - using Object.freeze for immutability
export const AnimationDuration = Object.freeze({ ...AnimationDurationDefaults });
export const ZoomConfig = Object.freeze({ ...ZoomConfigDefaults });
export const FingeringPriority = Object.freeze({ ...FingeringPriorityDefaults });
export const InteractionThresholds = Object.freeze({ ...InteractionThresholdsDefaults });
export const Performance = Object.freeze({ ...PerformanceDefaults });
export const Defaults = Object.freeze({ ...DefaultsValues });
export const EdgeColors = Object.freeze({ ...EdgeColorsDefaults });
export const WCAG = Object.freeze({ ...WCAGDefaults });

// Input configuration
export const InputConfig = Object.freeze({
    ZOOM_SPEED_FACTOR: 0.005,
    PAN_SPEED_FACTOR: 0.002,
    ORBIT_SPEED_FACTOR: 0.005,
    WHEEL_MULTIPLIER: 1,
});

// Shorthand aliases for developer ergonomics
export const DUR = AnimationDuration;
export const ZOOM = ZoomConfig;
export const FINGER = FingeringPriority;
export const THRESH = InteractionThresholds;
export const PERF = Performance;
export const DEF = Defaults;
export const COLORS = EdgeColors;

// Unified constants object
export const CONSTANTS = Object.freeze({
    AnimationDuration,
    ZoomConfig,
    FingeringPriority,
    InteractionThresholds,
    Performance,
    Defaults,
    EdgeColors,
    InputConfig,
    WCAG,
    Spatial,
    NodeDefaults,
    LayoutDefaults,
    Easing,
    DEG2RAD,
    RAD2DEG,
    PI,
    TAU,
    EPSILON,
}) as Readonly<typeof AnimationDurationDefaults & typeof ZoomConfigDefaults & typeof Spatial>;
