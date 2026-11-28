export const TEAM_EDGE_KINDS = [
    'steer',
    'delegates',
    'hands-off',
    'awaits',
    'reports',
    'orders',
    'owns',
    'sleeps-on',
    'retry',
    'writes',
] as const;

export interface TeamAgent {
    readonly id: string;
    readonly label: string;
    readonly role: string;
    readonly status: string;
    readonly tool: string;
    readonly tokens: number;
    readonly files: readonly string[];
}

export interface TeamLink {
    readonly id: string;
    readonly source: string;
    readonly target: string;
    readonly kind: string;
}

export interface TeamModel {
    readonly operator: string;
    readonly agents: readonly TeamAgent[];
    readonly links: readonly TeamLink[];
}

export interface TeamState {
    readonly active: string;
    readonly scope: readonly string[];
    readonly log: readonly string[];
}

export type TeamEvent =
    | { readonly type: 'select'; readonly agentID: string }
    | { readonly type: 'scope'; readonly ids: readonly string[] }
    | { readonly type: 'steer'; readonly agentID: string; readonly text: string }
    | { readonly type: 'approve'; readonly agentID: string };

export const reduceTeam = (state: TeamState, event: TeamEvent): TeamState => {
    switch (event.type) {
        case 'select':
            return state.active === event.agentID ? state : { ...state, active: event.agentID };
        case 'scope':
            return { ...state, scope: [...event.ids] };
        case 'steer':
            return {
                ...state,
                active: event.agentID,
                log: [...state.log, `operator: ${event.text}`].slice(-12),
            };
        case 'approve':
            return {
                ...state,
                active: event.agentID,
                log: [...state.log, `operator approved ${event.agentID}`].slice(-12),
            };
    }
};

export interface TeamScopeStats {
    readonly count: number;
    readonly tokens: number;
    readonly blocked: number;
    readonly labels: readonly string[];
}

export const teamScopeStats = (
    agents: readonly TeamAgent[],
    ids: readonly string[],
): TeamScopeStats => {
    const selected = new Set(ids);
    const scoped = agents.filter((agent) => selected.has(agent.id));
    return {
        count: scoped.length,
        tokens: scoped.reduce((total, agent) => total + agent.tokens, 0),
        blocked: scoped.filter((agent) => agent.status === 'blocked').length,
        labels: scoped.map((agent) => agent.label),
    };
};

const esc = (value: string) =>
    value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');

export interface TeamPanelProps {
    readonly model: TeamModel;
    readonly state: TeamState;
    readonly stats: TeamScopeStats;
}

export const teamPanelHTML = ({ model, state, stats }: TeamPanelProps): string => {
    const cards = model.agents
        .map(
            (
                agent,
            ) => `<li class="team-agent" data-team-agent="${esc(agent.id)}" data-active="${agent.id === state.active}">
            <label><input type="checkbox" data-team-scope="${esc(agent.id)}" data-sg-interactive="true" ${state.scope.includes(agent.id) ? 'checked' : ''}/> ${esc(agent.label)}</label>
            <span class="team-status">${esc(agent.status)}</span>
            <span class="team-role">${esc(agent.role)} · ${esc(agent.tool)}</span>
            <span class="team-tokens">${agent.tokens} tokens · ${agent.files.length} files</span>
            <button type="button" data-sg-interactive="true" data-team-select="${esc(agent.id)}">FOCUS</button>
        </li>`,
        )
        .join('');
    const links = model.links
        .map(
            (link) =>
                `<li data-kind="${esc(link.kind)}">${esc(link.source)} → ${esc(link.target)} · ${esc(link.kind)}</li>`,
        )
        .join('');
    const log = state.log.map((line) => `<li>${esc(line)}</li>`).join('');
    return `<div class="team-panel" data-operator="${esc(model.operator)}">
        <div class="team-head">operator <b>${esc(model.operator)}</b> · ${model.agents.length} agents · ${model.links.length} links</div>
        <ul class="team-agents">${cards}</ul>
        <div class="team-links"><b>handoffs</b><ul>${links}</ul></div>
        <div class="team-stats">${stats.count} scoped · ${stats.tokens} tokens · ${stats.blocked} blocked · ${esc(stats.labels.join(', '))}</div>
        <ul class="team-log">${log}</ul>
    </div>`;
};
