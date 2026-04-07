export interface Point {
    x: number;
    y: number;
}

export type DragCallback = (delta: Point) => void;
export type PinchCallback = (scale: number, center: Point) => void;
export type RotateCallback = (angle: number, center: Point) => void;

export function calculateDistance(p1: Point, p2: Point): number {
    return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

export function calculateMidpoint(p1: Point, p2: Point): Point {
    return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
}

export function calculatePinchZoom(
    currentDistance: number,
    previousDistance: number,
    currentRadius: number,
    zoomSpeedFactor: number = 0.005,
    minRadius: number = 10,
    maxRadius: number = 5000,
): number {
    const zoomDelta = (currentDistance - previousDistance) * (currentRadius * zoomSpeedFactor);
    return Math.max(minRadius, Math.min(maxRadius, currentRadius - zoomDelta));
}

export function calculatePan(
    current: Point,
    previous: Point,
    currentRadius: number,
    panSpeedFactor: number = 0.002,
): Point {
    const panSpeed = currentRadius * panSpeedFactor;
    return { x: -(current.x - previous.x) * panSpeed, y: (current.y - previous.y) * panSpeed };
}

export function calculateAngle(p1: Point, p2: Point): number {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x);
}

export function isClick(startPos: Point, endPos: Point, threshold: number = 5): boolean {
    return calculateDistance(startPos, endPos) < threshold;
}

export function normalizeWheel(delta: number, sensitivity: number = 1): number {
    return Math.sign(delta) * Math.min(Math.abs(delta), 100) * sensitivity;
}

/** @deprecated Use the individual functions directly */
export const GestureManager = {
    calculateDistance,
    calculateMidpoint,
    calculatePinchZoom,
    calculatePan,
    calculateAngle,
    isClick,
    normalizeWheel,
};
