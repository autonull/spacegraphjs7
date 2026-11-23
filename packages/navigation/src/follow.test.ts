import { describe, it, expect } from 'vitest';
import type { RendererViewport } from '@spacegraphjs/renderer';
import {
    computeFollowFrame,
    DEFAULT_LIVE_FOLLOW_MODE,
    TURN_FOLLOW_MODE,
    NODE_FOLLOW_MODE,
    OFF_FOLLOW_MODE,
} from './follow';

const mockViewport: RendererViewport = {
    zoom: 1,
    center: [0, 0, 0],
    extent: { width: 1000, height: 1000 },
};

const mockPositionOf = (id: string) =>
    id === 'node-1'
        ? { x: 100, y: 200, z: 0 }
        : id === 'node-2'
          ? { x: 300, y: 400, z: 0 }
          : undefined;

const mockNewNodes = [
    { id: 'node-1', kind: 'tool', label: 'Tool 1', status: 'success' },
    { id: 'node-2', kind: 'tool', label: 'Tool 2', status: 'success' },
];

describe('computeFollowFrame', () => {
    it('returns null when followMode is off', () => {
        const result = computeFollowFrame({
            newNodes: mockNewNodes,
            currentViewport: mockViewport,
            followMode: 'off',
            positionOf: mockPositionOf,
        });
        expect(result).toBeNull();
    });

    it('returns null when no new nodes', () => {
        const result = computeFollowFrame({
            newNodes: [],
            currentViewport: mockViewport,
            followMode: 'node',
            positionOf: mockPositionOf,
        });
        expect(result).toBeNull();
    });

    it('returns null when no current viewport', () => {
        const result = computeFollowFrame({
            newNodes: mockNewNodes,
            currentViewport: undefined,
            followMode: 'node',
            positionOf: mockPositionOf,
        });
        expect(result).toBeNull();
    });

    it('returns CameraMove for node mode with newest node', () => {
        const result = computeFollowFrame({
            newNodes: mockNewNodes,
            currentViewport: mockViewport,
            followMode: 'node',
            positionOf: mockPositionOf,
        });
        expect(result).not.toBeNull();
        expect(result!.nodeId).toBe('node-2');
        expect(result!.applyFocusHighlight).toBe(false);
        expect(result!.dampingMs).toBe(400);
    });

    it('returns CameraMove for turn mode with newest node', () => {
        const result = computeFollowFrame({
            newNodes: mockNewNodes,
            currentViewport: mockViewport,
            followMode: 'turn',
            positionOf: mockPositionOf,
        });
        expect(result).not.toBeNull();
        expect(result!.nodeId).toBe('node-2');
        expect(result!.applyFocusHighlight).toBe(false);
    });

    it('returns CameraMove for node+focus mode with focus highlight', () => {
        const result = computeFollowFrame({
            newNodes: mockNewNodes,
            currentViewport: mockViewport,
            followMode: 'node+focus',
            positionOf: mockPositionOf,
        });
        expect(result).not.toBeNull();
        expect(result!.nodeId).toBe('node-2');
        expect(result!.applyFocusHighlight).toBe(true);
        expect(result!.focusHighlightDuration).toBe(800);
    });

    it('uses custom dampingMs when provided', () => {
        const result = computeFollowFrame({
            newNodes: mockNewNodes,
            currentViewport: mockViewport,
            followMode: 'node',
            dampingMs: 600,
            positionOf: mockPositionOf,
        });
        expect(result).not.toBeNull();
        expect(result!.dampingMs).toBe(600);
    });

    it('uses custom focusHighlightDuration when provided', () => {
        const result = computeFollowFrame({
            newNodes: mockNewNodes,
            currentViewport: mockViewport,
            followMode: 'node+focus',
            focusHighlightDuration: 1200,
            positionOf: mockPositionOf,
        });
        expect(result).not.toBeNull();
        expect(result!.focusHighlightDuration).toBe(1200);
    });

    it('returns null when positionOf returns undefined for newest node', () => {
        const result = computeFollowFrame({
            newNodes: [{ id: 'unknown', kind: 'tool', label: 'Unknown', status: 'success' }],
            currentViewport: mockViewport,
            followMode: 'node',
            positionOf: () => undefined,
        });
        expect(result).toBeNull();
    });
});

describe('FollowMode constants', () => {
    it('DEFAULT_LIVE_FOLLOW_MODE is node+focus', () => {
        expect(DEFAULT_LIVE_FOLLOW_MODE).toBe('node+focus');
    });

    it('TURN_FOLLOW_MODE is turn', () => {
        expect(TURN_FOLLOW_MODE).toBe('turn');
    });

    it('NODE_FOLLOW_MODE is node', () => {
        expect(NODE_FOLLOW_MODE).toBe('node');
    });

    it('OFF_FOLLOW_MODE is off', () => {
        expect(OFF_FOLLOW_MODE).toBe('off');
    });
});