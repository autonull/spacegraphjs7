import { solidLibConfig } from '../solid-lib-vite.config';

export default solidLibConfig(
    {
        index: 'src/index.ts',
        GraphBreadcrumbs: 'src/GraphBreadcrumbs.tsx',
        GraphMinimap: 'src/GraphMinimap.tsx',
        GraphLegend: 'src/GraphLegend.tsx',
        GraphLegendBody: 'src/GraphLegendBody.tsx',
    },
    ['solid-js', '@spacegraphjs/shared'],
);
