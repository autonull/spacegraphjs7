// P4.3. Depth becomes a continuous policy: modes blend into one another and a host-chosen axis offsets
// each node within the scene. Existing mode treatments stay the endpoints, so nothing changes at t=0/1.

import type { CardFacing, DepthMode, Projection } from '../types';
import { clamp01 } from '../utils/math';
import { depthFade, depthTreatment, type DepthTreatment } from './DepthCues';

export const DEPTH_AXES = ['none', 'lane', 'turn', 'hierarchy'] as const;
export type DepthAxis = (typeof DEPTH_AXES)[number];

export interface DepthContinuum {
    readonly mode: DepthMode;
    readonly axis: DepthAxis;
    /** Strength of the treatment and fog, from 0 (flat) to 1 (full). */
    readonly strength: number;
    /** Scene units the host axis maps across. */
    readonly spread: number;
}

export const DEFAULT_DEPTH_CONTINUUM: DepthContinuum = {
    mode: 'flat',
    axis: 'none',
    strength: 0,
    spread: 0,
};

export interface DepthSample {
    readonly projection: Projection;
    readonly phi: number;
    readonly orbit: boolean;
    readonly facing: CardFacing;
    readonly fade: number;
    readonly offset: number;
    readonly opacity: number;
}

/** Blend two named treatments into one continuous treatment. Discrete modes remain the endpoints. */
export function blendDepth(from: DepthMode, to: DepthMode, t: number): DepthTreatment {
    const a = depthTreatment(from);
    const b = depthTreatment(to);
    const value = clamp01(t);
    return {
        projection: value < 0.5 ? a.projection : b.projection,
        phi: a.phi + (b.phi - a.phi) * value,
        orbit: value < 0.5 ? a.orbit : b.orbit,
        fade: a.fade + (b.fade - a.fade) * value,
        facing: value < 0.5 ? a.facing : b.facing,
    };
}

/**
 * Sample one node's depth. `axisValue` is host-normalized to [0, 1] (e.g. lane index, turn position or
 * hierarchy level); an `axis` of `none` keeps every node in the content plane.
 */
export function sampleDepth(
    continuum: DepthContinuum,
    axisValue: number,
    cameraDistance: number,
): DepthSample {
    const treatment = depthTreatment(continuum.mode);
    const offset =
        continuum.axis === 'none'
            ? 0
            : (clamp01(axisValue) * 2 - 1) * continuum.spread * continuum.strength;
    return {
        ...treatment,
        fade: treatment.fade * continuum.strength,
        offset,
        opacity: depthFade(cameraDistance + offset, treatment.fade * continuum.strength),
    };
}
