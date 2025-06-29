// Shared utilities between client and server
// export * from './validation';
// export * from './formatting';
// export * from './constants';
// Common utility functions
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
export function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}
export function throttle(func, limit) {
    let inThrottle;
    return (...args) => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}
//# sourceMappingURL=index.js.map