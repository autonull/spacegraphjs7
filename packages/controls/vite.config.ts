import { solidLibConfig } from '../solid-lib-vite.config';

export default solidLibConfig(
    {
        index: 'src/index.ts',
        GraphShowControl: 'src/GraphShowControl.tsx',
        GraphDrawControl: 'src/GraphDrawControl.tsx',
        GraphZoomControl: 'src/GraphZoomControl.tsx',
        GraphStatusBar: 'src/GraphStatusBar.tsx',
        GraphQuestionsControl: 'src/GraphQuestionsControl.tsx',
    },
    ['solid-js', '@spacegraphjs/shared', /^@spacegraphjs\/toolbar(?:\/|$)/],
);
