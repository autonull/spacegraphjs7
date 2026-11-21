import { describe, expect, it } from 'vitest';
import { filesystemDomain, fixtureOps, foldFilesystemOps } from '@spacegraphjs/filesystem';
import { graphIdePanels } from '../src/graph-ide';

describe('graph IDE panels', () => {
    const view = filesystemDomain.build(foldFilesystemOps(fixtureOps()));
    const panels = graphIdePanels(view);

    it('lists files with their change ids from the domain view', () => {
        expect(panels.files.map((file) => file.path)).toEqual(['src/auth/session.ts']);
        expect(panels.files[0].change).toBeTruthy();
    });

    it('derives change writers from the filesystem selectors', () => {
        expect(panels.changes).toHaveLength(1);
        expect(panels.changes[0].path).toBe('src/auth/session.ts');
        expect(panels.changes[0].producers).toEqual(['refresh']);
    });

    it('reports symbol dependents without touching the renderer', () => {
        const symbol = view.nodes.find((node) => node.label === 'refresh')!.id;
        expect(panels.dependencies[symbol]).toEqual([]);
        const dependent = view.nodes.find((node) => node.label === 'verify')!.id;
        expect(panels.dependencies[dependent]).toEqual([symbol]);
    });
});
