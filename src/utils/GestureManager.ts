export interface Point {
    x: number;
    y: number;
}

export class GestureManager {
    /**
     * Calculates the distance between two points, used for pinch-to-zoom.
     */
    static calculateDistance(p1: Point, p2: Point): number {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Calculates the midpoint between two points, used for two-finger pan.
     */
    static calculateMidpoint(p1: Point, p2: Point): Point {
        return {
            x: (p1.x + p2.x) / 2,
            y: (p1.y + p2.y) / 2,
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
        const distanceDelta = currentDistance - previousDistance;
        const zoomSpeed = currentRadius * zoomSpeedFactor;
        return Math.max(
            minRadius,
            Math.min(maxRadius, currentRadius - distanceDelta * zoomSpeed)
        );
    }

    /**
     * Calculates the pan velocity based on midpoint movement.
     */
    static calculatePan(
        currentMidpoint: Point,
        previousMidpoint: Point,
        currentRadius: number,
        panSpeedFactor: number = 0.002
    ): Point {
        const midDeltaX = currentMidpoint.x - previousMidpoint.x;
        const midDeltaY = currentMidpoint.y - previousMidpoint.y;

        const panSpeed = currentRadius * panSpeedFactor;
        return {
            x: -midDeltaX * panSpeed,
            y: midDeltaY * panSpeed
        };
    }
}
