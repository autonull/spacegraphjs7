import { storyByID, type StoryFrame } from './stories';

export const chapterFrames = (id: string | undefined): readonly StoryFrame[] =>
    storyByID(id)?.frames ?? [];

export const chapterCaptions = (id: string | undefined): readonly string[] =>
    chapterFrames(id).map((frame) => frame.caption);
