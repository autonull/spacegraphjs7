// Tests for renderer strategy selection.

import { describe, it, expect } from "vitest";
import {
    chooseRendererStrategy,
    canvasRendererFor,
    DEFAULT_RENDERER_STRATEGY_THRESHOLDS,
    type RendererStrategy,
} from "./renderer-strategy";

describe("chooseRendererStrategy", () => {
    it("returns svg-preview for small graphs", () => {
        expect(chooseRendererStrategy(10)).toBe("svg-preview");
        expect(chooseRendererStrategy(49)).toBe("svg-preview");
    });

    it("returns spacegraph for medium graphs", () => {
        expect(chooseRendererStrategy(50)).toBe("spacegraph");
        expect(chooseRendererStrategy(150)).toBe("spacegraph");
        expect(chooseRendererStrategy(300)).toBe("spacegraph");
    });

    it("returns cytoscape for large graphs when available", () => {
        expect(chooseRendererStrategy(301, { cytoscape: true })).toBe("cytoscape");
        expect(chooseRendererStrategy(1000, { cytoscape: true })).toBe("cytoscape");
    });

    it("falls back to spacegraph for large graphs when cytoscape not available", () => {
        expect(chooseRendererStrategy(301, { cytoscape: false })).toBe("spacegraph");
        expect(chooseRendererStrategy(1000, { cytoscape: false })).toBe("spacegraph");
        expect(chooseRendererStrategy(1000, {})).toBe("spacegraph");
    });

    it("respects custom thresholds", () => {
        const options = { thresholds: { preview: 10, canvas: 100 } };
        expect(chooseRendererStrategy(5, options)).toBe("svg-preview");
        expect(chooseRendererStrategy(10, options)).toBe("spacegraph");
        expect(chooseRendererStrategy(50, options)).toBe("spacegraph");
        expect(chooseRendererStrategy(100, options)).toBe("spacegraph");
        expect(chooseRendererStrategy(101, options)).toBe("spacegraph");
    });

    it("respects custom thresholds with cytoscape", () => {
        const options = { thresholds: { preview: 10, canvas: 100 }, cytoscape: true };
        expect(chooseRendererStrategy(101, options)).toBe("cytoscape");
    });

    it("uses default thresholds when not provided", () => {
        expect(chooseRendererStrategy(DEFAULT_RENDERER_STRATEGY_THRESHOLDS.preview - 1)).toBe(
            "svg-preview",
        );
        expect(chooseRendererStrategy(DEFAULT_RENDERER_STRATEGY_THRESHOLDS.preview)).toBe("spacegraph");
        expect(chooseRendererStrategy(DEFAULT_RENDERER_STRATEGY_THRESHOLDS.canvas)).toBe("spacegraph");
        expect(chooseRendererStrategy(DEFAULT_RENDERER_STRATEGY_THRESHOLDS.canvas + 1)).toBe(
            "spacegraph",
        );
    });
});

describe("canvasRendererFor", () => {
    it("always returns spacegraph", () => {
        const strategies: RendererStrategy[] = ["svg-preview", "spacegraph", "cytoscape"];
        for (const strategy of strategies) {
            expect(canvasRendererFor(strategy)).toBe("spacegraph");
        }
    });
});