import { solidLibConfig } from '../solid-lib-vite.config';

export default solidLibConfig(
    {
        index: 'src/index.ts',
        hooks: 'src/hooks.ts',
        GraphStatusBar: 'src/GraphStatusBar.tsx',
    },
    ['solid-js', '@spacegraphjs/renderer', '@spacegraphjs/svg-renderer', '@spacegraphjs/shared'],
);
