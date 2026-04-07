// Test setup: provide canvas-like shims for jsdom and stub missing DOM APIs
// Avoid requiring native 'canvas' so CI doesn't need system libs; try to use it when available.
let createCanvas: any = null;
let CanvasImage: any = null;
let hasNodeCanvas = false;

try {
    // Try CommonJS require if available
    // @ts-ignore
    if (typeof (globalThis as any).require === 'function') {
        // @ts-ignore
        const c = (globalThis as any).require('canvas');
        if (c) {
            createCanvas = c.createCanvas;
            CanvasImage = c.Image;
            hasNodeCanvas = true;
        }
    }
} catch (e) {
    hasNodeCanvas = false;
}

// If native canvas is present, expose Image
if (hasNodeCanvas && CanvasImage) {
    (globalThis as any).Image = CanvasImage;
}

// Minimal 2D context stub used when node-canvas is not available.
function makeMinimal2DContext() {
    const noop = () => {};
    return {
        fillRect: noop,
        clearRect: noop,
        beginPath: noop,
        closePath: noop,
        moveTo: noop,
        lineTo: noop,
        stroke: noop,
        fill: noop,
        save: noop,
        restore: noop,
        measureText: () => ({ width: 0 }),
        createLinearGradient: () => ({ addColorStop: noop }),
        createPattern: () => null,
        drawImage: noop,
        getImageData: () => ({ data: new Uint8ClampedArray(0), width: 0, height: 0 }),
        putImageData: noop,
        fillText: noop,
        strokeText: noop,
        translate: noop,
        scale: noop,
        rotate: noop,
        setTransform: noop,
        resetTransform: noop,
        // add other no-op methods as needed
    } as any;
}

// Patch HTMLCanvasElement.getContext to avoid jsdom warning and provide a usable context
const proto = (globalThis as any).HTMLCanvasElement?.prototype;
if (proto) {
    const orig = proto.getContext;
    proto.getContext = function (type: string, ...args: any[]) {
        try {
            const ctx = orig && orig.call(this, type, ...args);
            if (ctx) return ctx;
        } catch (e) {
            // fallthrough
        }

        if (hasNodeCanvas && createCanvas) {
            const canvas = createCanvas(this.width || 300, this.height || 150);
            return canvas.getContext(type, ...args);
        }

        // Fallback: return minimal stub for 2d contexts, null for others
        if (type === '2d') return makeMinimal2DContext();
        return null;
    };
}

// Provide OffscreenCanvas fallback (some libs check for it)
if (typeof (globalThis as any).OffscreenCanvas === 'undefined') {
    (globalThis as any).OffscreenCanvas = class {
        width: number;
        height: number;
        constructor(w = 0, h = 0) {
            this.width = w;
            this.height = h;
        }
        getContext(type: string) {
            if (hasNodeCanvas && createCanvas)
                return createCanvas(this.width || 1, this.height || 1).getContext(type);
            if (type === '2d') return makeMinimal2DContext();
            return null;
        }
    } as any;
}

// Stub HTMLMediaElement play/pause to avoid jsdom warnings
if (typeof (globalThis as any).HTMLMediaElement !== 'undefined') {
    (globalThis as any).HTMLMediaElement.prototype.play = async function () {
        return Promise.resolve();
    };
    (globalThis as any).HTMLMediaElement.prototype.pause = function () {
        /* noop */
    };
}

// Silence specific jsdom/getContext and chart warnings that are noisy in CI
const _origConsoleError = console.error.bind(console);
console.error = (...args: any[]) => {
    try {
        const s = args.map((a) => String(a)).join(' ');
        if (
            s.includes("Not implemented: HTMLCanvasElement's getContext() method") ||
            s.includes("Failed to create chart: can't acquire context") ||
            s.includes('AutoColorPlugin not found')
        ) {
            return;
        }
    } catch (e) {
        // fallthrough
    }
    _origConsoleError(...args);
};

// Also filter direct writes to stderr (jsdom may write directly)
const _origStderrWrite = process.stderr.write.bind(process.stderr) as any;
process.stderr.write = (chunk: any, ...args: any[]) => {
    try {
        const s = String(chunk);
        if (
            s.includes("Not implemented: HTMLCanvasElement's getContext() method") ||
            s.includes("Failed to create chart: can't acquire context")
        ) {
            return true;
        }
    } catch (e) {
        // fallthrough
    }
    return _origStderrWrite(chunk, ...args);
};
