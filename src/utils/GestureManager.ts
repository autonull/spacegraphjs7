export interface Point {
    x: number;
    y: number;
}

export class GestureManager {
    /**
     * Calculates the distance between two points, used for pinch-to-zoom.
     */
    static calculateDistance({ x: x1, y: y1 }: Point, { x: x2, y: y2 }: Point): number {
        const dx = x1 - x2;
        const dy = y1 - y2;
        return Math.hypot(dx, dy);
    }

    /**
     * Calculates the midpoint between two points, used for two-finger pan.
     */
    static calculateMidpoint({ x: x1, y: y1 }: Point, { x: x2, y: y2 }: Point): Point {
        return {
            x: (x1 + x2) / 2,
            y: (y1 + y2) / 2,
        };
    }

    /**
     * Calculates the new zoom radius based on pinch distance delta.
     */
    static calculatePinchZoom(
        currentDistance: number,
        previousDistance: number,
        currentRadius: number,
        zoomSpeedFactor: number = 0.005,
        minRadius: number = 10,
        maxRadius: number = 5000
    ): number {
        const zoomDelta = (currentDistance - previousDistance) * (currentRadius * zoomSpeedFactor);
        return Math.max(minRadius, Math.min(maxRadius, currentRadius - zoomDelta));
    }

    /**
     * Calculates the pan velocity based on midpoint movement.
     */
    static calculatePan(
        { x: cx, y: cy }: Point,
        { x: px, y: py }: Point,
        currentRadius: number,
        panSpeedFactor: number = 0.002
    ): Point {
        const panSpeed = currentRadius * panSpeedFactor;
        return {
            x: -(cx - px) * panSpeed,
            y: (cy - py) * panSpeed
        };
    }
}
