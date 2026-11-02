// Core constants - consolidated and optimized
// Single namespace for all constants to improve tree-shaking and discoverability

export const MathConst = Object.freeze({
    DEG2RAD: Math.PI / 180,
    RAD2DEG: 180 / Math.PI,
    PI: Math.PI,
    TAU: Math.PI * 2,
    EPSILON: 1e-6,
} as const);

export const Animation = Object.freeze({
    Duration: Object.freeze({
        FAST: 0.3,
        DEFAULT: 0.5,
        SLOW: 1.0,
        LAYOUT: 1.5,
        SNAP: 0.15,
        SPRING: 0.8,
    }),
    Easing: Object.freeze({
        DEFAULT: 'quadOut',
        SMOOTH: 'sineOut',
        BOUNCE: 'bounceOut',
        ELASTIC: 'elasticOut',
        SNAP: 'backOut',
    }),
} as const);

export const Zoom = Object.freeze({
    MULTIPLIER: 1.5,
    MIN_RADIUS: 150,
    MAX_RADIUS: 5000,
    DEFAULT_RADIUS: 800,
    SPEED: 0.1,
    SMOOTH: 0.08,
} as const);

export const Interaction = Object.freeze({
    Priority: Object.freeze({
        CAMERA: 40,
        PINCH_ZOOM: 50,
        HOVER: 60,
        WIDGET: 110,
        RESIZE: 200,
    }),
    Thresholds: Object.freeze({
        CONTEXT_MENU: 5,
        BOX_SELECT_MIN: 5,
        DRAG_START: 5,
        DOUBLE_CLICK_MS: 500,
        LONG_PRESS_MS: 500,
        TAP_TOLERANCE: 10,
    }),
} as const);

export const Performance = Object.freeze({
    MS_PER_SEC: 1000,
    DEFAULT_DELTA_TIME: 0.016,
    OPTIMIZER_CHECK_INTERVAL: 250,
    MAX_DELTA_CLAMP: 0.1,
    FRAME_BUDGET_MS: 16.67,
    IDLE_FRAME_BUDGET_MS: 50,
} as const);

export const Defaults = Object.freeze({
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
} as const);

export const EdgeColors = Object.freeze({
    DEFAULT: 0x00d0ff,
    HIGHLIGHT: 0x00ffff,
    SELECTED: 0x00ff88,
    INCOMING: 0xffaa00,
    OUTGOING: 0xff6600,
    INACTIVE: 0x666666,
} as const);

export const WCAG = Object.freeze({
    MIN_CONTRAST: 4.5,
    ENHANCED_CONTRAST: 7.0,
    LARGE_TEXT: 3.0,
    UI_COMPONENTS: 3.0,
} as const);

export const Spatial = Object.freeze({
    NEAR_DISTANCE: 100,
    FAR_DISTANCE: 5000,
    PICKING_THRESHOLD: 5,
    AUTO_CULLING_DISTANCE: 2000,
    LOD_DISTANCE: [200, 500, 1000, 2000],
} as const);

export const NodeDefaults = Object.freeze({
    SIZE: 50,
    HEIGHT: 50,
    WIDTH: 50,
    DEPTH: 50,
    OPACITY: 1.0,
    COLOR: 0x4488ff,
    HOVER_COLOR: 0x66aaff,
    SELECTED_COLOR: 0x00ff88,
} as const);

export const LayoutDefaults = Object.freeze({
    STRENGTH: -100,
    DISTANCE: 200,
    ITERATIONS: 300,
    THETA: 0.8,
    GRAVITY: 0.1,
    MAX_SPEED: 50,
} as const);

export const Input = Object.freeze({
    ZOOM_SPEED_FACTOR: 0.005,
    PAN_SPEED_FACTOR: 0.002,
    ORBIT_SPEED_FACTOR: 0.005,
    WHEEL_MULTIPLIER: 1,
} as const);

// Re-export commonly used constants at top level for backward compatibility
export const {
    DEG2RAD,
    RAD2DEG,
    PI,
    TAU,
    EPSILON,
} = MathConst;

export const {
    Duration: AnimationDuration,
    Easing,
} = Animation;

export const {
    MULTIPLIER: ZOOM_MULTIPLIER,
    MIN_RADIUS: ZOOM_MIN_RADIUS,
    MAX_RADIUS: ZOOM_MAX_RADIUS,
    DEFAULT_RADIUS: ZOOM_DEFAULT_RADIUS,
    SPEED: ZOOM_SPEED,
    SMOOTH: ZOOM_SMOOTH,
} = Zoom;

export const {
    Priority: FingeringPriority,
    Thresholds: InteractionThresholds,
} = Interaction;

// Backward compatibility exports
export const InputConfig = Interaction;
export const ZoomConfig = Zoom;
