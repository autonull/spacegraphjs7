import { findShotByID } from 'spacegraphjs/experiments';

export type Shot = {
    readonly id: string;
    readonly file: string;
    readonly title: string;
    readonly question: string;
    readonly scenario: string;
    readonly surface?: string;
    readonly level?: string;
    readonly reveal?: string;
    readonly viewport?: { readonly width: number; readonly height: number };
    readonly fit?: boolean;
    readonly octave?: number;
    readonly zoom?: number;
    readonly rail?: string;
};

export const SHOTS: readonly Shot[] = [
    {
        id: 'basic-turn',
        file: 'pi-durable/basic-turn.png',
        title: 'One durable turn',
        question: 'Can I finish a chat turn with no provider and no API key?',
        scenario: 'A faux answer committed as an assistant entry.',
        viewport: { width: 1600, height: 1000 },
    },
    {
        id: 'sleeping-approval',
        file: 'pi-durable/sleeping-approval.png',
        title: 'A parked approval',
        question: 'Can I see why a task sleeps and wake it?',
        scenario: 'A task asleep on the approve signal with a deadline.',
        viewport: { width: 1600, height: 1000 },
        rail: 'tasks',
    },
    {
        id: 'fork-tabs',
        file: 'pi-durable/fork-tabs.png',
        title: 'Forked tabs',
        question: 'Can two conversations stay open with independent state?',
        scenario: 'A child conversation with a fork edge back to its source.',
        viewport: { width: 1600, height: 1000 },
    },
    {
        id: 'resumed',
        file: 'pi-durable/resumed.png',
        title: 'Resumed without duplicates',
        question: 'Does a retried request id produce one answer?',
        scenario: 'A reopened conversation with a settled submission.',
        viewport: { width: 1600, height: 1000 },
    },
    {
        id: 'task-graph',
        file: 'pi-durable/task-graph.png',
        title: 'Task graph',
        question: 'Can I see committed task owners and waits?',
        scenario: 'The same kernel placed as a task view.',
        viewport: { width: 1600, height: 1000 },
        rail: 'tasks',
    },
    {
        id: 'timeline',
        file: 'pi-durable/timeline.png',
        title: 'Timeline',
        question: 'Can I read the committed transcript in order?',
        scenario: 'The same kernel placed as an ordered timeline.',
        viewport: { width: 1600, height: 1000 },
        rail: 'timeline',
    },
];

export const shotById = (id: string | null | undefined): Shot | undefined => findShotByID(SHOTS, id);

export const CORE_SHOTS = SHOTS.slice(0, 4);
