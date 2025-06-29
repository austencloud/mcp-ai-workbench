// Memory-related shared types
export var MemoryType;
(function (MemoryType) {
    MemoryType["FACT"] = "fact";
    MemoryType["EXPERIENCE"] = "experience";
    MemoryType["PREFERENCE"] = "preference";
    MemoryType["SKILL"] = "skill";
    MemoryType["RELATIONSHIP"] = "relationship";
    MemoryType["GOAL"] = "goal";
    MemoryType["CONTEXT"] = "context";
    MemoryType["CONVERSATION"] = "conversation";
})(MemoryType || (MemoryType = {}));
export var ConnectionType;
(function (ConnectionType) {
    ConnectionType["CAUSAL"] = "causal";
    ConnectionType["TEMPORAL"] = "temporal";
    ConnectionType["SEMANTIC"] = "semantic";
    ConnectionType["CONTEXTUAL"] = "contextual";
    ConnectionType["CONTRADICTORY"] = "contradictory";
})(ConnectionType || (ConnectionType = {}));
//# sourceMappingURL=memory.js.map