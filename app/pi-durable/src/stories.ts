export type StoryFrame =
    | {
          readonly caption: string;
          readonly shot: string;
          readonly replayId?: string;
          readonly observer?: boolean;
          readonly asOf?: number;
      }
    | {
          readonly caption: string;
          readonly action: 'prompt' | 'approve' | 'setTab' | 'setView' | 'reveal';
          readonly value?: string;
      };

export type Story = {
    readonly id: string;
    readonly title: string;
    readonly question: string;
    readonly file: string;
    readonly frames: readonly StoryFrame[];
};

/** Four frames per story, captured from pure `?shot` state with host hooks only. */
export const STORIES: readonly Story[] = [
    {
        id: 'turn-flow', title: 'One turn, committed', question: 'How does a prompt become a durable answer?',
        file: 'pi-durable/stories/turn-flow.png',
        frames: [
            { caption: '1 · seeded turn', shot: 'basic-turn' },
            { caption: '2 · prompt committed', action: 'prompt', value: 'Reply with exactly: ready.' },
            { caption: '3 · answer inspected', action: 'reveal', value: 'd:1:entry:local-1-assistant' },
            { caption: '4 · transcript order', action: 'setView', value: 'transcript' },
        ],
    },
    {
        id: 'task-wake', title: 'A task wakes', question: 'How does a sleeping approval settle?',
        file: 'pi-durable/stories/task-wake.png',
        frames: [
            { caption: '1 · asleep on approve', shot: 'sleeping-approval' },
            { caption: '2 · approve pressed', action: 'approve' },
            { caption: '3 · settled task inspected', action: 'reveal', value: 'd:1:task:2' },
            { caption: '4 · task in context', action: 'setView', value: 'graph' },
        ],
    },
    {
        id: 'fork-journey', title: 'A fork becomes a tab', question: 'How does a child conversation inherit a boundary?',
        file: 'pi-durable/stories/fork-journey.png',
        frames: [
            { caption: '1 · fork at an entry', shot: 'fork-tabs' },
            { caption: '2 · child tab active', action: 'setTab', value: '2' },
            { caption: '3 · parent vs child diff', action: 'setView', value: 'diff' },
            { caption: '4 · fork edge recorded', action: 'reveal', value: 'd:2:fork' },
        ],
    },
    {
        id: 'resume-journey', title: 'A compacted transcript resumes', question: 'Does a resumed turn keep its boundary and answer?',
        file: 'pi-durable/stories/resume-journey.png',
        frames: [
            { caption: '1 · compaction boundary', shot: 'compaction' },
            { caption: '2 · historical asOf view', shot: 'time-travel', asOf: 2 },
            { caption: '3 · resumed conversation', shot: 'resumed' },
            { caption: '4 · recorded actions replayed', shot: 'replay', replayId: 'replay' },
        ],
    },
    {
        id: 'inspect-flow', title: 'Inspect the facets', question: 'Can usage, traces and host documents stay distinct?',
        file: 'pi-durable/stories/inspect-flow.png',
        frames: [
            { caption: '1 · usage document', shot: 'usage' },
            { caption: '2 · agent-event spans', shot: 'trace' },
            { caption: '3 · host documents', shot: 'docs' },
            { caption: '4 · deferred state inspected', action: 'reveal', value: 'd:1:app.todos' },
        ],
    },
    {
        id: 'host-boundary', title: 'Owner and observer', question: 'Can a second process read without owning the directory?',
        file: 'pi-durable/stories/host-boundary.png',
        frames: [
            { caption: '1 · owner commits', shot: 'basic-turn' },
            { caption: '2 · observer stream', shot: 'basic-turn', observer: true },
            { caption: '3 · read-only boundary inspected', action: 'reveal', value: 'd:1:conversation' },
            { caption: '4 · commit refused as read-only', action: 'prompt', value: 'must not commit' },
        ],
    },
    {
        id: 'child-flow', title: 'Children and typed errors', question: 'How do child tasks and failures read as durable facts?',
        file: 'pi-durable/stories/child-flow.png',
        frames: [
            { caption: '1 · subagent report', shot: 'subagent-report' },
            { caption: '2 · owned child tasks', shot: 'checkout-children' },
            { caption: '3 · typed error', shot: 'typed-errors' },
            { caption: '4 · recovery recorded', action: 'reveal', value: 'd:1:error' },
        ],
    },
];

export const storyByID = (id: string | null | undefined): Story | undefined =>
    STORIES.find((story) => story.id === id);
