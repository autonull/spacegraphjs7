import { describe, expect, test } from 'bun:test';
import { runConformance } from '../conformance';
import { buildExampleKernel } from './fixture';
import { query } from '../query';

describe('example fixture', () => {
  test('is a valid kernel', () => {
    expect(runConformance(buildExampleKernel())).toEqual({ ok: true, issues: [] });
  });

  test('models orgs to projects to tasks', () => {
    const kernel = buildExampleKernel();

    expect(query(kernel).traverse('org:acme').map((node) => node.id)).toEqual([
      'org:acme',
      'project:website',
      'task:design',
    ]);
    expect(query(kernel).path('org:globex', 'task:auth')?.map((node) => node.id)).toEqual([
      'org:globex',
      'project:api',
      'task:auth',
    ]);
  });
});
