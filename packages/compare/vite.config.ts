import { solidLibConfig } from '../solid-lib-vite.config';

export default solidLibConfig(
    {
        index: 'src/index.ts',
        GraphCompare: 'src/GraphCompare.tsx',
        GraphCompareBar: 'src/GraphCompareBar.tsx',
    },
    ['solid-js', '@spacegraphjs/shared'],
);
