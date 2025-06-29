// Shared constants between client and server
export const API_ENDPOINTS = {
    CHAT: '/rpc',
    WEBSOCKET: '/ws',
    HEALTH: '/health'
};
export const DEFAULT_MODELS = {
    OLLAMA: 'llama3.2',
    OPENAI: 'gpt-4',
    ANTHROPIC: 'claude-3-sonnet',
    GOOGLE: 'gemini-pro'
};
export const REASONING_TYPES = [
    'logical',
    'causal',
    'analogical',
    'mathematical',
    'scientific',
    'commonsense',
    'multi_hop',
    'temporal',
    'spatial',
    'ethical',
    'web_research',
    'memory_recall'
];
export const MAX_TOKENS = {
    DEFAULT: 2000,
    REASONING: 4000,
    TRAINING: 8000
};
export const TIMEOUTS = {
    API_REQUEST: 30000,
    REASONING: 60000,
    WEB_SCRAPING: 45000
};
//# sourceMappingURL=index.js.map