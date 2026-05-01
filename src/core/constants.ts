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
const createAnimationDuration = () => ({
    FAST: 0.3,
    DEFAULT: 0.5,
    SLOW: 1.0,
    LAYOUT: 1.5,
}) as const;

const createZoomConfig = () => ({
    MULTIPLIER: 1.5,
    MIN_RADIUS: 150,
    MAX_RADIUS: 5000,
    DEFAULT_RADIUS: 800,
    SPEED: 0.1,
}) as const;

const createFingeringPriority = () => ({
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
}) as const;

const createInteractionThresholds = () => ({
    CONTEXT_MENU: 5,
    BOX_SELECT_MIN: 5,
    DRAG_START: 5,
    DOUBLE_CLICK_MS: 500,
}) as const;

const createPerformance = () => ({
    MS_PER_SEC: 1000,
    DEFAULT_DELTA_TIME: 0.016,
    OPTIMIZER_CHECK_INTERVAL: 250,
    MAX_DELTA_CLAMP: 0.1,
}) as const;

const createDefaults = () => ({
    OPACITY: 0.5,
    DURATION: 1.0,
    PADDING: 20,
    ARROWHEAD_SIZE: 10,
    EDGE_THICKNESS: 3,
    DASH_SIZE: 3,
    GAP_SIZE: 1,
    INSTANCED_THICKNESS: 0.5,
    RAYCASTER_THRESHOLD: 5,
}) as const;

const createEdgeColors = () => ({
    DEFAULT: 0x00d0ff,
    HIGHLIGHT: 0x00ffff,
}) as const;

const createWCAG = () => ({
    MIN_CONTRAST: 4.5,
    ENHANCED_CONTRAST: 7.0,
}) as const;

// Direct exports (evaluated once)
export const AnimationDuration = createAnimationDuration();
export const ZoomConfig = createZoomConfig();
export const FingeringPriority = createFingeringPriority();
export const InteractionThresholds = createInteractionThresholds();
export const Performance = createPerformance();
export const Defaults = createDefaults();
export const EdgeColors = createEdgeColors();
export const WCAG = createWCAG();

// Input configuration
export const InputConfig = {
    ZOOM_SPEED_FACTOR: 0.005,
    PAN_SPEED_FACTOR: 0.002,
} as const;

// Shorthand aliases for developer ergonomics
export const DUR = AnimationDuration;
export const ZOOM = ZoomConfig;
export const FINGER = FingeringPriority;
export const THRESH = InteractionThresholds;
export const PERF = Performance;
export const DEF = Defaults;
export const COLORS = EdgeColors;

// Re-export for convenience
export const CONSTANTS = {
    AnimationDuration,
    ZoomConfig,
    FingeringPriority,
    InteractionThresholds,
    Performance,
    Defaults,
    EdgeColors,
    InputConfig,
    WCAG,
} as const;
