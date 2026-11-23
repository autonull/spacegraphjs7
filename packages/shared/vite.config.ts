import { solidLibConfig } from '../solid-lib-vite.config';

export default solidLibConfig(
    {
        index: 'src/index.ts',
        i18n: 'src/i18n.ts',
        facets: 'src/facets.ts',
        icons: 'src/icons.tsx',
        popover: 'src/popover.tsx',
        types: 'src/types.ts',
        domain: 'src/domain.ts',
        animations: 'src/animations.ts',
        keyboard: 'src/keyboard.ts',
        tokens: 'src/tokens.ts',
        css: 'src/css.ts',
        portal: 'src/portal.tsx',
        hooks: 'src/hooks.ts',
    },
    ['solid-js'],
);
