import { describe, expect, test } from 'vitest';
import { PluginManager, type Plugin } from '../src/core/PluginManager';
import { EventEmitter } from '../src/core/EventEmitter';
import { Graph } from '../src/core/Graph';
import { ConfigurationError } from '../src/utils/error';
import type { SpaceGraph } from '../src/SpaceGraph';

class CounterPlugin implements Plugin {
    readonly name = 'Counter';
    readonly version = '1.0.0';
    calls = 0;

    constructor(readonly id = 'counter') {}

    init(): void {
        this.calls++;
    }
}

function manager() {
    const host = { graph: new Graph(), events: new EventEmitter() } as unknown as SpaceGraph;
    return new PluginManager(host);
}

describe('PluginManager lookup', () => {
    test('accepts an id, an instance, or the plugin class', () => {
        const plugins = manager();
        const counter = new CounterPlugin();
        plugins.register(counter.id, counter);

        expect(plugins.get('counter')).toBe(counter);
        expect(plugins.get(counter)).toBe(counter);
        expect(plugins.get(CounterPlugin)).toBe(counter);
        expect(plugins.has(CounterPlugin)).toBe(true);
    });

    test('resolves instances whose id differs from their registration key', () => {
        const plugins = manager();
        const counter = new CounterPlugin('kebab-id');
        plugins.register('CounterPlugin', counter);

        expect(plugins.get(counter)).toBe(counter);
        expect(plugins.get(CounterPlugin)).toBe(counter);
        expect(plugins.require(CounterPlugin)).toBe(counter);
    });

    test('resolves a string id when the registration key differs', () => {
        const plugins = manager();
        const counter = new CounterPlugin('counter');
        plugins.register('CounterPlugin', counter);

        expect(plugins.get('counter')).toBe(counter);
        expect(plugins.has('counter')).toBe(true);
        expect(plugins.require('counter')).toBe(counter);
    });

    test('require reports the available ids instead of failing silently', () => {
        const plugins = manager();
        plugins.register('counter', new CounterPlugin());

        expect(() => plugins.require('missing')).toThrow(ConfigurationError);
        expect(() => plugins.require('missing')).toThrow(/Available: counter/);
    });
});

describe('PluginManager.use', () => {
    test('registers and initializes a plugin added after create', async () => {
        const plugins = manager();
        const counter = new CounterPlugin('late');

        await plugins.use(counter);

        expect(plugins.get('late')).toBe(counter);
        expect(counter.calls).toBe(1);

        await plugins.initAll();
        expect(counter.calls).toBe(1);
    });

    test('unregister makes the plugin available for a fresh init', async () => {
        const plugins = manager();
        const first = new CounterPlugin('reload');
        await plugins.use(first);
        plugins.unregister('reload');

        const second = new CounterPlugin('reload');
        await plugins.use(second);

        expect(plugins.get('reload')).toBe(second);
        expect(first.calls).toBe(1);
        expect(second.calls).toBe(1);
    });
});
