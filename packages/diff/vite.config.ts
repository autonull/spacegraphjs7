import { solidLibConfig } from '../solid-lib-vite.config';

export default solidLibConfig(
    {
        index: 'src/index.ts',
        GraphDiffView: 'src/GraphDiffView.tsx',
        diff: 'src/diff.ts',
    },
    ['solid-js', '@spacegraphjs/shared'],
);
