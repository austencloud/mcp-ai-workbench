export declare const API_ENDPOINTS: {
    readonly CHAT: "/rpc";
    readonly WEBSOCKET: "/ws";
    readonly HEALTH: "/health";
};
export declare const DEFAULT_MODELS: {
    readonly OLLAMA: "llama3.2";
    readonly OPENAI: "gpt-4";
    readonly ANTHROPIC: "claude-3-sonnet";
    readonly GOOGLE: "gemini-pro";
};
export declare const REASONING_TYPES: readonly ["logical", "causal", "analogical", "mathematical", "scientific", "commonsense", "multi_hop", "temporal", "spatial", "ethical", "web_research", "memory_recall"];
export declare const MAX_TOKENS: {
    readonly DEFAULT: 2000;
    readonly REASONING: 4000;
    readonly TRAINING: 8000;
};
export declare const TIMEOUTS: {
    readonly API_REQUEST: 30000;
    readonly REASONING: 60000;
    readonly WEB_SCRAPING: 45000;
};
//# sourceMappingURL=index.d.ts.map