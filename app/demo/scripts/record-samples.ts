import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium } from '@playwright/test';

const workspace = resolve(import.meta.dirname, '../../..');
const outputDir = resolve(workspace, 'recordings/samples');
const piURL = process.env.PI_URL ?? 'http://localhost:5175';
const durableURL = process.env.PI_DURABLE_URL ?? 'http://localhost:5176';
const fps = Number(process.env.SAMPLES_FPS ?? 15);
const defaultSeconds = Number(process.env.SAMPLES_SECONDS ?? 6);
const crf = process.env.SAMPLES_CRF ?? '32';
const captionsEnabled = process.env.SAMPLES_CAPTIONS !== '0';
const viewport = { width: 1280, height: 720 };
const only = new Set(process.env.SAMPLES_ONLY?.split(',').filter(Boolean));

type Host = 'pi' | 'durable';
type Arg = string | number | boolean;
type Call = readonly [method: string, ...args: readonly Arg[]];
type Getter = (method: string, ...args: Arg[]) => Promise<unknown>;

interface Motion {
    readonly advance?: number;
    readonly zoom: (progress: number) => number;
    readonly pan?: (progress: number) => readonly [number, number];
}
interface Event {
    readonly at: number;
    readonly calls?: readonly Call[];
    readonly use?: string;
    readonly label?: string;
}
interface Caption {
    readonly start: number;
    readonly end: number;
    readonly text: string;
}
interface Scene {
    readonly name: string;
    readonly host: Host;
    readonly url: string;
    readonly seconds?: number;
    readonly summary: string;
    readonly commentary?: readonly { readonly at: number; readonly text: string }[];
    readonly setup: readonly Call[];
    readonly motion: Motion;
    readonly events: readonly Event[];
    readonly prepare?: (get: Getter) => Promise<Record<string, readonly Call[]>>;
}

const pulse = (amplitude: number) => (progress: number) => 1 + amplitude * Math.cos(progress * Math.PI * 2);
const swell = (amplitude: number) => (progress: number) => 1 + amplitude * Math.sin(progress * Math.PI);
const grow = (rate: number) => () => 1 + rate;
const drift = (x: number, y = 0): Motion['pan'] => (progress) => [progress < 0.5 ? x : -x, y];
const hold = (x: number, y: number): Motion['pan'] => () => [x, y];

const scenes: readonly Scene[] = [
    {
        name: 'pi-cockpit',
        host: 'pi',
        url: `${piURL}/?shot=cockpit`,
        summary: 'layout morphs, then a causal trace',
        commentary: [{ at: 0.9, text: 'Every node here is a committed fact.' }],
        setup: [
            ['pause', true],
            ['setDepth', 'flat'],
            ['setArrangement', 'stacked'],
            ['settle'],
        ],
        motion: { advance: 0.04, zoom: pulse(0.002), pan: drift(0.5) },
        events: [
            { at: 0.27, calls: [['cycleGraphLayout', 1]] },
            { at: 0.45, use: 'trace', label: 'Tracing a causal path' },
            { at: 0.61, calls: [['cycleGraphLayout', 1]] },
            { at: 0.81, calls: [['clearTrace']] },
        ],
        prepare: async (get) => {
            const edges = (await get('edges')) as { target: string }[] | undefined;
            return edges?.[0] ? { trace: [['trace', edges[0].target]] } : {};
        },
    },
    {
        name: 'pi-living-graph',
        host: 'pi',
        url: `${piURL}/?shot=living-graph`,
        summary: 'zero-G physics across three layouts',
        commentary: [{ at: 0.88, text: 'Motion settles; the layout keeps its meaning.' }],
        setup: [
            ['pause', true],
            ['setArrangement', 'stacked'],
            ['setDepth', 'layered'],
            ['play', 'zero-g'],
        ],
        motion: { advance: 0.05, zoom: swell(0.004), pan: hold(0.4, -0.2) },
        events: [
            { at: 0.34, calls: [['cycleGraphLayout', 2]] },
            { at: 0.67, calls: [['cycleGraphLayout', -1]] },
        ],
    },
    {
        name: 'pi-octaves',
        host: 'pi',
        url: `${piURL}/?shot=octaves`,
        seconds: 5,
        summary: 'orbit depth and a slow dolly',
        commentary: [{ at: 0.88, text: 'One graph, many magnifications.' }],
        setup: [
            ['pause', true],
            ['setDepth', 'orbit'],
            ['setArrangement', 'floating'],
            ['setGraphLayout', 'octaves'],
            ['settle'],
        ],
        motion: { advance: 0.04, zoom: swell(0.0035), pan: drift(0.5, 0.2) },
        events: [{ at: 0.51, calls: [['setDepth', 'layered']] }],
    },
    {
        name: 'durable-fork-tabs',
        host: 'durable',
        url: `${durableURL}/?scenario=fork-tabs`,
        summary: 'two tabs, one folded kernel',
        commentary: [{ at: 0.92, text: 'A fork is an edge, not a copy.' }],
        setup: [['resetView']],
        motion: { zoom: grow(0.004) },
        events: [
            { at: 0.34, use: 'tab', label: 'Switching to the forked tab' },
            { at: 0.62, use: 'focus', label: 'Focusing a committed node' },
            { at: 0.85, calls: [['setView', 'diff']] },
        ],
        prepare: async (get) => {
            const tabs = (await get('sessions')) as string[] | undefined;
            const representation = (await get('representation')) as { nodeIDs: string[] } | undefined;
            const id = representation?.nodeIDs[0];
            return {
                ...(tabs?.[1] ? { tab: [['setTab', tabs[1]]] as Call[] } : {}),
                ...(id ? { focus: [['focus', id]] as Call[] } : {}),
            };
        },
    },
    {
        name: 'durable-time-travel',
        host: 'durable',
        url: `${durableURL}/?scenario=time-travel`,
        summary: 'scrubbing committed history',
        commentary: [
            { at: 0.28, text: 'Reading an earlier committed state.' },
            { at: 0.72, text: 'The present stays intact.' },
            { at: 0.96, text: 'Back to the present.' },
        ],
        setup: [
            ['setView', 'graph'],
            ['setLayout', 'timeline'],
            ['resetView'],
        ],
        motion: { zoom: grow(0.003) },
        events: [
            ...[0, 1, 2, 3, 4, 5, 6, 7].map((seq) => ({ at: seq * 0.135, calls: [['scrubTo', seq]] as Call[] })),
            { at: 0.99, calls: [['scrubTo']] },
        ],
    },
    {
        name: 'durable-task-wake',
        host: 'durable',
        url: `${durableURL}/?scenario=sleeping-approval`,
        seconds: 5,
        summary: 'a sleeping approval wakes',
        commentary: [{ at: 0.97, text: 'One approval wakes a parked task.' }],
        setup: [
            ['setView', 'graph'],
            ['setLayout', 'lanes'],
            ['resetView'],
        ],
        motion: { zoom: grow(0.004) },
        events: [
            { at: 0.34, calls: [['nextThreadStep']] },
            { at: 0.67, calls: [['setView', 'tasks']] },
            { at: 0.92, calls: [['setRung', 'grain']] },
        ],
    },
];

const selected = scenes.filter((scene) => only.size === 0 || only.has(scene.name));
if (selected.length === 0) throw new Error(`no scenes matched SAMPLES_ONLY=${[...only].join(',')}`);

const browserEval = (
    input: { readonly host: Host; readonly method: string; readonly args: readonly Arg[] } | { readonly host: Host; readonly calls: readonly Call[] },
) => {
    const w = window as unknown as {
        __pi?: Record<string, (...args: unknown[]) => unknown>;
        __durable?: Record<string, (...args: unknown[]) => unknown>;
    };
    const host = input.host === 'pi' ? w.__pi : w.__durable;
    if ('method' in input) {
        const method = host?.[input.method];
        return typeof method === 'function' ? method(...input.args) : undefined;
    }
    for (const [method, ...args] of input.calls) {
        const fn = host?.[method];
        if (typeof fn === 'function') fn.apply(host, args);
    }
    return undefined;
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport });
const run = (host: Host, calls: readonly Call[]) => page.evaluate(browserEval, { host, calls });
const get: Getter = (host, method, ...args) =>
    page.evaluate(browserEval, { host, method, args }) as Promise<unknown>;
const waitReady = (host: Host) =>
    page.waitForFunction(
        (h) => {
            const w = window as unknown as {
                __pi?: { ready?: boolean };
                __durable?: { ready?: () => boolean };
            };
            return h === 'pi' ? w.__pi?.ready === true : w.__durable?.ready?.() === true;
        },
        host,
        { timeout: 30_000 },
    );

const frameCalls = (scene: Scene, index: number, frames: number, prepared: Record<string, readonly Call[]>) => {
    const progress = index / (frames - 1);
    const calls: Call[] = [];
    if (scene.motion.advance !== undefined) calls.push(['advance', scene.motion.advance]);
    calls.push(['zoomBy', scene.motion.zoom(progress)]);
    const pan = scene.motion.pan?.(progress);
    if (pan) calls.push(['pan', ...pan]);
    for (const event of scene.events) {
        if (Math.round(event.at * (frames - 1)) !== index) continue;
        calls.push(...(event.calls ?? (event.use ? prepared[event.use] ?? [] : [])));
    }
    return calls;
};

const describeCall = ([method, ...args]: Call): string | undefined => {
    switch (method) {
        case 'setDepth':
            return `Depth: ${args[0]}`;
        case 'setGraphLayout':
            return `Graph layout: ${args[0]}`;
        case 'cycleGraphLayout':
            return 'Morphing the graph layout';
        case 'trace':
            return 'Tracing a causal path';
        case 'clearTrace':
            return 'Clearing the trace';
        case 'play':
            return 'Zero-G physics running';
        case 'setView':
            return `Opening the ${args[0]} view`;
        case 'setLayout':
            return `${args[0]} layout`;
        case 'setTab':
            return 'Switching to the forked tab';
        case 'focus':
            return 'Focusing a committed node';
        case 'setRung':
            return `${args[0]} rung`;
        case 'nextThreadStep':
            return 'Following the next committed step';
        default:
            return undefined;
    }
};

const buildCaptions = (scene: Scene, frames: number): Caption[] => {
    const duration = frames / fps;
    const title = scene.name
        .split('-')
        .map((word) => word[0]!.toUpperCase() + word.slice(1))
        .join(' ');
    const entries = [
        { at: 0.015, text: `${title} · ${scene.summary}` },
        ...scene.events.flatMap((event) => {
            const text = event.label ?? event.calls?.map(describeCall).filter(Boolean).join(' · ') ?? '';
            return text ? [{ at: event.at, text }] : [];
        }),
        ...(scene.commentary ?? []),
    ].sort((a, b) => a.at - b.at);
    return entries.map((entry, index) => {
        const start = Math.min(duration - 0.3, Math.max(0, entry.at * duration));
        const next = entries[index + 1];
        const end = next ? Math.min(next.at * duration - 0.06, duration - 0.04) : duration - 0.04;
        return { start, end: Math.max(start + 0.25, end), text: entry.text };
    });
};

const vttTime = (seconds: number) => {
    const ms = Math.round(seconds * 1000);
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`;
};

const assTime = (seconds: number) => {
    const cs = Math.round(seconds * 100);
    const h = Math.floor(cs / 360000);
    const m = Math.floor((cs % 360000) / 6000);
    const s = Math.floor((cs % 6000) / 100);
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs % 100).padStart(2, '0')}`;
};

const assHeader = [
    '[Script Info]',
    'ScriptType: v4.00+',
    'PlayResX: 1152',
    'PlayResY: 648',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    'Style: Caption,Noto Sans,24,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,2,1,8,36,36,44,1',
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
].join('\n');

mkdirSync(outputDir, { recursive: true });
for (const stale of ['reel.mp4', 'reel.json']) rmSync(join(outputDir, stale), { force: true });
for (const scene of selected)
    for (const ext of ['mp4', 'vtt', 'json']) rmSync(join(outputDir, `${scene.name}.${ext}`), { force: true });

const produced: { readonly name: string; readonly duration: number }[] = [];

for (const scene of selected) {
    const framesDir = mkdtempSync(join(tmpdir(), 'spacegraph-samples-'));
    const frame = (index: number) => join(framesDir, `${String(index).padStart(4, '0')}.png`);
    const frames = Math.round((scene.seconds ?? defaultSeconds) * fps);
    await page.goto(scene.url);
    await waitReady(scene.host);
    await run(scene.host, scene.setup);
    await page.waitForTimeout(400);
    const prepared = scene.prepare ? await scene.prepare((method, ...args) => get(scene.host, method, ...args)) : {};

    for (let index = 0; index < frames; index++) {
        await run(scene.host, frameCalls(scene, index, frames, prepared));
        await page.waitForTimeout(20);
        await page.screenshot({ path: frame(index) });
    }

    const captions = buildCaptions(scene, frames);
    const vtt = [
        'WEBVTT',
        '',
        ...captions.flatMap((caption) => [`${vttTime(caption.start)} --> ${vttTime(caption.end)}`, caption.text, '']),
    ].join('\n');
    writeFileSync(join(outputDir, `${scene.name}.vtt`), vtt);
    const ass = [
        assHeader,
        ...captions.map(
            (caption) =>
                `Dialogue: 0,${assTime(caption.start)},${assTime(caption.end)},Caption,,0,0,0,,${caption.text}`,
        ),
    ].join('\n');
    const assPath = join(framesDir, `${scene.name}.ass`);
    writeFileSync(assPath, ass);

    const output = join(outputDir, `${scene.name}.mp4`);
    const converted = spawnSync('ffmpeg', [
        '-y',
        '-loglevel',
        'error',
        '-framerate',
        String(fps),
        '-i',
        join(framesDir, '%04d.png'),
        '-vf',
        captionsEnabled ? `scale=1152:648,ass=${assPath}` : 'scale=1152:648',
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        crf,
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
        '-an',
        output,
    ]);
    rmSync(framesDir, { recursive: true, force: true });
    if (converted.status !== 0)
        throw new Error(String(converted.stderr ?? converted.error ?? 'ffmpeg failed'));

    writeFileSync(
        join(outputDir, `${scene.name}.json`),
        JSON.stringify(
            {
                name: scene.name,
                host: scene.host,
                source: scene.url,
                fps,
                frames,
                duration: frames / fps,
                video: `${scene.name}.mp4`,
                captions: `${scene.name}.vtt`,
                commentary: captions.map(({ start, text }) => ({ time: Number(start.toFixed(2)), text })),
            },
            null,
            2,
        ),
    );
    produced.push({ name: scene.name, duration: frames / fps });
    console.log(`recorded ${output}`);
}

await browser.close();

if (only.size === 0 && process.env.SAMPLES_REEL !== '0' && produced.length > 1) {
    const transition = 0.5;
    const reel = join(outputDir, 'reel.mp4');
    let elapsed = produced[0]!.duration;
    let label = '0:v';
    const chain: string[] = [];
    for (let index = 1; index < produced.length; index++) {
        const next = `x${index}`;
        chain.push(`[${label}][${index}:v]xfade=transition=fade:duration=${transition}:offset=${(elapsed - transition).toFixed(2)}[${next}]`);
        label = next;
        elapsed += produced[index]!.duration - transition;
    }
    const joined = spawnSync('ffmpeg', [
        '-y',
        '-loglevel',
        'error',
        ...produced.flatMap(({ name }) => ['-i', join(outputDir, `${name}.mp4`)]),
        '-filter_complex',
        chain.join(';'),
        '-map',
        `[${label}]`,
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        crf,
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
        '-an',
        reel,
    ]);
    if (joined.status !== 0)
        throw new Error(String(joined.stderr ?? joined.error ?? 'ffmpeg reel failed'));
    writeFileSync(
        join(outputDir, 'reel.json'),
        JSON.stringify({ transition, duration: Number(elapsed.toFixed(2)), order: produced.map(({ name }) => name) }, null, 2),
    );
    console.log(`recorded ${reel}`);
}
