import { describe, test } from 'vitest';
import { adapterConformance } from '@spacegraphjs/adapter';
import { buildFileSystemView } from './vocabulary';
import { FIXTURE_POSITIONS, filesystemAdapter, fixtureOps, foldFilesystemOps } from './fixture';

const view = buildFileSystemView(foldFilesystemOps(fixtureOps()));

const FIXTURE = {
    model: view,
    level: 'execution' as const,
    positions: FIXTURE_POSITIONS,
    visible: view.nodes.map((node) => node.id),
    card: 'filesystem:c1:edit',
    structural: 'filesystem:c1:commit',
    focus: 'filesystem:c1:edit',
    lit: ['filesystem:c1:edit', 'filesystem:c1:refresh', 'filesystem:c1:session'],
    dimmed: ['filesystem:c1:commit', 'filesystem:c1:verify', 'filesystem:c1:bundle'],
};

describe('filesystem wrapper conformance', () => {
    for (const conformanceCase of adapterConformance(filesystemAdapter, FIXTURE)) {
        test(conformanceCase.name, conformanceCase.check);
    }
});
