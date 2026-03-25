export interface Point {
    x: number;
    y: number;
}

export type DragCallback = (delta: Point) => void;
export type PinchCallback = (scale: number, center: Point) => void;
export type RotateCallback = (angle: number, center: Point) => void;

export class GestureManager {
    static calculateDistance({ x: x1, y: y1 }: Point, { x: x2, y: y2 }: Point): number {
        const dx = x1 - x2;
        const dy = y1 - y2;
        return Math.hypot(dx, dy);
    }

    static calculateMidpoint({ x: x1, y: y1 }: Point, { x: x2, y: y2 }: Point): Point {
        return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
    }

    static calculatePinchZoom(
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

    static calculatePan(
        { x: cx, y: cy }: Point,
        { x: px, y: py }: Point,
        currentRadius: number,
        panSpeedFactor: number = 0.002,
    ): Point {
        const panSpeed = currentRadius * panSpeedFactor;
        return { x: -(cx - px) * panSpeed, y: (cy - py) * panSpeed };
    }

    static calculateAngle({ x: x1, y: y1 }: Point, { x: x2, y: y2 }: Point): number {
        return Math.atan2(y2 - y1, x2 - x1);
    }

    static isClick(startPos: Point, endPos: Point, threshold: number = 5): boolean {
        return this.calculateDistance(startPos, endPos) < threshold;
    }

    static normalizeWheel(delta: number, sensitivity: number = 1): number {
        return Math.sign(delta) * Math.min(Math.abs(delta), 100) * sensitivity;
    }
}
