import { solidLibConfig } from '../solid-lib-vite.config';

export default solidLibConfig(
    {
        index: 'src/index.ts',
        GraphA11y: 'src/GraphA11y.tsx',
        AccessibilityLayer: 'src/AccessibilityLayer.ts',
    },
    ['solid-js', '@spacegraphjs/shared'],
);
