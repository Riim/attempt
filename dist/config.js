"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configure = exports.config = void 0;
exports.config = {
    maxRetries: 0,
    timeout: -1,
    timeoutAfterError: 0,
    discardTimeoutedAttempts: false,
    onAttempt: null,
    onError: null,
    onTimeout: null,
    onRetry: null
};
function configure(options) {
    Object.assign(exports.config, options);
    return exports.config;
}
exports.configure = configure;
