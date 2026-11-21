import { solidLibConfig } from '../solid-lib-vite.config';

export default solidLibConfig(
    {
        index: 'src/index.ts',
        GraphExportControl: 'src/GraphExportControl.tsx',
        export: 'src/export.ts',
    },
    ['solid-js', '@spacegraphjs/renderer', '@spacegraphjs/svg-renderer', '@spacegraphjs/shared'],
);
