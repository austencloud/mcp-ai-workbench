export interface JsonRpcRequest {
    jsonrpc: '2.0';
    method: string;
    params?: any;
    id: string | number;
}
export interface JsonRpcResponse<T = any> {
    jsonrpc: '2.0';
    result?: T;
    error?: JsonRpcError;
    id: string | number;
}
export interface JsonRpcError {
    code: number;
    message: string;
    data?: any;
}
export interface ApiEndpoint {
    method: string;
    path: string;
    description: string;
    params: ApiParameter[];
    response: ApiResponseSchema;
}
export interface ApiParameter {
    name: string;
    type: string;
    required: boolean;
    description: string;
    default?: any;
}
export interface ApiResponseSchema {
    type: string;
    properties: Record<string, any>;
    example?: any;
}
export interface StandardResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    timestamp: string;
    requestId?: string;
}
export interface BatchRequest<T = any> {
    operations: T[];
    options?: BatchOptions;
}
export interface BatchOptions {
    stopOnError?: boolean;
    maxConcurrency?: number;
    timeout?: number;
}
export interface BatchResponse<T = any> {
    results: BatchResult<T>[];
    summary: BatchSummary;
}
export interface BatchResult<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    index: number;
}
export interface BatchSummary {
    total: number;
    successful: number;
    failed: number;
    duration: number;
}
//# sourceMappingURL=api.d.ts.map