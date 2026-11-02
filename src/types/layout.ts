// Layout types - layout-specific options

// Note: Layout-specific options are defined in plugins/layouts/BaseLayout.ts
// Use import { LayoutOptions, LayoutConfig } from '../plugins/layouts/BaseLayout' for full options

export interface LayoutOptions {
    [key: string]: unknown;
}

export interface LayoutConfig {
    name: string;
    options?: LayoutOptions;
}
