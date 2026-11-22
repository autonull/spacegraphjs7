import type { PolicyVector } from './schema';

/** Raising the existing label floor past its default opts into the denser card treatment. */
export const DENSE_LABEL_PX = 18;
export const denseType = (values: PolicyVector): boolean =>
    Number(values['ladder.minLabelPx']) >= DENSE_LABEL_PX;

export const DENSITY_STYLE: Readonly<Record<string, string>> = {
    '--pi-card-pad-y': '3.5%',
    '--pi-card-pad-x': '5%',
    '--pi-card-gap': '1px',
    '--pi-card-gap-detail': '2px',
    '--pi-label-scale': '1.15',
};

export const CLEAR_DENSITY_STYLE = Object.keys(DENSITY_STYLE);
