export const AnimationDuration = { FAST: 0.3, DEFAULT: 0.5, SLOW: 1.0, LAYOUT: 1.5 } as const;
export const ZoomConfig = { MULTIPLIER: 1.5, MIN_RADIUS: 150, MAX_RADIUS: 5000, DEFAULT_RADIUS: 800, SPEED: 0.1 } as const;
export const FingeringPriority = {
    CAMERA_ZOOM: 20, CAMERA_PAN: 30, CAMERA_ORBIT: 40, PINCH_ZOOM: 50, HOVER: 60, BOX_SELECT: 80, DRAG: 100, WIDGET: 110, WIRING: 150, RESIZE: 200,
} as const;
export const InteractionThresholds = { CONTEXT_MENU: 5, BOX_SELECT_MIN: 5, DRAG_START: 5, DOUBLE_CLICK_MS: 500 } as const;
export const Performance = { MS_PER_SEC: 1000, DEFAULT_DELTA_TIME: 0.016, OPTIMIZER_CHECK_INTERVAL: 250, MAX_DELTA_CLAMP: 0.1 } as const;
export const Defaults = {
    OPACITY: 0.5, DURATION: 1.0, PADDING: 20, ARROWHEAD_SIZE: 10, EDGE_THICKNESS: 3, DASH_SIZE: 3, GAP_SIZE: 1,
    INSTANCED_THICKNESS: 0.5, RAYCASTER_THRESHOLD: 5,
} as const;
export const EdgeColors = { DEFAULT: 0x00d0ff, HIGHLIGHT: 0x00ffff } as const;
export const InputConfig = { ZOOM_SPEED_FACTOR: 0.005, PAN_SPEED_FACTOR: 0.002 } as const;
export const WCAG = { MIN_CONTRAST: 4.5, ENHANCED_CONTRAST: 7.0 } as const;