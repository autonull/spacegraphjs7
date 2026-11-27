import { DEPTH_MODES, type DepthMode } from '@spacegraphjs/renderer';
import type { RepresentationRung } from 'spacegraphjs/salience';

export const SURFACES = ['log', 'map', 'hybrid'] as const;
export type Surface = (typeof SURFACES)[number];

export const ARRANGEMENTS = ['stacked', 'side', 'floating'] as const;
export type Arrangement = (typeof ARRANGEMENTS)[number];

export const DEPTHS = DEPTH_MODES;
export type Depth = DepthMode;

export type Rung = RepresentationRung;
