"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attempt = exports.configure = exports.config = exports.AttemptTimeoutError = void 0;
const delay_1 = require("@riim/delay");
const interval_1 = require("@riim/interval");
class AttemptTimeoutError extends Error {
}
exports.AttemptTimeoutError = AttemptTimeoutError;
exports.config = {
    maxRetries: 2,
    timeout: interval_1.interval15s,
    timeoutAfterError: interval_1.interval1s,
    onError: null,
    onTimeout: null,
    onRetry: null
};
function configure(options) {
    Object.assign(exports.config, options);
    return exports.config;
}
exports.configure = configure;
const checkTimeoutAfterError = (timeoutAfterError) => {
    if (!Number.isInteger(timeoutAfterError)) {
        throw TypeError('Timeout before retry must be integer');
    }
    if (timeoutAfterError < 0) {
        throw TypeError('Timeout before retry must be greater than or equal to zero');
    }
};
function attempt(fn, options) {
    var _a, _b, _c, _d, _e, _f;
    let maxRetries = (_a = options === null || options === void 0 ? void 0 : options.maxRetries) !== null && _a !== void 0 ? _a : exports.config.maxRetries;
    if (!Number.isInteger(maxRetries)) {
        throw TypeError('Maximum number of retries must be integer');
    }
    if (maxRetries < 0) {
        throw TypeError('Maximum number of retries must be greater than or equal to zero');
    }
    let timeout = (_b = options === null || options === void 0 ? void 0 : options.timeout) !== null && _b !== void 0 ? _b : exports.config.timeout;
    if (timeout !== undefined) {
        if (!Number.isInteger(timeout)) {
            throw TypeError('Timeout of attempt must be integer');
        }
        if (timeout < 0) {
            throw TypeError('Timeout of attempt must be greater than or equal to zero');
        }
    }
    let timeoutAfterError = (_c = options === null || options === void 0 ? void 0 : options.timeoutAfterError) !== null && _c !== void 0 ? _c : exports.config.timeoutAfterError;
    if (timeoutAfterError !== undefined) {
        checkTimeoutAfterError(timeoutAfterError);
    }
    let onError = (_d = options === null || options === void 0 ? void 0 : options.onError) !== null && _d !== void 0 ? _d : exports.config.onError;
    let onTimeout = (_e = options === null || options === void 0 ? void 0 : options.onTimeout) !== null && _e !== void 0 ? _e : exports.config.onTimeout;
    let onRetry = (_f = options === null || options === void 0 ? void 0 : options.onRetry) !== null && _f !== void 0 ? _f : exports.config.onRetry;
    let onRejected = (err, leftRetries, retry) => {
        if (err instanceof AttemptTimeoutError) {
            if (onTimeout) {
                onTimeout();
            }
        }
        else {
            if (onError) {
                let timeoutAfterError_ = onError(err, maxRetries - leftRetries);
                if (timeoutAfterError_ !== undefined) {
                    checkTimeoutAfterError(timeoutAfterError_);
                    timeoutAfterError = timeoutAfterError_;
                }
            }
        }
        if (leftRetries != 0) {
            return timeoutAfterError !== undefined && timeoutAfterError != 0
                ? (0, delay_1.delay)(timeoutAfterError).then(() => retry(err, leftRetries - 1))
                : retry(err, leftRetries - 1);
        }
        throw err;
    };
    if (timeout !== undefined && timeout != 0) {
        return (function attempt_(err, leftRetries) {
            let loaded = false;
            let timeouted = false;
            let ready = false;
            if (onRetry && err !== null) {
                onRetry(err, leftRetries);
            }
            return Promise.race([
                fn().then((result) => {
                    loaded = true;
                    ready = true;
                    return result;
                }, (err) => {
                    loaded = true;
                    if (timeouted) {
                        return (ready ||
                            (function _() {
                                return (0, delay_1.delay)(interval_1.interval30s).then(() => ready || _());
                            })());
                    }
                    return onRejected(err, leftRetries, attempt_).then((result) => {
                        ready = true;
                        return result;
                    }, (err) => {
                        ready = true;
                        throw err;
                    });
                }),
                (0, delay_1.delay)(timeout).then(() => {
                    timeouted = true;
                    if (loaded) {
                        return (ready ||
                            (function _() {
                                return (0, delay_1.delay)(interval_1.interval30s).then(() => ready || _());
                            })());
                    }
                    return onRejected(new AttemptTimeoutError(), leftRetries, attempt_).then((result) => {
                        ready = true;
                        return result;
                    }, (err) => {
                        ready = true;
                        throw err;
                    });
                })
            ]);
        })(null, maxRetries);
    }
    else {
        return (function attempt_(err, leftRetries) {
            if (onRetry && err !== null) {
                onRetry(err, leftRetries);
            }
            return fn().catch((err) => onRejected(err, leftRetries, attempt_));
        })(null, maxRetries);
    }
}
exports.attempt = attempt;
