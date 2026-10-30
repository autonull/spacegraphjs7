import { Vector3 } from 'three';

/**
 * The world-space vector helpers the geometry code shares.
 */

/** The vector from one point to another. */
export function directionBetween(
  from: Vector3,
  to: Vector3,
  target = new Vector3()
): Vector3 {
  return target.subVectors(to, from);
}

/** The point halfway between two points. */
export function midpoint(
  a: Vector3,
  b: Vector3,
  target = new Vector3()
): Vector3 {
  return target.addVectors(a, b).multiplyScalar(0.5);
}

/** The vector perpendicular to a direction in the XY plane. */
export function perpendicularTo(direction: Vector3, target = new Vector3()): Vector3 {
  return target.set(-direction.y, direction.x, 0);
}

/**
 * A point on a sphere, from geographic coordinates in degrees. The north pole is +Y and the
 * prime meridian faces -X.
 */
export function latLngToVec3(
  latitude: number,
  longitude: number,
  radius: number,
  target = new Vector3()
): Vector3 {
  const phi = ((90 - latitude) * Math.PI) / 180;
  const theta = ((longitude + 180) * Math.PI) / 180;
  return target.set(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}
