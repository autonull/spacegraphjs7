// Dynamically discover all demo HTML files in this directory
const demoModules = import.meta.glob('./*.html', { eager: false });

// Human-readable names and icons for common demo patterns
const DEMO_METADATA: Record<string, { name: string; icon: string; description: string }> = {
    'empty.html': { name: 'Empty', icon: '◻️', description: 'Minimal setup with an empty graph canvas' },
    'html.html': { name: 'HTML', icon: '🌐', description: 'Demonstrates HTML/CSS nodes integration' },
    'instanced.html': { name: 'Instanced', icon: '📦', description: 'Uses instanced rendering for performance' },
    'large.html': { name: 'Large', icon: '📊', description: 'Large-scale graph with many nodes and edges' },
    'n8n-workflow.html': { name: 'n8n Workflow', icon: '⚙️', description: 'Visualizes n8n workflow automation graphs' },
    'single-node.html': { name: 'Single Node', icon: '⬤', description: 'Basic single node demonstration' },
};

// Convert filename to display name (fallback for unknown demos)
function filenameToName(filename: string): string {
    return filename
        .replace('.html', '')
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Get metadata or generate fallback
function getDemoMetadata(filename: string) {
    const meta = DEMO_METADATA[filename];
    if (meta) return meta;

    return {
        name: filenameToName(filename),
        icon: '🎯',
        description: 'Demo demonstration',
    };
}

// Build demo list from discovered files (exclude index.html)
const demos = Object.keys(demoModules)
    .filter((path) => !path.includes('index.html'))
    .map((path) => {
        const filename = path.replace('./', '');
        const metadata = getDemoMetadata(filename);
        return {
            file: filename,
            ...metadata,
        };
    });

// Sort demos alphabetically by name
demos.sort((a, b) => a.name.localeCompare(b.name));

// Render demo grid
const grid = document.getElementById('demo-grid')!;

demos.forEach((demo) => {
    const card = document.createElement('a');
    card.className = 'demo-card';
    card.href = demo.file;

    card.innerHTML = `
        <div class="icon">${demo.icon}</div>
        <h2>${demo.name}</h2>
        <div class="path">${demo.file}</div>
        <div class="description">${demo.description}</div>
    `;

    grid.appendChild(card);
});

// Update count
const countEl = document.createElement('div');
countEl.className = 'count';
countEl.textContent = `${demos.length} demo${demos.length !== 1 ? 's' : ''} available`;
grid.parentElement?.insertBefore(countEl, grid.nextSibling);
