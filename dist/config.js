"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configure = exports.config = void 0;
const interval_1 = require("@riim/interval");
exports.config = {
    maxRetries: 2,
    timeout: 0,
    timeoutAfterError: interval_1.interval1s,
    discardTimeoutedAttempts: false,
    onError: null,
    onTimeout: null,
    onRetry: null
};
function configure(options) {
    Object.assign(exports.config, options);
    return exports.config;
}
exports.configure = configure;
