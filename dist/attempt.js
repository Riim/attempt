"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attempt = exports.configure = exports.config = exports.AttemptTimeoutError = void 0;
const delay_1 = require("@riim/delay");
const config_1 = require("./config");
Object.defineProperty(exports, "config", { enumerable: true, get: function () { return config_1.config; } });
Object.defineProperty(exports, "configure", { enumerable: true, get: function () { return config_1.configure; } });
const AttemptTimeoutError_1 = require("./lib/AttemptTimeoutError");
Object.defineProperty(exports, "AttemptTimeoutError", { enumerable: true, get: function () { return AttemptTimeoutError_1.AttemptTimeoutError; } });
const identity_1 = require("./lib/identity");
const noop_1 = require("./lib/noop");
const throwIt_1 = require("./lib/throwIt");
const checkTimeoutAfterError = (timeoutAfterError) => {
    if (!Number.isInteger(timeoutAfterError)) {
        throw TypeError('Timeout before retry must be integer');
    }
    if (timeoutAfterError < 0) {
        throw TypeError('Timeout before retry must be greater than or equal to zero');
    }
};
function attempt(fn, options) {
    var _a, _b, _c, _d, _e, _f, _g;
    let maxRetries = (_a = options === null || options === void 0 ? void 0 : options.maxRetries) !== null && _a !== void 0 ? _a : config_1.config.maxRetries;
    if (!Number.isInteger(maxRetries)) {
        throw TypeError('Maximum number of retries must be integer');
    }
    if (maxRetries < 0) {
        throw TypeError('Maximum number of retries must be greater than or equal to zero');
    }
    let timeout = (_b = options === null || options === void 0 ? void 0 : options.timeout) !== null && _b !== void 0 ? _b : config_1.config.timeout;
    if (timeout !== undefined) {
        if (!Number.isInteger(timeout)) {
            throw TypeError('Timeout of attempt must be integer');
        }
        if (timeout < 0) {
            throw TypeError('Timeout of attempt must be greater than or equal to zero');
        }
    }
    let timeoutAfterError = (_c = options === null || options === void 0 ? void 0 : options.timeoutAfterError) !== null && _c !== void 0 ? _c : config_1.config.timeoutAfterError;
    if (timeoutAfterError !== undefined) {
        checkTimeoutAfterError(timeoutAfterError);
    }
    let discardTimeoutedAttempts = (_d = options === null || options === void 0 ? void 0 : options.discardTimeoutedAttempts) !== null && _d !== void 0 ? _d : config_1.config.discardTimeoutedAttempts;
    let onError = (_e = options === null || options === void 0 ? void 0 : options.onError) !== null && _e !== void 0 ? _e : config_1.config.onError;
    let onTimeout = (_f = options === null || options === void 0 ? void 0 : options.onTimeout) !== null && _f !== void 0 ? _f : config_1.config.onTimeout;
    let onRetry = (_g = options === null || options === void 0 ? void 0 : options.onRetry) !== null && _g !== void 0 ? _g : config_1.config.onRetry;
    let ready = false;
    let onRejected = (err, leftRetries, retry) => {
        if (err instanceof AttemptTimeoutError_1.AttemptTimeoutError) {
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
        ready = true;
        throw err;
    };
    if (timeout !== undefined && timeout != 0) {
        return (function attempt_(err, leftRetries) {
            let completed = false;
            let timeouted = false;
            if (onRetry && err !== null) {
                onRetry(err, leftRetries);
            }
            return Promise.race([
                fn().then((result) => {
                    completed = true;
                    if (timeouted && discardTimeoutedAttempts) {
                        return ready ? null : new Promise(noop_1.noop);
                    }
                    ready = true;
                    return result;
                }, (err) => {
                    completed = true;
                    if (timeouted) {
                        return ready ? null : new Promise(noop_1.noop);
                    }
                    return onRejected(err, leftRetries, attempt_).then(identity_1.identity, throwIt_1.throwIt);
                }),
                (0, delay_1.delay)(timeout).then(() => {
                    timeouted = true;
                    if (completed) {
                        return ready ? null : new Promise(noop_1.noop);
                    }
                    return onRejected(new AttemptTimeoutError_1.AttemptTimeoutError(), leftRetries, attempt_).then(identity_1.identity, throwIt_1.throwIt);
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
