import { solidLibConfig } from '../solid-lib-vite.config';

export default solidLibConfig(
    {
        index: 'src/index.ts',
        GraphSearch: 'src/GraphSearch.tsx',
        GraphFind: 'src/GraphFind.tsx',
        search: 'src/search.ts',
        navigation: 'src/navigation.ts',
        hooks: 'src/hooks.ts',
    },
    ['solid-js', '@spacegraphjs/shared'],
);
