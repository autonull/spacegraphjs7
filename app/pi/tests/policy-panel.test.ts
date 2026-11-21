// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { mountPolicyPanel, panelControls } from '../src/policy/panel';
import { resolvePolicy, type ResolvedPolicy } from '../src/policy/resolve';
import type { PolicySchema } from '../src/policy/schema';

const schema: PolicySchema = {
    version: 1,
    knobs: [
        {
            id: 'bands.foo',
            family: 'bands',
            type: 'number',
            default: 1,
            min: 0,
            max: 10,
            step: 1,
            description: 'foo',
            rationale: '1',
        },
        {
            id: 'bands.bar',
            family: 'bands',
            type: 'boolean',
            default: false,
            description: 'bar',
            rationale: '1',
        },
        {
            id: 'camera.baz',
            family: 'camera',
            type: 'enum',
            default: 'a',
            options: ['a', 'b'],
            description: 'baz',
            rationale: '1',
        },
    ],
};

const defaults = (): ResolvedPolicy => resolvePolicy(schema);
const withUrl = (values: Record<string, string | number | boolean>): ResolvedPolicy =>
    resolvePolicy(schema, { url: values });

const host = document.createElement('div');
beforeEach(() => host.replaceChildren());

const mount = (resolved: ResolvedPolicy) =>
    mountPolicyPanel(host, schema, resolved, {
        onChange: () => undefined,
        onReset: () => undefined,
        onCopy: () => undefined,
    });

const controls = (root: HTMLElement): HTMLLabelElement[] => [
    ...root.querySelectorAll<HTMLLabelElement>('.policy-control'),
];
const visibleIds = (root: HTMLElement): string[] =>
    controls(root).filter((label) => !label.hidden).map((label) => label.dataset.knob ?? '');
const families = (root: HTMLElement): HTMLDetailsElement[] => [
    ...root.querySelectorAll<HTMLDetailsElement>('.policy-family'),
];

describe('policy panel progressive disclosure', () => {
    it('keeps the public view and emits the stable toolbar and family hooks', () => {
        expect(panelControls(schema, defaults()).map((group) => group.family)).toEqual(['bands', 'camera']);

        const panel = mount(defaults());
        expect(panel.element.classList.contains('policy-panel')).toBe(true);

        const tools = panel.element.querySelector('.policy-tools');
        expect(tools).not.toBeNull();
        const search = panel.element.querySelector<HTMLInputElement>('.policy-search');
        expect(search?.type).toBe('search');
        expect(search?.placeholder).toBe('Filter knobs');
        expect(search?.getAttribute('aria-label')).toBe('Filter policy knobs');
        const provenance = panel.element.querySelector<HTMLSelectElement>('.policy-provenance');
        expect(provenance?.getAttribute('aria-label')).toBe('Filter by provenance');
        const changed = panel.element.querySelector<HTMLButtonElement>('[data-changed-only]');
        expect(changed?.tagName).toBe('BUTTON');
        expect(changed?.type).toBe('button');
        expect(changed?.textContent).toBe('changed only');
        expect(changed?.getAttribute('aria-pressed')).toBe('false');

        const sections = families(panel.element);
        expect(sections.map((section) => section.dataset.family)).toEqual(['bands', 'camera']);
        for (const section of sections) {
            expect(section.open).toBe(false);
            expect(section.querySelector('summary')?.textContent).toBe(section.dataset.family);
            expect(section.querySelectorAll('.policy-family-tools button')).toHaveLength(2);
        }

        for (const label of controls(panel.element)) {
            expect(label.dataset.knob).toBeTruthy();
            expect(label.dataset.provenance).toBe('defaults');
            expect(label.dataset.changed).toBe('false');
            expect(label.querySelector<HTMLInputElement>('[data-policy-knob]')?.dataset.policyKnob).toBe(
                label.dataset.knob,
            );
        }
        expect(panel.element.querySelector('.policy-empty')?.hasAttribute('hidden')).toBe(true);
    });

    it('filters controls by knob id, case-insensitively, and hides empty families', () => {
        const panel = mount(defaults());
        const search = panel.element.querySelector<HTMLInputElement>('.policy-search')!;

        search.value = 'CAMERA';
        search.dispatchEvent(new Event('input'));
        expect(visibleIds(panel.element)).toEqual(['camera.baz']);
        expect(families(panel.element)[0].hidden).toBe(true);
        expect(families(panel.element)[1].hidden).toBe(false);
        expect(panel.element.querySelector('.policy-empty')?.hasAttribute('hidden')).toBe(true);

        search.value = 'foo';
        search.dispatchEvent(new Event('input'));
        expect(visibleIds(panel.element)).toEqual(['bands.foo']);
        expect(families(panel.element)[0].hidden).toBe(false);
        expect(families(panel.element)[1].hidden).toBe(true);

        search.value = 'missing';
        search.dispatchEvent(new Event('input'));
        expect(visibleIds(panel.element)).toEqual([]);
        expect(families(panel.element).every((section) => section.hidden)).toBe(true);
        expect(panel.element.querySelector('.policy-empty')?.hasAttribute('hidden')).toBe(false);
    });

    it('filters by provenance using the distinct values present in the resolved policy', () => {
        const panel = mount(withUrl({ 'bands.foo': 5, 'camera.baz': 'b' }));
        const provenance = panel.element.querySelector<HTMLSelectElement>('.policy-provenance')!;

        expect([...provenance.options].map((option) => option.value)).toEqual(['all', 'defaults', 'url']);
        provenance.value = 'url';
        provenance.dispatchEvent(new Event('change'));
        expect(visibleIds(panel.element)).toEqual(['bands.foo', 'camera.baz']);
        expect(families(panel.element)[0].hidden).toBe(false);

        provenance.value = 'defaults';
        provenance.dispatchEvent(new Event('change'));
        expect(visibleIds(panel.element)).toEqual(['bands.bar']);
        expect(families(panel.element)[1].hidden).toBe(true);

        provenance.value = 'all';
        provenance.dispatchEvent(new Event('change'));
        expect(visibleIds(panel.element)).toEqual(['bands.foo', 'bands.bar', 'camera.baz']);
    });

    it('filters to changed knobs and toggles off again', () => {
        const panel = mount(withUrl({ 'bands.foo': 5, 'camera.baz': 'b' }));
        const changed = panel.element.querySelector<HTMLButtonElement>('[data-changed-only]')!;

        expect(controls(panel.element).map((label) => label.dataset.changed)).toEqual([
            'true',
            'false',
            'true',
        ]);
        changed.click();
        expect(changed.getAttribute('aria-pressed')).toBe('true');
        expect(visibleIds(panel.element)).toEqual(['bands.foo', 'camera.baz']);
        expect(families(panel.element)[0].hidden).toBe(false);

        changed.click();
        expect(changed.getAttribute('aria-pressed')).toBe('false');
        expect(visibleIds(panel.element)).toEqual(['bands.foo', 'bands.bar', 'camera.baz']);
    });

    it('refreshes values and provenance and re-applies active filters on update', () => {
        const panel = mount(withUrl({ 'bands.foo': 5, 'camera.baz': 'b' }));
        const search = panel.element.querySelector<HTMLInputElement>('.policy-search')!;
        search.value = 'camera';
        search.dispatchEvent(new Event('input'));
        expect(visibleIds(panel.element)).toEqual(['camera.baz']);

        panel.update(withUrl({ 'bands.bar': true, 'camera.baz': 'b' }));
        expect(visibleIds(panel.element)).toEqual(['camera.baz']);
        const foo = controls(panel.element).find((label) => label.dataset.knob === 'bands.foo')!;
        expect(foo.querySelector('input')?.value).toBe('1');
        expect(foo.dataset.provenance).toBe('defaults');
        expect(foo.dataset.changed).toBe('false');

        const provenance = panel.element.querySelector<HTMLSelectElement>('.policy-provenance')!;
        expect([...provenance.options].map((option) => option.value)).toEqual(['all', 'defaults', 'url']);
        search.value = '';
        search.dispatchEvent(new Event('input'));
        provenance.value = 'url';
        provenance.dispatchEvent(new Event('change'));
        expect(visibleIds(panel.element)).toEqual(['bands.bar', 'camera.baz']);

        panel.update(withUrl({ 'bands.foo': 7, 'camera.baz': 'b' }));
        expect(provenance.value).toBe('url');
        expect(visibleIds(panel.element)).toEqual(['bands.foo', 'camera.baz']);
        const bar = controls(panel.element).find((label) => label.dataset.knob === 'bands.bar')!;
        expect(bar.hidden).toBe(true);
        expect(bar.dataset.changed).toBe('false');
    });
});
