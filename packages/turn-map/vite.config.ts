import { solidLibConfig } from '../solid-lib-vite.config';

export default solidLibConfig(
    {
        index: 'src/index.ts',
        TurnMapInlineGraph: 'src/TurnMapInlineGraph.tsx',
        TurnMapOverlay: 'src/TurnMapOverlay.tsx',
    },
    [
        'solid-js',
        '@spacegraphjs/renderer',
        '@spacegraphjs/svg-renderer',
        '@spacegraphjs/shared',
        '@spacegraphjs/overlays',
    ],
);
